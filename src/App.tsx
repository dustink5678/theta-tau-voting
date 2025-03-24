import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel'
import UserDashboard from './pages/UserDashboard';
import PendingVoters from './pages/PendingVoters';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import { User } from './types';

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
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
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
  return (
    <Box width="100vw" minH="100vh">
      {children}
    </Box>
  );
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <Flex direction="column" width="100vw" minH="100vh" maxW="100vw" overflow="hidden">
      <Routes>
        <Route path="/login" element={<Login />} />
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
          user?.role === 'admin' 
            ? <Navigate to="/admin" /> 
            : <Navigate to="/dashboard" />
        } />
      </Routes>
    </Flex>
  );
};

const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
};

export default App;
