import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import MissionDetail from './pages/MissionDetail';
import Inventory from './pages/Inventory';
import ImportExport from './pages/ImportExport';
import AdminPanel from './pages/AdminPanel';
import Infrastructure from './pages/Infrastructure';
import NetworkMapping from './pages/NetworkMapping';
import Vulnerabilities from './pages/Vulnerabilities';
import Security from './pages/Security';
import Interviews from './pages/Interviews';
import Reports from './pages/Reports';
import Users from './pages/Users';
import OidcCallback from './pages/OidcCallback';
import Services from './pages/Services';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      light: '#9bb5ff',
      dark: '#3f51b5',
    },
    secondary: {
      main: '#764ba2',
      light: '#a478d4',
      dark: '#4a2c73',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#2c3e50',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#2c3e50',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 5px 15px rgba(102, 126, 234, 0.3)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
          },
        },
      },
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Chargement...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/auth/callback" element={<OidcCallback />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/missions" element={
        <ProtectedRoute>
          <Layout>
            <Missions />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/missions/:id" element={
        <ProtectedRoute>
          <Layout>
            <MissionDetail />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute>
          <Layout>
            <Inventory />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/infrastructure" element={
        <ProtectedRoute>
          <Layout>
            <Infrastructure />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/network" element={
        <ProtectedRoute>
          <Layout>
            <NetworkMapping />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/vulnerabilities" element={
        <ProtectedRoute>
          <Layout>
            <Vulnerabilities />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/security" element={
        <ProtectedRoute>
          <Layout>
            <Security />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/interviews" element={
        <ProtectedRoute>
          <Layout>
            <Interviews />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout>
            <Reports />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Layout>
            <Users />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/services" element={
        <ProtectedRoute>
          <Layout>
            <Services />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/import-export" element={
        <ProtectedRoute>
          <Layout>
            <ImportExport />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <Layout>
            <AdminPanel />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
