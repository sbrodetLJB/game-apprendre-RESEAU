import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';
import { gradeCase } from '../lib/grading';
import { awardBadgesOnCompletion, awardLessonCompletionXp, isFirstAttempt, markLessonCompleted, markLessonInProgress } from '../lib/gamification';

const router = Router();

router.use(requireAuth);

// Liste + statut de progression de l'étudiant courant. Jamais de fichiers ici (théorie/énoncé
// arrivent avec GET /:slug, jamais le corrigé).
router.get('/', async (req, res) => {
  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      select: { id: true, slug: true, number: true, title: true },
      orderBy: { number: 'asc' },
    }),
    prisma.progress.findMany({
      where: { studentId: req.user!.id },
      select: { lessonId: true, status: true },
    }),
  ]);

  const statusByLessonId = new Map(progress.map((p) => [p.lessonId, p.status]));
  res.json(
    lessons.map((lesson) => ({
      ...lesson,
      progressStatus: statusByLessonId.get(lesson.id) ?? 'NOT_STARTED',
    }))
  );
});

// Détail d'une leçon : théorie + PasAPas + squelette d'énoncé. `select` explicite (jamais
// `include` brut) pour garantir que solutionFiles/testCasesJson ne fuient jamais ici.
router.get('/:slug', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: req.params.slug },
    select: {
      id: true,
      slug: true,
      number: true,
      title: true,
      theoryMd: true,
      pasAPasMd: true,
      pasAPasVisible: true,
      exercise: { select: { enonceFiles: true } },
    },
  });
  if (!lesson) {
    return res.status(404).json({ message: 'Leçon introuvable.' });
  }
  // Le pas-à-pas n'est envoyé que si un professeur l'a activé pour cette leçon.
  res.json({ ...lesson, pasAPasMd: lesson.pasAPasVisible ? lesson.pasAPasMd : null });
});

// Correction synchrone : ce cours n'exécute rien (comparaison texte pure), le résultat final
// est donc connu immédiatement — pas de statut QUEUED/RUNNING, pas de polling côté frontend.
router.post('/:slug/submissions', requireRole('ETUDIANT'), async (req, res) => {
  const { files } = req.body as { files?: { path: string; content: string }[] };
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ message: 'Aucun fichier soumis.' });
  }

  const slug = req.params.slug as string;
  const lesson = await prisma.lesson.findUnique({
    where: { slug },
    include: { exercise: true },
  });
  if (!lesson || !lesson.exercise) {
    return res.status(404).json({ message: 'Leçon introuvable.' });
  }

  await markLessonInProgress(req.user!.id, lesson.id);

  const testCasesJson = lesson.exercise.testCasesJson as {
    cases: { name: string; referenceText: string; studentFileName: string }[];
  };
  const filesByPath = new Map(files.map((f) => [f.path, f.content]));

  const cases = testCasesJson.cases.map((c) =>
    gradeCase(c.name, c.referenceText, filesByPath.get(c.studentFileName))
  );
  const allPassed = cases.length > 0 && cases.every((c) => c.passed);
  const passed = cases.filter((c) => c.passed).length;

  const submission = await prisma.submission.create({
    data: {
      studentId: req.user!.id,
      lessonId: lesson.id,
      files: files as any,
      status: allPassed ? 'AUTO_PASSED' : 'AUTO_FAILED',
      resultDetail: { cases, total: cases.length, passed } as any,
    },
  });

  if (allPassed) {
    const firstTry = await isFirstAttempt(req.user!.id, lesson.id, submission.id);
    await awardLessonCompletionXp({
      studentId: req.user!.id,
      lessonNumber: lesson.number,
      lessonSlug: lesson.slug,
      submissionId: submission.id,
      firstTry,
    });
    await markLessonCompleted(req.user!.id, lesson.id, submission.id);
    await awardBadgesOnCompletion(req.user!.id, lesson.number, firstTry);
  }

  res.status(201).json(submission);
});

export default router;
