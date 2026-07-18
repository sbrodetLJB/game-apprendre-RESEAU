import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import apiClient from '../api/client';
import { useXp } from '../context/XpContext';

interface FileEntry {
  path: string;
  content: string;
}

interface LessonDetail {
  id: number;
  slug: string;
  number: number;
  title: string;
  theoryMd: string;
  pasAPasMd: string | null;
  exercise: { enonceFiles: FileEntry[] };
}

interface FieldMismatch {
  field: string;
  expected: string;
  obtained: string;
}

interface CaseResult {
  name: string;
  passed: boolean;
  missingFileError?: string;
  mismatches: FieldMismatch[];
}

interface Submission {
  id: number;
  status: 'AUTO_PASSED' | 'AUTO_FAILED' | 'ERROR';
  resultDetail: { cases: CaseResult[]; total: number; passed: number } | null;
}

// Différence délibérée avec les modules C#/BDD : pas d'éditeur Monaco (accessibilité au
// lecteur d'écran, voir NVDA.md du dépôt de contenu) — un champ de texte multiligne standard
// par fichier suffit, exactement comme "un éditeur de texte" suggéré par le cours. Correction
// synchrone : le résultat est déjà connu à la réponse du POST, pas de polling.
export default function Exercise() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { refresh: refreshXp } = useXp();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setSubmission(null);
    apiClient
      .get<LessonDetail>(`/lessons/${slug}`)
      .then(({ data }) => {
        setLesson(data);
        const editable = data.exercise.enonceFiles.filter((f) => f.path.endsWith('.txt'));
        const initial = Object.fromEntries(editable.map((f) => [f.path, f.content]));
        setFileContents(initial);
        setActiveFile(editable[0]?.path ?? '');
      })
      .catch(() => setLoadError('Impossible de charger cette leçon.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const editableFiles = useMemo(() => Object.keys(fileContents), [fileContents]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmission(null);
    try {
      const files = editableFiles.map((path) => ({ path, content: fileContents[path] }));
      const { data } = await apiClient.post<Submission>(`/lessons/${slug}/submissions`, { files });
      setSubmission(data);
      if (data.status === 'AUTO_PASSED') {
        refreshXp();
      }
    } catch (err) {
      const message = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setSubmitError(message ?? 'La soumission a échoué.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (loadError || !lesson) {
    return <Alert severity="error">{loadError ?? 'Leçon introuvable.'}</Alert>;
  }

  return (
    <Box>
      <Button onClick={() => navigate('/lessons')} sx={{ mb: 1 }}>
        ← Retour aux leçons
      </Button>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        {String(lesson.number).padStart(2, '0')}. {lesson.title}
      </Typography>

      <Accordion sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Cours</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ '& pre': { overflowX: 'auto', bgcolor: 'grey.100', p: 1, borderRadius: 1 } }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.theoryMd}</ReactMarkdown>
        </AccordionDetails>
      </Accordion>

      {lesson.pasAPasMd && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Guide pas à pas</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ '& pre': { overflowX: 'auto', bgcolor: 'grey.100', p: 1, borderRadius: 1 } }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.pasAPasMd}</ReactMarkdown>
          </AccordionDetails>
        </Accordion>
      )}

      <Paper sx={{ mb: 2 }}>
        {editableFiles.length > 1 && (
          <Tabs value={activeFile} onChange={(_, v) => setActiveFile(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            {editableFiles.map((path) => (
              <Tab key={path} value={path} label={path} />
            ))}
          </Tabs>
        )}
        <TextField
          key={activeFile}
          value={fileContents[activeFile] ?? ''}
          onChange={(e) => setFileContents((prev) => ({ ...prev, [activeFile]: e.target.value }))}
          multiline
          minRows={8}
          fullWidth
          label={`Réponse — ${activeFile}`}
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 14 } } }}
          sx={{ p: 2 }}
        />
      </Paper>

      <Button variant="contained" size="large" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Envoi...' : 'Soumettre'}
      </Button>

      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitError}
        </Alert>
      )}

      {submission && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <SubmissionResult submission={submission} />
        </Paper>
      )}
    </Box>
  );
}

function SubmissionResult({ submission }: { submission: Submission }) {
  if (submission.status === 'ERROR' || !submission.resultDetail) {
    return <Alert severity="error">La correction a échoué. Réessayez ou contactez votre professeur.</Alert>;
  }

  const detail = submission.resultDetail;
  const allPassed = submission.status === 'AUTO_PASSED';

  return (
    <Box>
      <Alert severity={allPassed ? 'success' : 'warning'} sx={{ mb: 2 }}>
        {allPassed
          ? `Bravo, tous les exercices sont corrects (${detail.passed}/${detail.total}) !`
          : `${detail.passed}/${detail.total} exercices corrects.`}
      </Alert>
      <Stack spacing={1}>
        {detail.cases.map((c, i) => (
          <Box key={i}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {c.passed ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />}
              <Typography variant="body2">{c.name}</Typography>
            </Stack>
            {!c.passed && c.missingFileError && (
              <Typography variant="body2" color="error" sx={{ ml: 4, mt: 0.5 }}>
                {c.missingFileError}
              </Typography>
            )}
            {!c.passed && c.mismatches.length > 0 && (
              <Box sx={{ ml: 4, mt: 0.5 }}>
                {c.mismatches.map((m, j) => (
                  <Typography key={j} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {m.field} — attendu : <strong>{m.expected}</strong>, obtenu : <strong>{m.obtained}</strong>
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
