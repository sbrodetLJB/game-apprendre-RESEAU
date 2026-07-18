import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';
import { computeLevel } from '../lib/gamification';

const router = Router();

router.use(requireAuth);

router.get('/progress', async (req, res) => {
  const progress = await prisma.progress.findMany({
    where: { studentId: req.user!.id },
    include: { lesson: { select: { slug: true, number: true, title: true } } },
    orderBy: { lesson: { number: 'asc' } },
  });
  res.json(progress);
});

router.get('/xp', async (req, res) => {
  const [sum, recentEntries] = await Promise.all([
    prisma.xpEntry.aggregate({ where: { studentId: req.user!.id }, _sum: { amount: true } }),
    prisma.xpEntry.findMany({
      where: { studentId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const totalXp = sum._sum.amount ?? 0;
  res.json({ totalXp, ...computeLevel(totalXp), recentEntries });
});

// Tout le catalogue, avec earnedAt = null pour les badges pas encore obtenus.
router.get('/badges', async (req, res) => {
  const [badges, earned] = await Promise.all([
    prisma.badge.findMany({ orderBy: { id: 'asc' } }),
    prisma.studentBadge.findMany({ where: { studentId: req.user!.id } }),
  ]);
  const earnedByBadgeId = new Map(earned.map((e) => [e.badgeId, e.awardedAt]));

  res.json(
    badges.map((badge) => ({
      ...badge,
      earnedAt: earnedByBadgeId.get(badge.id) ?? null,
    }))
  );
});

export default router;
