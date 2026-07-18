import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import apiClient from '../api/client';

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface LessonRow {
  id: number;
  slug: string;
  number: number;
  title: string;
  progressStatus: ProgressStatus;
}

// Statut jamais porté par la couleur seule : icône + libellé systématiques. Pas de chip
// "correction auto/relecture" ici : toutes les leçons de ce cours sont auto-corrigées.
const progressIcon: Record<ProgressStatus, React.ReactElement> = {
  COMPLETED: <CheckCircleIcon color="success" />,
  IN_PROGRESS: <EditNoteIcon color="warning" />,
  NOT_STARTED: <RadioButtonUncheckedIcon color="disabled" />,
};

const progressLabel: Record<ProgressStatus, string> = {
  COMPLETED: 'Terminée',
  IN_PROGRESS: 'En cours',
  NOT_STARTED: 'À faire',
};

export default function Lessons() {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .get<LessonRow[]>('/lessons')
      .then(({ data }) => setLessons(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Leçons
      </Typography>
      <Paper>
        <List disablePadding>
          {lessons.map((lesson) => (
            <ListItemButton key={lesson.id} divider onClick={() => navigate(`/lessons/${lesson.slug}`)}>
              <ListItemIcon>{progressIcon[lesson.progressStatus]}</ListItemIcon>
              <ListItemText
                primary={`${String(lesson.number).padStart(2, '0')}. ${lesson.title}`}
                secondary={progressLabel[lesson.progressStatus]}
              />
            </ListItemButton>
          ))}
        </List>
        {!loading && lessons.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            Aucune leçon importée pour le moment.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
