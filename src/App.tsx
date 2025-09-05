import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel'
import TimerControl from './pages/TimerControl'
import TimerView from './pages/TimerView'
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

const PrivateRoute = ({ children, adminOnly = false, controllerOnly = false }: { children: React.ReactNode; adminOnly?: boolean; controllerOnly?: boolean }) => {
  const { user, loading } = useAuth() as any;
  
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/timer" replace />;
  }

  if (controllerOnly) {
    const isController = user.role === 'admin' || user.role === 'regent';
    if (!isController) {
      return <Navigate to="/timer" replace />;
    }
  }

  // Calculate content height based on whether user is admin (with tabs) or not
  const contentMinHeight = (user.role === 'admin' || user.role === 'regent') ? 'calc(100vh - 98px)' : 'calc(100vh - 56px)';

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
      if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (user.role === 'regent') {
        return <Navigate to="/set-timer" replace />;
      } else {
        return <Navigate to="/timer" replace />;
      }
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
        <Route
          path="/timer"
          element={
            <PrivateRoute>
              <TimerView />
            </PrivateRoute>
          }
        />
        <Route
          path="/set-timer"
          element={
            <PrivateRoute controllerOnly>
              <TimerControl />
            </PrivateRoute>
          }
        />
        <Route path="/" element={
          loading ? (
            <LoadingScreen />
          ) : user?.role === 'admin' ? (
            <Navigate to="/admin" replace />
          ) : user?.role === 'regent' ? (
            <Navigate to="/set-timer" replace />
          ) : (
            <Navigate to="/timer" replace />
          )
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
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
};

export default App;
