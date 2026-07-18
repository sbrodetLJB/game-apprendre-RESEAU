import { Alert, Box, Paper, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Bienvenue, {user?.name} 👋
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Le parcours de leçons, les exercices réseau et la progression gamifiée (XP, niveaux,
          badges) arrivent dans une prochaine phase du projet.
        </Typography>
      </Paper>
      {user?.role === 'ETUDIANT' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Vous êtes connecté en tant qu'étudiant. Revenez bientôt pour commencer votre premier
          exercice réseau !
        </Alert>
      )}
    </Box>
  );
}
