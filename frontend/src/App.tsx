import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import { XpProvider } from './context/XpContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import Lessons from './pages/Lessons';
import Exercise from './pages/Exercise';
import Badges from './pages/Badges';
import Classes from './pages/Classes';
import Users from './pages/Users';
import TeacherProgress from './pages/TeacherProgress';
import TeacherStudentDetail from './pages/TeacherStudentDetail';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <XpProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="lessons" element={<Lessons />} />
                <Route path="lessons/:slug" element={<Exercise />} />
                <Route
                  path="badges"
                  element={
                    <RoleRoute roles={['ETUDIANT']}>
                      <Badges />
                    </RoleRoute>
                  }
                />
                <Route
                  path="classes"
                  element={
                    <RoleRoute roles={['ADMIN', 'PROFESSEUR']}>
                      <Classes />
                    </RoleRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <RoleRoute roles={['ADMIN', 'PROFESSEUR']}>
                      <Users />
                    </RoleRoute>
                  }
                />
                <Route
                  path="teacher/progress"
                  element={
                    <RoleRoute roles={['ADMIN', 'PROFESSEUR']}>
                      <TeacherProgress />
                    </RoleRoute>
                  }
                />
                <Route
                  path="teacher/students/:studentId"
                  element={
                    <RoleRoute roles={['ADMIN', 'PROFESSEUR']}>
                      <TeacherStudentDetail />
                    </RoleRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </XpProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
