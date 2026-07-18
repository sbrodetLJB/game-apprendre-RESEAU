import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail et mot de passe requis.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.password ? await bcrypt.compare(password, user.password) : false;

  if (!user || !valid) {
    return res.status(401).json({ message: 'Identifiants invalides.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.password) {
    return res.status(404).json({ message: 'Utilisateur introuvable.' });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } });

  res.json({ message: 'Mot de passe modifié avec succès.' });
});

export default router;
