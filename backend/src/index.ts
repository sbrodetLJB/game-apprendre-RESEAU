import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import classesRoutes from './routes/classes';
import lessonsRoutes from './routes/lessons';
import submissionsRoutes from './routes/submissions';
import meRoutes from './routes/me';
import teacherRoutes from './routes/teacher';
import { ensureBadgeCatalog } from './lib/badges';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5276' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/me', meRoutes);
app.use('/api/teacher', teacherRoutes);

const port = Number(process.env.PORT) || 4103;
const host = process.env.HOST || '0.0.0.0';

ensureBadgeCatalog()
  .catch((err) => console.error("Échec de l'initialisation du catalogue de badges :", err))
  .finally(() => {
    app.listen(port, host, () => {
      console.log(`Backend game-apprendre-RESEAU démarré sur http://${host}:${port}`);
    });
  });
