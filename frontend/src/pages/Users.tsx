import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  studentClasse?: { id: number; name: string } | null;
}

export default function Users() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ETUDIANT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    const { data } = await apiClient.get<UserRow[]>('/users');
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/users', { name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      setRole('ETUDIANT');
      await loadUsers();
    } catch (err) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(message ?? 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Utilisateurs
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Nouveau compte
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pas d'auto-inscription : seuls les professeurs et administrateurs créent des comptes.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}
        >
          <TextField
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            size="small"
          />
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            size="small"
          />
          <TextField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            size="small"
          />
          {isAdmin && (
            <TextField
              select
              label="Rôle"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ETUDIANT">Étudiant</MenuItem>
              <MenuItem value="PROFESSEUR">Professeur</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </TextField>
          )}
          <Button type="submit" variant="contained" disabled={loading}>
            Créer
          </Button>
        </Box>
      </Paper>

      <Stack spacing={1}>
        {users.map((u) => (
          <Paper key={u.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1">{u.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {u.email}
                {u.studentClasse ? ` — ${u.studentClasse.name}` : ''}
              </Typography>
            </Box>
            <Chip label={u.role} size="small" />
          </Paper>
        ))}
        {users.length === 0 && (
          <Typography color="text.secondary">Aucun utilisateur pour le moment.</Typography>
        )}
      </Stack>
    </Box>
  );
}
