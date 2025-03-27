import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import AdminPanel from './pages/AdminPanel'
import UserDashboard from './pages/UserDashboard';
import PendingVoters from './pages/PendingVoters';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';

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
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // The AuthProvider will handle showing the login screen
    return null;
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

const AppContent = () => {
  const { user, loading } = useAuth();
  
  // When loading or when there's no user, return null
  // The AuthProvider will handle showing loading state or login screen
  if (loading || !user) {
    return null;
  }
  
  return (
    <Flex direction="column" width="100vw" minH="100vh" maxW="100vw" overflow="hidden">
      <Routes>
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
            user.verified ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
            ) : (
              <PendingVoters />
            )
          }
        />
        <Route 
          path="*" 
          element={
            user.role === 'admin' ? (
              <Navigate to="/admin" replace /> 
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } 
        />
      </Routes>
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
