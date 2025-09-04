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
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current path
  const tabIndex = location.pathname === '/dashboard' ? 1 : 0;

  const handleTabChange = (index: number) => {
    if (index === 0) {
      navigate('/admin'); // Changed from '/dashboard'
    } else {
      navigate('/dashboard'); // Changed from '/admin'
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

      {/* Navigation Tabs for Admin and Regent Users */}
      {user && (user.role === 'admin' || user.role === 'regent') && (
        <Tabs 
          index={tabIndex} 
          onChange={handleTabChange} 
          variant="enclosed" 
          bg="white" 
          width="100%" 
          colorScheme="red"
          px={4}
        >
          <TabList>
            <Tab>Admin Panel</Tab>
            <Tab>Voting</Tab>
          </TabList>
        </Tabs>
      )}
    </Flex>
  );
};

export default Navbar; 