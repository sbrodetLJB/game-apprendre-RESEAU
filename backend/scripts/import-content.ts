// Import ponctuel du contenu pédagogique depuis apprendre-les-bases-de-reseau.
//
// Usage : npx ts-node scripts/import-content.ts --source <chemin-vers-le-checkout>
//
// Exécuté manuellement par un mainteneur, jamais en continu ni au build : le contenu devient
// des données relationnelles (Lesson/Exercise), pas des fichiers servis tels quels. Calqué sur
// game-apprendre-BDD/backend/scripts/import-content.ts, simplifié : ce cours n'a pas de
// "setupScripts" (rien à préparer, aucune exécution) et toutes les leçons ont une fixture de
// correction (pas de branche MANUAL_REVIEW — le script échoue explicitement si une fixture
// manque, plutôt que de retomber sur un mode qui n'existe pas pour ce cours).
import 'dotenv/config';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

interface FileEntry {
  path: string;
  content: string;
}

interface RawCase {
  name: string;
  referenceFile: string;
  studentFile: string;
}

interface RawTestCaseFile {
  tp: string;
  cases: RawCase[];
}

function parseArgs(): { source: string; ref?: string } {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  const refIdx = args.indexOf('--ref');
  if (sourceIdx === -1 || !args[sourceIdx + 1]) {
    throw new Error('Usage: import-content.ts --source <chemin-vers-le-checkout> [--ref <tag-ou-sha>]');
  }
  return {
    source: path.resolve(args[sourceIdx + 1]),
    ref: refIdx !== -1 ? args[refIdx + 1] : undefined,
  };
}

function resolveSourceRef(source: string, explicitRef?: string): string {
  if (explicitRef) return explicitRef;
  try {
    return execSync('git rev-parse --short HEAD', { cwd: source }).toString().trim();
  } catch {
    throw new Error(
      `Impossible de déterminer le sourceRef automatiquement (git rev-parse a échoué dans ${source}). Précisez --ref.`
    );
  }
}

function walkFiles(root: string): FileEntry[] {
  const entries: FileEntry[] = [];

  function walk(dir: string) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else {
        const relative = path.relative(root, full).split(path.sep).join('/');
        entries.push({ path: relative, content: fs.readFileSync(full, 'utf8') });
      }
    }
  }

  walk(root);
  return entries;
}

function parseTitle(theoryMd: string, fallback: string): string {
  const firstLine = theoryMd.split('\n')[0] ?? '';
  const match = firstLine.match(/^#\s*\d+\.\s*(.+)$/);
  return match ? match[1].trim().replace(/[`*]/g, '') : fallback;
}

async function main() {
  const { source, ref } = parseArgs();
  const sourceRef = resolveSourceRef(source, ref);

  const docsDir = path.join(source, 'docs');
  const tpDir = path.join(source, 'tp');
  const testcasesDir = path.join(source, 'correcteur', 'testcases');

  const tpFolders = fs
    .readdirSync(tpDir)
    .filter((name) => fs.statSync(path.join(tpDir, name)).isDirectory())
    .sort();

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const prisma = new PrismaClient({ adapter });

  let imported = 0;

  for (const tpFolder of tpFolders) {
    const numberPrefix = tpFolder.split('-')[0];
    const number = Number(numberPrefix);
    if (!Number.isInteger(number)) {
      throw new Error(`Dossier tp/ inattendu (pas de préfixe numérique) : ${tpFolder}`);
    }

    const docFile = fs.readdirSync(docsDir).find((f) => f.startsWith(`${numberPrefix}-`) && f.endsWith('.md'));
    if (!docFile) {
      throw new Error(`Aucun fichier docs/ trouvé pour le préfixe ${numberPrefix} (tp/${tpFolder}).`);
    }
    const slug = docFile.replace(/\.md$/, '');
    const theoryMd = fs.readFileSync(path.join(docsDir, docFile), 'utf8');
    const title = parseTitle(theoryMd, slug);

    const tpPath = path.join(tpDir, tpFolder);
    const pasAPasPath = path.join(tpPath, 'PasAPas.md');
    const pasAPasMd = fs.existsSync(pasAPasPath) ? fs.readFileSync(pasAPasPath, 'utf8') : null;

    const enonceRoot = path.join(tpPath, 'Enonce');
    const corrigeRoot = path.join(tpPath, 'Corrige');
    if (!fs.existsSync(enonceRoot) || !fs.existsSync(corrigeRoot)) {
      throw new Error(`Enonce/ ou Corrige/ manquant pour tp/${tpFolder}.`);
    }

    const enonceFiles = walkFiles(enonceRoot);
    const solutionFiles = walkFiles(corrigeRoot);

    const testcaseFile = path.join(testcasesDir, `${numberPrefix}.json`);
    if (!fs.existsSync(testcaseFile)) {
      throw new Error(
        `Fixture de correction introuvable : ${testcaseFile} — ce cours attend une fixture pour chaque leçon (pas de relecture manuelle).`
      );
    }
    const raw = JSON.parse(fs.readFileSync(testcaseFile, 'utf8')) as RawTestCaseFile;
    const testCasesJson = {
      cases: raw.cases.map((c) => ({
        name: c.name,
        referenceText: fs.readFileSync(path.join(source, c.referenceFile), 'utf8'),
        studentFileName: c.studentFile,
      })),
    };

    const lesson = await prisma.lesson.upsert({
      where: { slug },
      update: { number, title, theoryMd, pasAPasMd, sourceRef },
      create: { slug, number, title, theoryMd, pasAPasMd, sourceRef },
    });

    await prisma.exercise.upsert({
      where: { lessonId: lesson.id },
      update: {
        enonceFiles: enonceFiles as any,
        solutionFiles: solutionFiles as any,
        testCasesJson: testCasesJson as any,
      },
      create: {
        lessonId: lesson.id,
        enonceFiles: enonceFiles as any,
        solutionFiles: solutionFiles as any,
        testCasesJson: testCasesJson as any,
      },
    });

    imported++;
    console.log(`Leçon ${String(number).padStart(2, '0')} — ${title} [${testCasesJson.cases.length} cas]`);
  }

  console.log('\nImport terminé.', { sourceRef, total: imported });
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
