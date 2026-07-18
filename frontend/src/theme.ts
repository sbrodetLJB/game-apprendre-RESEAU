import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#2e7d32' },
    secondary: { main: '#f57c00' },
    background: { default: '#f4f6f8' },
  },
  shape: { borderRadius: 8 },
});

export default theme;
