import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type { SvgIconComponent } from '@mui/icons-material';

export interface MenuItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
  /** Rôles autorisés à voir cet item. Absent = visible par tous les utilisateurs authentifiés. */
  roles?: string[];
}

// Pas d'entrée "Relectures" : ce cours n'a aucune leçon nécessitant une relecture professeur.
export const menuItems: MenuItem[] = [
  { label: 'Accueil', path: '/', icon: DashboardIcon },
  { label: 'Leçons', path: '/lessons', icon: MenuBookIcon },
  { label: 'Badges', path: '/badges', icon: EmojiEventsIcon, roles: ['ETUDIANT'] },
  { label: 'Classes', path: '/classes', icon: SchoolIcon, roles: ['ADMIN', 'PROFESSEUR'] },
  { label: 'Utilisateurs', path: '/users', icon: PeopleIcon, roles: ['ADMIN', 'PROFESSEUR'] },
  { label: 'Suivi', path: '/teacher/progress', icon: AssessmentIcon, roles: ['ADMIN', 'PROFESSEUR'] },
];
