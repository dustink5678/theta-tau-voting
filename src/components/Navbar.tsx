import {
  Box,
  Button,
  Flex,
  Text,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Tabs,
  TabList,
  Tab,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on role and current path
  const getTabIndex = () => {
    if (!user) return 0;

    const path = location.pathname;

    if (user.role === 'admin') {
      // Admin tabs: Timer(0), Set Timer(1), Admin Panel(2), Dashboard(3)
      if (path === '/timer') return 0;
      if (path === '/set-timer') return 1;
      if (path === '/admin') return 2;
      if (path === '/dashboard') return 3;
      return 0; // default to timer
    } else if (user.role === 'regent') {
      // Regent tabs: Timer(0), Set Timer(1), Dashboard(2)
      if (path === '/timer') return 0;
      if (path === '/set-timer') return 1;
      if (path === '/dashboard') return 2;
      return 0; // default to timer
    } else {
      // User tabs: Timer(0), Dashboard(1)
      if (path === '/timer') return 0;
      if (path === '/dashboard') return 1;
      return 0; // default to timer
    }
  };

  const handleTabChange = (index: number) => {
    if (!user) return;

    if (user.role === 'admin') {
      // Admin navigation
      if (index === 0) navigate('/timer');
      else if (index === 1) navigate('/set-timer');
      else if (index === 2) navigate('/admin');
      else if (index === 3) navigate('/dashboard');
    } else if (user.role === 'regent') {
      // Regent navigation
      if (index === 0) navigate('/timer');
      else if (index === 1) navigate('/set-timer');
      else if (index === 2) navigate('/dashboard');
    } else {
      // User navigation
      if (index === 0) navigate('/timer');
      else if (index === 1) navigate('/dashboard');
    }
  };

  return (
    <Flex
      direction="column"
      width="100vw"
      boxShadow="md"
    >
      <Flex
        as="nav"
        width="100%"
        bg="red.600"
        color="white"
        py={2}
        px={4}
        align="center"
        justify="space-between"
      >
        <Box>
          <Text fontWeight="bold" fontSize="lg">Theta Tau Voting</Text>
        </Box>

        {user && (
          <Menu>
            <MenuButton 
              as={Button} 
              variant="ghost" 
              color="white" 
              _hover={{ bg: 'red.500' }} 
              _active={{ bg: 'red.500' }}
            >
              <Flex align="center" gap={2}>
                <Avatar size="sm" src={user.photoURL || undefined} name={user.displayName || user.name || 'User'} />
                <Text display={{ base: 'none', md: 'block' }}>{user.displayName || user.name || 'User'}</Text>
              </Flex>
            </MenuButton>
            <MenuList color="black">
              <MenuItem fontWeight="bold">
                {user.role === 'admin' ? 'Administrator' : user.role === 'regent' ? 'Regent' : 'Member'}
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={signOut}>Sign Out</MenuItem>
            </MenuList>
          </Menu>
        )}
      </Flex>

      {/* Navigation Tabs based on user role */}
      {user && (
        <Tabs
          index={getTabIndex()}
          onChange={handleTabChange}
          variant="enclosed"
          bg="white"
          width="100%"
          colorScheme="red"
          px={4}
        >
          <TabList>
            {user.role === 'admin' && (
              <>
                <Tab as={Link} to="/timer">Timer</Tab>
                <Tab as={Link} to="/set-timer">Set Timer</Tab>
                <Tab as={Link} to="/admin">Admin Panel</Tab>
                <Tab as={Link} to="/dashboard">Dashboard</Tab>
              </>
            )}
            {user.role === 'regent' && (
              <>
                <Tab as={Link} to="/timer">Timer</Tab>
                <Tab as={Link} to="/set-timer">Set Timer</Tab>
                <Tab as={Link} to="/dashboard">Dashboard</Tab>
              </>
            )}
            {user.role === 'user' && (
              <>
                <Tab as={Link} to="/timer">Timer</Tab>
                <Tab as={Link} to="/dashboard">Dashboard</Tab>
              </>
            )}
          </TabList>
        </Tabs>
      )}
    </Flex>
  );
};

export default Navbar; 