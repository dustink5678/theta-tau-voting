import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
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
  const { user, loading } = useAuth() as any;
  
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate content height based on whether user is admin (with tabs) or not
  const contentMinHeight = user.role === 'admin' ? 'calc(100vh - 98px)' : 'calc(100vh - 56px)';

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
  const { user, loading } = useAuth() as any;
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  // If user is authenticated, redirect them immediately
  if (user) {
    return user.role === 'admin' 
      ? <Navigate to="/admin" replace /> 
      : <Navigate to="/dashboard" replace />;
  }
  
  return (
    <Box width="100vw" minH="100vh">
      {children}
    </Box>
  );
};

// MODIFY THIS COMPONENT:
const AppContent = () => {
  const { user, loading } = useAuth() as any;
  
  // Show loading screen while determining authentication state
  if (loading) {
    return <LoadingScreen />;
  }
  
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
            path="/admin"
            element={
              <PrivateRoute adminOnly>
                <AdminPanel />
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
          <Route
            path="/pending"
            element={
              <PublicRoute>
                <PendingVoters />
              </PublicRoute>
            }
          />
          <Route path="/" element={
            user?.role === 'admin' ? (
              <Navigate to="/admin" replace /> 
            ) : user ? (
              <Navigate to="/dashboard" replace />
            ) : (
               <Navigate to="/login" replace />
            )
          } />
        </Routes>
      </Suspense>
    </Flex>
  );
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
