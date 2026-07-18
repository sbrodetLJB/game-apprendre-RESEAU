import type { ReactNode } from 'react';
import { Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

interface RoleRouteProps {
  children: ReactNode;
  /** Rôles autorisés à voir cette page. Absent = tout utilisateur authentifié. */
  roles?: string[];
}

export default function RoleRoute({ children, roles }: RoleRouteProps) {
  const { user } = useAuth();

  const allowed = !roles || (user && roles.includes(user.role));

  if (!allowed) {
    return (
      <Alert severity="warning">
        Vous n'avez pas accès à cette page. Contactez votre professeur ou l'administrateur si
        vous pensez qu'il s'agit d'une erreur.
      </Alert>
    );
  }

  return <>{children}</>;
}
