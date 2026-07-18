import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('ADMIN', 'PROFESSEUR'), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentClasse: { select: { id: true, name: true } },
      teachingClasses: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

// Comptes créés par un professeur ou un admin uniquement (pas d'auto-inscription en v1).
// Un professeur ne peut créer que des comptes étudiants ; seul un admin peut créer un
// professeur ou un autre admin.
router.post('/', requireRole('ADMIN', 'PROFESSEUR'), async (req, res) => {
  const { name, email, password, role, studentClasseId } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    studentClasseId?: number;
  };

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nom, e-mail et mot de passe requis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const isAdmin = req.user!.role === 'ADMIN';
  const requestedRole = role === 'ADMIN' || role === 'PROFESSEUR' ? role : 'ETUDIANT';
  const normalizedRole = isAdmin ? requestedRole : 'ETUDIANT';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Un utilisateur avec cet e-mail existe déjà.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: normalizedRole,
      ...(normalizedRole === 'ETUDIANT' && studentClasseId ? { studentClasseId } : {}),
    },
    select: { id: true, name: true, email: true, role: true },
  });

  res.status(201).json(user);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);

  if (req.user!.id === id) {
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }

  await prisma.user.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

export default router;
