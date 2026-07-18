import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@game-apprendre-reseau.local' },
    update: {},
    create: {
      email: 'admin@game-apprendre-reseau.local',
      password: await bcrypt.hash('admin123', 10),
      name: 'Administrateur',
      role: 'ADMIN',
    },
  });

  const prof = await prisma.user.upsert({
    where: { email: 'prof.martin@game-apprendre-reseau.local' },
    update: {},
    create: {
      email: 'prof.martin@game-apprendre-reseau.local',
      password: await bcrypt.hash('prof123', 10),
      name: 'M. Martin',
      role: 'PROFESSEUR',
    },
  });

  const studentsData = [
    { email: 'etudiant1@game-apprendre-reseau.local', name: 'Lucas Bernard' },
    { email: 'etudiant2@game-apprendre-reseau.local', name: 'Emma Petit' },
  ];
  const students = [];
  for (const s of studentsData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: await bcrypt.hash('etudiant123', 10),
        name: s.name,
        role: 'ETUDIANT',
      },
    });
    students.push(student);
  }

  const classe = await prisma.classe.upsert({
    where: { name: 'BTS SIO 1ère année' },
    update: {},
    create: {
      name: 'BTS SIO 1ère année',
      teachers: { connect: [{ id: prof.id }] },
      students: { connect: students.map((s) => ({ id: s.id })) },
    },
  });

  console.log('Seed terminé.', { admin: admin.email, prof: prof.email, classe: classe.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
