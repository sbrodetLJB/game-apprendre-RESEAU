import prisma from './prisma';

// Regroupement des 15 leçons en chapitres thématiques — n'existe nulle part dans le dépôt de
// contenu (docs/ et tp/ sont juste numérotés), sur le modèle de game-apprendre-BDD/backend/src/lib/badges.ts.
export const CHAPTERS = [
  { key: 'chapitre-1-numeration', label: 'Numération (binaire, hexadécimale, octale)', from: 1, to: 3 },
  { key: 'chapitre-2-adressage-ipv4', label: 'Adressage IPv4', from: 4, to: 7 },
  { key: 'chapitre-3-adressage-ipv6', label: 'Adressage IPv6', from: 8, to: 9 },
  { key: 'chapitre-4-commutation-vlan', label: 'Commutation et VLAN', from: 10, to: 11 },
  { key: 'chapitre-5-routage', label: 'Routage', from: 12, to: 13 },
  { key: 'chapitre-6-filtrage-synthese', label: 'Filtrage et synthèse', from: 14, to: 15 },
  // Chapitre ajouté avec le contenu apprendre-reseau-avance (commandes Cisco IOS : config IP,
  // VLAN, routage, ACL) — voir README de ce dépôt de contenu.
  { key: 'chapitre-7-cisco', label: 'Cisco : IP, VLAN, routage et filtrage', from: 16, to: 19 },
] as const;

interface BadgeDef {
  key: string;
  label: string;
  description: string;
  iconKey: string;
}

const SPECIAL_BADGES: BadgeDef[] = [
  {
    key: 'premier-pas',
    label: 'Premier pas',
    description: 'Terminer la première leçon.',
    iconKey: 'flag',
  },
  {
    key: 'sans-faute',
    label: 'Sans faute',
    description: 'Réussir un exercice dès le premier essai.',
    iconKey: 'star',
  },
  {
    key: 'tout-termine',
    label: 'Cours terminé',
    description: 'Terminer toutes les leçons du cours.',
    iconKey: 'trophy',
  },
];

const CHAPTER_BADGES: BadgeDef[] = CHAPTERS.map((c) => ({
  key: c.key,
  label: c.label,
  description: `Terminer toutes les leçons du chapitre « ${c.label} ».`,
  iconKey: 'book',
}));

export const BADGE_CATALOG: BadgeDef[] = [...SPECIAL_BADGES, ...CHAPTER_BADGES];

// Idempotent, appelé au démarrage du serveur (index.ts) : le catalogue est toujours présent
// sans étape de seed manuelle à ne pas oublier en prod (contrairement aux comptes de démo).
export async function ensureBadgeCatalog(): Promise<void> {
  for (const badge of BADGE_CATALOG) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: { label: badge.label, description: badge.description, iconKey: badge.iconKey },
      create: badge,
    });
  }
}
