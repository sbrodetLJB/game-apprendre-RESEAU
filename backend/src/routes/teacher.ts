import { Request, Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'PROFESSEUR'));

function canAccessClasse(req: Request, classeTeacherIds: number[]) {
  return req.user!.role === 'ADMIN' || classeTeacherIds.includes(req.user!.id);
}

// Matrice étudiant × leçon pour une classe.
router.get('/classes/:classeId/progress', async (req, res) => {
  const classeId = Number(req.params.classeId);

  const classe = await prisma.classe.findUnique({
    where: { id: classeId },
    include: {
      teachers: { select: { id: true } },
      students: { select: { id: true, name: true, email: true } },
    },
  });
  if (!classe) {
    return res.status(404).json({ message: 'Classe introuvable.' });
  }
  if (!canAccessClasse(req, classe.teachers.map((t) => t.id))) {
    return res.status(403).json({ message: "Vous n'enseignez pas dans cette classe." });
  }

  const lessons = await prisma.lesson.findMany({
    select: { id: true, slug: true, number: true, title: true },
    orderBy: { number: 'asc' },
  });
  const studentIds = classe.students.map((s) => s.id);
  const progress = await prisma.progress.findMany({ where: { studentId: { in: studentIds } } });
  const statusByKey = new Map(progress.map((p) => [`${p.studentId}:${p.lessonId}`, p.status]));

  const students = classe.students.map((student) => ({
    student,
    lessons: lessons.map((lesson) => ({
      lessonId: lesson.id,
      slug: lesson.slug,
      status: statusByKey.get(`${student.id}:${lesson.id}`) ?? 'NOT_STARTED',
    })),
  }));

  res.json({ classe: { id: classe.id, name: classe.name }, lessons, students });
});

// Détail d'un étudiant : statut par leçon, XP, soumissions récentes.
router.get('/students/:studentId', async (req, res) => {
  const studentId = Number(req.params.studentId);

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { studentClasse: { include: { teachers: { select: { id: true } } } } },
  });
  if (!student || student.role !== 'ETUDIANT') {
    return res.status(404).json({ message: 'Étudiant introuvable.' });
  }
  if (!student.studentClasse || !canAccessClasse(req, student.studentClasse.teachers.map((t) => t.id))) {
    return res.status(403).json({ message: "Vous n'enseignez pas dans la classe de cet étudiant." });
  }

  const [progress, xpSum, recentXpEntries, recentSubmissions] = await Promise.all([
    prisma.progress.findMany({
      where: { studentId },
      include: { lesson: { select: { slug: true, number: true, title: true } } },
      orderBy: { lesson: { number: 'asc' } },
    }),
    prisma.xpEntry.aggregate({ where: { studentId }, _sum: { amount: true } }),
    prisma.xpEntry.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.submission.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { lesson: { select: { slug: true, title: true } } },
    }),
  ]);

  res.json({
    student: { id: student.id, name: student.name, email: student.email },
    progress,
    totalXp: xpSum._sum.amount ?? 0,
    recentXpEntries,
    recentSubmissions,
  });
});

// Taux de réussite d'une leçon, optionnellement filtré par classe (?classeId=).
router.get('/lessons/:slug/stats', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({ where: { slug: req.params.slug } });
  if (!lesson) {
    return res.status(404).json({ message: 'Leçon introuvable.' });
  }

  let studentIds: number[] | undefined;
  if (req.query.classeId) {
    const classeId = Number(req.query.classeId);
    const classe = await prisma.classe.findUnique({
      where: { id: classeId },
      include: { teachers: { select: { id: true } }, students: { select: { id: true } } },
    });
    if (!classe) {
      return res.status(404).json({ message: 'Classe introuvable.' });
    }
    if (!canAccessClasse(req, classe.teachers.map((t) => t.id))) {
      return res.status(403).json({ message: "Vous n'enseignez pas dans cette classe." });
    }
    studentIds = classe.students.map((s) => s.id);
  }

  const submissions = await prisma.submission.findMany({
    where: { lessonId: lesson.id, ...(studentIds ? { studentId: { in: studentIds } } : {}) },
    select: { studentId: true, status: true },
  });

  const attempted = new Set(submissions.map((s) => s.studentId));
  const passed = new Set(submissions.filter((s) => s.status === 'AUTO_PASSED').map((s) => s.studentId));

  res.json({
    lesson: { slug: lesson.slug, title: lesson.title },
    totalSubmissions: submissions.length,
    studentsAttempted: attempted.size,
    studentsPassed: passed.size,
  });
});

export default router;
