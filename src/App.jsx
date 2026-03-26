import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider }         from './context/ToastContext';
import AppLayout     from './components/layout/AppLayout';
import LoginPage     from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage  from './pages/ProjectsPage';
import CalendarPage  from './pages/CalendarPage';
import UsersPage     from './pages/UsersPage';
import './styles/tokens.css';

function AppRouter() {
  const { user, loading, isAdmin } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid #E4E2DC',
          borderTopColor: '#111',
          borderRadius: '50%',
          animation: 'spin .6s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage />;
      case 'projects':  return <ProjectsPage />;
      case 'calendar':  return <CalendarPage />;
      case 'users':     return isAdmin ? <UsersPage /> : <DashboardPage />;
      default:          return <DashboardPage />;
    }
  };

  return (
    <AppLayout activePage={page} onNavigate={setPage}>
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}
