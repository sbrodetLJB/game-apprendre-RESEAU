import prisma from './prisma';
import { CHAPTERS } from './badges';

// Formule v1 volontairement simple (identique aux autres modules) : XP de base croît
// linéairement avec le numéro de leçon, +20% si réussite au premier essai. Le montant
// réellement attribué est figé dans XpEntry.amount à l'attribution — un futur ajustement de
// cette formule ne change pas rétroactivement les gains déjà enregistrés.
function baseXpForLesson(lessonNumber: number): number {
  return 50 + 10 * (lessonNumber - 1);
}

const FIRST_TRY_BONUS = 0.2;

// "Premier essai" = aucune tentative finalisée avant celle-ci (toutes les soumissions de ce
// module sont finalisées dès leur création : pas de relecture manuelle, pas de statut transitoire).
export async function isFirstAttempt(studentId: number, lessonId: number, excludeSubmissionId: number): Promise<boolean> {
  const priorCount = await prisma.submission.count({
    where: { studentId, lessonId, id: { not: excludeSubmissionId } },
  });
  return priorCount === 0;
}

export async function awardLessonCompletionXp(params: {
  studentId: number;
  lessonNumber: number;
  lessonSlug: string;
  submissionId: number;
  firstTry: boolean;
}): Promise<number> {
  const { studentId, lessonNumber, lessonSlug, submissionId, firstTry } = params;
  const base = baseXpForLesson(lessonNumber);
  const amount = firstTry ? Math.round(base * (1 + FIRST_TRY_BONUS)) : base;

  await prisma.xpEntry.create({
    data: {
      studentId,
      amount,
      reason: `lesson_completed:${lessonSlug}${firstTry ? ':first_try' : ''}`,
      submissionId,
    },
  });

  return amount;
}

export async function markLessonCompleted(studentId: number, lessonId: number, submissionId: number): Promise<void> {
  await prisma.progress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    update: { status: 'COMPLETED', bestSubmissionId: submissionId, completedAt: new Date() },
    create: {
      studentId,
      lessonId,
      status: 'COMPLETED',
      bestSubmissionId: submissionId,
      completedAt: new Date(),
    },
  });
}

// Ne rétrograde jamais une leçon déjà COMPLETED (un nouvel essai raté après une réussite reste
// une réussite au global).
export async function markLessonInProgress(studentId: number, lessonId: number): Promise<void> {
  const existing = await prisma.progress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  });
  if (existing?.status === 'COMPLETED') return;

  await prisma.progress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    update: { status: 'IN_PROGRESS' },
    create: { studentId, lessonId, status: 'IN_PROGRESS' },
  });
}

async function awardBadge(studentId: number, badgeKey: string): Promise<void> {
  const badge = await prisma.badge.findUnique({ where: { key: badgeKey } });
  if (!badge) return; // catalogue pas encore initialisé (ensureBadgeCatalog) : n'échoue pas la requête appelante.

  await prisma.studentBadge.upsert({
    where: { studentId_badgeId: { studentId, badgeId: badge.id } },
    update: {},
    create: { studentId, badgeId: badge.id },
  });
}

// Appelé après chaque leçon complétée. Idempotent (upsert), peut être appelé à chaque
// complétion sans risque de doublon.
export async function awardBadgesOnCompletion(studentId: number, lessonNumber: number, firstTry: boolean): Promise<void> {
  if (lessonNumber === 1) {
    await awardBadge(studentId, 'premier-pas');
  }
  if (firstTry) {
    await awardBadge(studentId, 'sans-faute');
  }

  const [completed, totalLessons] = await Promise.all([
    prisma.progress.findMany({
      where: { studentId, status: 'COMPLETED' },
      select: { lesson: { select: { number: true } } },
    }),
    prisma.lesson.count(),
  ]);
  const completedNumbers = new Set(completed.map((p) => p.lesson.number));

  for (const chapter of CHAPTERS) {
    const chapterLessonNumbers = Array.from({ length: chapter.to - chapter.from + 1 }, (_, i) => chapter.from + i);
    if (chapterLessonNumbers.every((n) => completedNumbers.has(n))) {
      await awardBadge(studentId, chapter.key);
    }
  }

  if (totalLessons > 0 && completedNumbers.size === totalLessons) {
    await awardBadge(studentId, 'tout-termine');
  }
}

// Niveau = fonction pure du total d'XP, jamais stocké (évite tout risque de désynchronisation).
export function computeLevel(totalXp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  const XP_PER_LEVEL = 200;
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  return { level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}
