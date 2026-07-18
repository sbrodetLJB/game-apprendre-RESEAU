import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import apiClient from '../api/client';

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface StudentDetail {
  student: { id: number; name: string; email: string };
  totalXp: number;
  progress: { lessonId: number; status: ProgressStatus; lesson: { slug: string; number: number; title: string } }[];
  recentSubmissions: {
    id: number;
    status: string;
    createdAt: string;
    lesson: { slug: string; title: string };
  }[];
}

const statusIcon: Record<ProgressStatus, React.ReactElement> = {
  COMPLETED: <CheckCircleIcon color="success" />,
  IN_PROGRESS: <EditNoteIcon color="warning" />,
  NOT_STARTED: <RadioButtonUncheckedIcon color="disabled" />,
};

export default function TeacherStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<StudentDetail | null>(null);

  useEffect(() => {
    apiClient.get<StudentDetail>(`/teacher/students/${studentId}`).then(({ data }) => setDetail(data));
  }, [studentId]);

  if (!detail) return null;

  return (
    <Box>
      <Button onClick={() => navigate('/teacher/progress')} sx={{ mb: 1 }}>
        ← Retour au suivi
      </Button>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        {detail.student.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {detail.student.email} — {detail.totalXp} XP
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper sx={{ flex: 1, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Progression
          </Typography>
          <List dense>
            {detail.progress
              .slice()
              .sort((a, b) => a.lesson.number - b.lesson.number)
              .map((p) => (
                <ListItem key={p.lessonId}>
                  <ListItemIcon>{statusIcon[p.status]}</ListItemIcon>
                  <ListItemText primary={`${String(p.lesson.number).padStart(2, '0')}. ${p.lesson.title}`} />
                </ListItem>
              ))}
            {detail.progress.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 1 }}>
                Aucune leçon commencée.
              </Typography>
            )}
          </List>
        </Paper>

        <Paper sx={{ flex: 1, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Soumissions récentes
          </Typography>
          <List dense>
            {detail.recentSubmissions.map((s) => (
              <ListItem key={s.id} secondaryAction={<Chip label={s.status} size="small" />}>
                <ListItemText
                  primary={s.lesson.title}
                  secondary={new Date(s.createdAt).toLocaleString('fr-FR')}
                />
              </ListItem>
            ))}
            {detail.recentSubmissions.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 1 }}>
                Aucune soumission.
              </Typography>
            )}
          </List>
        </Paper>
      </Stack>
    </Box>
  );
}
