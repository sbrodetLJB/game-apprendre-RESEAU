import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import apiClient from '../api/client';

interface ClasseUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Classe {
  id: number;
  name: string;
  students: ClasseUser[];
  teachers: ClasseUser[];
}

export default function Classes() {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadClasses = async () => {
    const { data } = await apiClient.get<Classe[]>('/classes');
    setClasses(data);
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/classes', { name });
      setName('');
      await loadClasses();
    } catch (err) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(message ?? 'Erreur lors de la création de la classe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Classes
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Nouvelle classe
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Nom de la classe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            size="small"
            sx={{ flexGrow: 1 }}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Créer
          </Button>
        </Box>
      </Paper>

      <Stack spacing={2}>
        {classes.map((classe) => (
          <Paper key={classe.id} sx={{ p: 2 }}>
            <Typography variant="h6">{classe.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Professeurs :
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              {classe.teachers.length === 0 && (
                <Typography variant="body2" color="text.disabled">
                  Aucun
                </Typography>
              )}
              {classe.teachers.map((t) => (
                <Chip key={t.id} label={t.name} size="small" color="secondary" />
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Étudiants ({classe.students.length}) :
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              {classe.students.length === 0 && (
                <Typography variant="body2" color="text.disabled">
                  Aucun
                </Typography>
              )}
              {classe.students.map((s) => (
                <Chip key={s.id} label={s.name} size="small" />
              ))}
            </Stack>
          </Paper>
        ))}
        {classes.length === 0 && (
          <Typography color="text.secondary">Aucune classe pour le moment.</Typography>
        )}
      </Stack>
    </Box>
  );
}
