import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  Alert,
  Box,
  Checkbox,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import apiClient from '../api/client';

interface Classe {
  id: number;
  name: string;
}

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface ProgressMatrix {
  classe: { id: number; name: string };
  lessons: { id: number; slug: string; number: number; title: string; pasAPasVisible: boolean }[];
  students: {
    student: { id: number; name: string; email: string };
    lessons: { lessonId: number; slug: string; status: ProgressStatus }[];
  }[];
}

const statusCell: Record<ProgressStatus, { icon: React.ReactElement; label: string }> = {
  COMPLETED: { icon: <CheckCircleIcon color="success" fontSize="small" />, label: 'Terminée' },
  IN_PROGRESS: { icon: <EditNoteIcon color="warning" fontSize="small" />, label: 'En cours' },
  NOT_STARTED: { icon: <RadioButtonUncheckedIcon color="disabled" fontSize="small" />, label: 'À faire' },
};

export default function TeacherProgress() {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [classeId, setClasseId] = useState<number | ''>('');
  const [matrix, setMatrix] = useState<ProgressMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get<Classe[]>('/classes').then(({ data }) => {
      setClasses(data);
      if (data.length > 0) setClasseId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (classeId === '') return;
    setError(null);
    setMatrix(null);
    apiClient
      .get<ProgressMatrix>(`/teacher/classes/${classeId}/progress`)
      .then(({ data }) => setMatrix(data))
      .catch((err) => {
        const message = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
        setError(message ?? 'Impossible de charger la progression de cette classe.');
      });
  }, [classeId]);

  const togglePasAPas = (lessonId: number, visible: boolean) => {
    apiClient.patch(`/teacher/lessons/${lessonId}/pas-a-pas-visible`, { visible }).then(() => {
      setMatrix((prev) =>
        prev
          ? { ...prev, lessons: prev.lessons.map((l) => (l.id === lessonId ? { ...l, pasAPasVisible: visible } : l)) }
          : prev
      );
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Suivi de progression
      </Typography>

      <TextField
        select
        label="Classe"
        value={classeId}
        onChange={(e) => setClasseId(Number(e.target.value))}
        size="small"
        sx={{ minWidth: 240, mb: 2 }}
      >
        {classes.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
        {(Object.keys(statusCell) as ProgressStatus[]).map((status) => (
          <Stack key={status} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {statusCell[status].icon}
            <Typography variant="caption">{statusCell[status].label}</Typography>
          </Stack>
        ))}
      </Stack>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {matrix && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Étudiant</TableCell>
                {matrix.lessons.map((lesson) => (
                  <TableCell key={lesson.id} align="center" title={lesson.title}>
                    {String(lesson.number).padStart(2, '0')}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    Pas à pas visible
                  </Typography>
                </TableCell>
                {matrix.lessons.map((lesson) => (
                  <TableCell key={lesson.id} align="center" sx={{ p: 0 }}>
                    <Tooltip title={`${lesson.pasAPasVisible ? 'Masquer' : 'Afficher'} le pas à pas de la leçon ${lesson.number}`}>
                      <Checkbox
                        size="small"
                        checked={lesson.pasAPasVisible}
                        onChange={(e) => togglePasAPas(lesson.id, e.target.checked)}
                      />
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.students.map((row) => (
                <TableRow
                  key={row.student.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/teacher/students/${row.student.id}`)}
                >
                  <TableCell>{row.student.name}</TableCell>
                  {row.lessons.map((cell) => (
                    <TableCell key={cell.lessonId} align="center">
                      <Tooltip title={statusCell[cell.status].label}>{statusCell[cell.status].icon}</Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {matrix && matrix.students.length === 0 && (
        <Typography color="text.secondary">Aucun étudiant dans cette classe.</Typography>
      )}
    </Box>
  );
}
