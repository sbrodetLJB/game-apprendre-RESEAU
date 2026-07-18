// Port TypeScript direct de apprendre-les-bases-de-reseau/correcteur/Runners/TextAnswerRunner.cs
// (voir correcteur/README.md, section "Comment ça marche") : aucune exécution, comparaison
// texte pure entre le fichier réponse de l'élève et le corrigé, paire "Clé : valeur" par ligne.

export interface FieldMismatch {
  field: string;
  expected: string;
  obtained: string;
}

export interface CaseResult {
  name: string;
  passed: boolean;
  missingFileError?: string;
  mismatches: FieldMismatch[];
}

// Une paire "Clé : valeur" par ligne, lignes vides et commentaires ("#...") ignorés. Le
// délimiteur est toujours un espace suivi d'un ":" (jamais un simple ":" isolé) : une clé peut
// elle-même contenir des deux-points (adresse IPv6, ex. "fe80::1 : link-local").
function parseAnswerFile(text: string): Array<[string, string]> {
  const result: Array<[string, string]> = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf(' :');
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 2).trim();
    result.push([key, value]);
  }

  return result;
}

// Normalisation volontairement simple (espaces, casse) — chaque énoncé précise le format
// exact attendu plutôt que de faire reposer la correction sur une normalisation plus
// permissive (accents, formes équivalentes...).
function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');
}

export function gradeCase(name: string, referenceText: string, studentText: string | undefined): CaseResult {
  if (studentText === undefined) {
    return { name, passed: false, missingFileError: 'Fichier attendu introuvable dans la soumission.', mismatches: [] };
  }

  const reference = parseAnswerFile(referenceText);
  const student = parseAnswerFile(studentText);

  const mismatches: FieldMismatch[] = [];
  for (const [key, expectedValue] of reference) {
    const studentEntry = student.find(([k]) => normalize(k) === normalize(key));
    const studentValue = studentEntry?.[1];

    if (studentValue === undefined || normalize(studentValue) !== normalize(expectedValue)) {
      mismatches.push({
        field: key,
        expected: expectedValue,
        obtained: studentValue ?? '(champ absent)',
      });
    }
  }

  return { name, passed: mismatches.length === 0, mismatches };
}
