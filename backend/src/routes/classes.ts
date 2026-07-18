import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.use(requireAuth);

const classeInclude = {
  students: { select: { id: true, name: true, email: true, role: true } },
  teachers: { select: { id: true, name: true, email: true, role: true } },
} as const;

router.get('/', async (_req, res) => {
  const classes = await prisma.classe.findMany({
    include: classeInclude,
    orderBy: { name: 'asc' },
  });
  res.json(classes);
});

async function validateMembers(studentIds: number[], teacherIds: number[]) {
  const ids = [...studentIds, ...teacherIds];
  if (ids.length === 0) return null;

  const users = await prisma.user.findMany({ where: { id: { in: ids } } });
  const byId = new Map(users.map((u) => [u.id, u]));

  for (const id of studentIds) {
    const user = byId.get(id);
    if (!user) return `Utilisateur ${id} introuvable.`;
    if (user.role !== 'ETUDIANT') return `${user.name} n'est pas un étudiant.`;
  }
  for (const id of teacherIds) {
    const user = byId.get(id);
    if (!user) return `Utilisateur ${id} introuvable.`;
    if (user.role !== 'PROFESSEUR') return `${user.name} n'est pas un professeur.`;
  }
  return null;
}

router.post('/', requireRole('ADMIN', 'PROFESSEUR'), async (req, res) => {
  const { name, studentIds, teacherIds } = req.body as {
    name?: string;
    studentIds?: number[];
    teacherIds?: number[];
  };

  if (!name) {
    return res.status(400).json({ message: 'Le nom de la classe est requis.' });
  }

  const existing = await prisma.classe.findUnique({ where: { name } });
  if (existing) {
    return res.status(409).json({ message: 'Une classe avec ce nom existe déjà.' });
  }

  const validationError = await validateMembers(studentIds ?? [], teacherIds ?? []);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const classe = await prisma.classe.create({
    data: {
      name,
      students: { connect: (studentIds ?? []).map((id) => ({ id })) },
      teachers: { connect: (teacherIds ?? []).map((id) => ({ id })) },
    },
    include: classeInclude,
  });

  res.status(201).json(classe);
});

router.patch('/:id', requireRole('ADMIN', 'PROFESSEUR'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, studentIds, teacherIds } = req.body as {
    name?: string;
    studentIds?: number[];
    teacherIds?: number[];
  };

  const classe = await prisma.classe.findUnique({ where: { id } });
  if (!classe) {
    return res.status(404).json({ message: 'Classe introuvable.' });
  }

  if (name && name !== classe.name) {
    const existing = await prisma.classe.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: 'Une classe avec ce nom existe déjà.' });
    }
  }

  const validationError = await validateMembers(studentIds ?? [], teacherIds ?? []);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const updated = await prisma.classe.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(studentIds ? { students: { set: studentIds.map((sid) => ({ id: sid })) } } : {}),
      ...(teacherIds ? { teachers: { set: teacherIds.map((tid) => ({ id: tid })) } } : {}),
    },
    include: classeInclude,
  });

  res.json(updated);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.classe.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

export default router;
