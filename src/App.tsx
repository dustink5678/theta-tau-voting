import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';

// Dynamically import page components
const Login = lazy(() => import('./pages/Login'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const PendingVoters = lazy(() => import('./pages/PendingVoters'));

// Create a custom maroon theme
const theme = extendTheme({
  colors: {
    blue: {
      50: '#f9e6e8',
      100: '#f0bdc2',
      200: '#e5939b',
      300: '#db6a74',
      400: '#d1414e',
      500: '#c71827', // Primary maroon color
      600: '#a01320',
      700: '#780e18',
      800: '#500a10',
      900: '#280508',
    },
    red: {
      50: '#f9e6e8',
      100: '#f0bdc2',
      200: '#e5939b',
      300: '#db6a74',
      400: '#d1414e',
      500: '#c71827', // Primary maroon color
      600: '#a01320',
      700: '#780e18',
      800: '#500a10',
      900: '#280508',
    },
  },
});

const PrivateRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = currentUser?.email === 'admin@example.com';

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const contentMinHeight = isAdmin ? 'calc(100vh - 98px)' : 'calc(100vh - 56px)';

  return (
    <Flex direction="column" width="100vw" minH="100vh">
      <Navbar />
      <Box flex="1" width="100%" maxW="100vw" minH={contentMinHeight}>
        {children}
      </Box>
    </Flex>
  );
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (currentUser) {
    const isAdmin = currentUser?.email === 'admin@example.com';
    return isAdmin 
      ? <Navigate to="/admin" replace /> 
      : <Navigate to="/dashboard" replace />;
  }
  
  return (
    <Box width="100vw" minH="100vh">
      {children}
    </Box>
  );
};

const AppContent = () => {
  return (
    <Flex direction="column" width="100vw" minH="100vh" maxW="100vw" overflow="hidden">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route
            path="/admin/*"
            element={ 
              <PrivateRoute adminOnly>
                <Routes>
                  <Route index element={<AdminPanel />} />
                  <Route path="pending" element={<PendingVoters />} />
                </Routes>
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <UserDashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </Flex>
  );
};

const RootRedirect = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = currentUser?.email === 'admin@example.com';

  return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
};

const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <AuthProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
};

export default App;
