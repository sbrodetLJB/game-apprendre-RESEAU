import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.use(requireAuth);

// Consultation d'une soumission passée — jamais de polling nécessaire ici, le statut est déjà
// final au moment de la création (voir routes/lessons.ts, POST /:slug/submissions).
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      lesson: { select: { id: true, slug: true, number: true, title: true } },
      student: { select: { id: true, name: true, email: true } },
    },
  });
  if (!submission) {
    return res.status(404).json({ message: 'Soumission introuvable.' });
  }

  const isOwner = submission.studentId === req.user!.id;
  const isPrivileged = req.user!.role === 'ADMIN' || req.user!.role === 'PROFESSEUR';
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cette soumission." });
  }

  res.json(submission);
});

export default router;
