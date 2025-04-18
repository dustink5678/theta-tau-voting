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
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext.tsx';

const Navbar = () => {
  const { currentUser, signOut, loading } = useAuth();

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

        {!loading && currentUser && (
          <Menu>
            <MenuButton 
              as={Button} 
              variant="ghost" 
              color="white" 
              _hover={{ bg: 'red.500' }} 
              _active={{ bg: 'red.500' }}
            >
              <Flex align="center" gap={2}>
                <Avatar size="sm" src={currentUser.photoURL || undefined} name={currentUser.displayName || 'User'} />
                <Text display={{ base: 'none', md: 'block' }}>{currentUser.displayName || 'User'}</Text>
              </Flex>
            </MenuButton>
            <MenuList color="black">
              <MenuItem onClick={signOut}>Sign Out</MenuItem>
            </MenuList>
          </Menu>
        )}
      </Flex>
    </Flex>
  );
};

export default Navbar; 