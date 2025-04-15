import { useEffect, useState } from 'react';
import { checkRedirectResult } from '../services/auth';
import LoadingScreen from './LoadingScreen';
import { useNavigate } from 'react-router-dom';

// This component handles the authentication redirect flow
// Place it at the top level of your app to ensure auth state is properly captured
const AuthHandler = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      // Check if we're returning from a redirect authentication flow
      const redirectSuccess = localStorage.getItem('authRedirectSuccess') === 'true';
      const authError = localStorage.getItem('authError');
      
      if (redirectSuccess || authError) {
        console.log('Returning from redirect authentication flow');
        // Clear the status flags
        localStorage.removeItem('authRedirectSuccess');
        localStorage.removeItem('authError');
        
        // Let the page know we've handled the redirect result
        window.sessionStorage.setItem('authRedirectHandled', 'true');
        setChecking(false);
        return;
      }
      
      // Check if we already processed this redirect
      if (window.sessionStorage.getItem('authRedirectHandled') === 'true') {
        console.log('Redirect already handled in this session');
        setChecking(false);
        return;
      }
      
      try {
        // Check for a redirect result from Firebase
        const result = await checkRedirectResult();
        if (result) {
          console.log('Processed redirect result successfully');
          // Store in session storage that we've handled the redirect
          window.sessionStorage.setItem('authRedirectHandled', 'true');
        }
      } catch (err) {
        console.error('Error processing redirect result:', err);
        setError(err.message);
      } finally {
        setChecking(false);
      }
    };

    // Check for URL auth error parameter (from our auth.html page)
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get('auth_error');
    
    if (urlError) {
      console.error('Authentication error from URL:', urlError);
      setError(urlError);
      // Remove the query parameter
      navigate(window.location.pathname, { replace: true });
    }
    
    handleRedirect();
  }, [navigate]);

  // While checking for redirect result, show loading screen
  if (checking) {
    return <LoadingScreen />;
  }

  // If there was an error, we could show it or just continue rendering the app
  // Here we're just logging it and continuing
  if (error) {
    console.warn('Authentication error occurred:', error);
    // You could add UI for showing the error here if desired
  }

  // Return the app's children once we've processed any redirect result
  return children;
};

export default AuthHandler; 