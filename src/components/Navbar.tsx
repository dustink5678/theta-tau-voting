import React from 'react';
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
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDownIcon } from '@chakra-ui/icons';
import thetaTauLogo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext'; // Import the useAuth hook
import LoadingScreen from './LoadingScreen'; // Import LoadingScreen for initial load

// Remove the PlaceholderUser interface
// interface PlaceholderUser { ... }

const Navbar = () => {
  const { currentUser, signOut, loading } = useAuth(); // Correctly get state from hook
  const navigate = useNavigate();
  const location = useLocation();

  // Correctly derive properties from currentUser
  const isLoggedIn = !!currentUser;
  // Placeholder for admin role check - Replace with actual logic
  const isAdmin = isLoggedIn && currentUser?.email === 'admin@example.com'; 
  const userName = isLoggedIn ? currentUser?.displayName || currentUser?.email || 'User' : 'User';
  const userPhoto = isLoggedIn ? currentUser?.photoURL || undefined : undefined;

  // Determine active tab based on current path
  const getTabIndex = () => {
    if (location.pathname === '/admin/pending') return 1;
    if (location.pathname.startsWith('/admin')) return 0;
    return 0; // Default
  };

  const handleTabsChange = (index: number) => {
    if (index === 0) {
      navigate('/admin'); // Navigate to base admin route
    } else if (index === 1) {
      navigate('/admin/pending'); // Navigate to pending voters
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <Flex
        as="nav"
        width="100%"
        bg="blue.500"
        color="white"
        py={2}
        px={4}
        align="center"
        justify="space-between"
        boxShadow="md"
        minH="56px" // Consistent height during load
      >
         <Flex align="center" mr={5}>
           <img src={thetaTauLogo} alt="Theta Tau Logo" style={{ height: '40px', marginRight: '10px' }} />
           <Text fontSize="lg" fontWeight="bold">
             Theta Tau Voting
           </Text>
         </Flex>
         {/* Minimal content during load */}
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      width="100vw"
      boxShadow="md"
    >
      <Flex
        as="nav"
        width="100%"
        bg="blue.500"
        color="white"
        py={2}
        px={4}
        align="center"
        justify="space-between"
        minH="56px"
      >
        <Flex align="center" mr={5}>
          <img src={thetaTauLogo} alt="Theta Tau Logo" style={{ height: '40px', marginRight: '10px' }} />
          <Text fontSize="lg" fontWeight="bold">
            Theta Tau Voting
          </Text>
        </Flex>

        {isLoggedIn ? (
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              variant="ghost"
              _hover={{ bg: 'blue.600' }}
              _active={{ bg: 'blue.700' }}
            >
              <Flex align="center">
                <Avatar
                  size="sm"
                  name={userName}
                  src={userPhoto}
                  mr={2}
                />
                <Text display={{ base: 'none', md: 'block' }}>
                  {userName}
                </Text>
              </Flex>
            </MenuButton>
            <MenuList bg="white" color="gray.800">
              <MenuItem fontWeight="bold" _hover={{ bg: 'gray.100' }} _focus={{ bg: 'gray.100'}} isDisabled>
                {isAdmin ? 'Administrator' : 'Member'}
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={signOut}>Sign Out</MenuItem> {/* Use signOut from context */}
            </MenuList>
          </Menu>
        ) : (
          <Button as={Link} to="/login" variant="outline" _hover={{ bg: 'blue.600', borderColor: 'white' }}>
            Sign In
          </Button>
        )}
      </Flex>

      {/* Conditionally render Tabs only if user is logged in and admin */}
      {isLoggedIn && isAdmin && (
        <Tabs 
           index={getTabIndex()} 
           onChange={handleTabsChange} 
           variant="soft-rounded" 
           colorScheme="whiteAlpha" 
           bg="blue.500" 
           pb={2} 
           px={4}
        >
          <TabList borderBottom="none"> 
            <Tab _selected={{ color: 'blue.500', bg: 'white' }} color="whiteAlpha.800">Manage Questions</Tab>
            <Tab _selected={{ color: 'blue.500', bg: 'white' }} color="whiteAlpha.800">Pending Voters</Tab>
          </TabList>
        </Tabs>
      )}
    </Flex>
  );
};

export default Navbar; 