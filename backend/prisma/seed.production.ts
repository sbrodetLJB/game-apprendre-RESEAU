import 'dotenv/config';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Seed de production : uniquement un compte ADMIN réel avec un mot de passe fort généré et
 * affiché une seule fois — jamais de comptes de démonstration sur un serveur réel (voir
 * prisma/seed.ts pour l'environnement de dev). Gabarit : game-apprendre-BDD/backend/prisma/seed.production.ts.
 * Idempotent : si le compte existe déjà, son mot de passe n'est pas modifié.
 */

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

function generatePassword(length = 20): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('SEED_ADMIN_EMAIL est requis pour le seed de production.');
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  let adminPassword: string | null = null;
  if (!existingAdmin) {
    adminPassword = generatePassword();
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        name: 'Administrateur',
        role: 'ADMIN',
      },
    });
  }

  console.log('Seed de production terminé.');
  if (adminPassword) {
    console.log('');
    console.log('=== Identifiants du compte administrateur (affichés une seule fois) ===');
    console.log(`E-mail       : ${adminEmail}`);
    console.log(`Mot de passe : ${adminPassword}`);
    console.log('=========================================================================');
  } else {
    console.log(`Le compte ${adminEmail} existait déjà, mot de passe inchangé.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
