import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkGoogleAvailability, initializeGoogleIdentityServices } from '../services/auth';

interface GoogleOneTapProps {
  onSuccess?: (user: any) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  autoInit?: boolean;
}

/**
 * Google One Tap Component
 * Provides a clean interface for Google One Tap authentication
 * Automatically handles FedCM, cross-browser compatibility, and progressive enhancement
 */
const GoogleOneTap: React.FC<GoogleOneTapProps> = ({
  onSuccess,
  onError,
  disabled = false,
  autoInit = true
}) => {
  const { user, initializeOneTap } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Initialize One Tap when component mounts
  useEffect(() => {
    if (!autoInit || disabled || user || isInitialized) {
      return;
    }

    const initOneTap = async () => {
      try {
        // Wait a bit for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if Google Identity Services is available
        if (!checkGoogleAvailability()) {
          console.log('Google Identity Services not available for One Tap');
          return;
        }

        // Initialize Google Identity Services if needed
        await initializeGoogleIdentityServices();
        
        // Try to initialize One Tap
        const success = await initializeOneTap();
        
        if (success) {
          setIsVisible(true);
          console.log('Google One Tap initialized successfully');
          
          if (onSuccess) {
            // Note: The actual success callback will be handled by the auth context
            // This is just to notify the parent component that One Tap is active
          }
        } else {
          console.log('Google One Tap not displayed (normal - may not be needed)');
        }
        
        setIsInitialized(true);
      } catch (error: any) {
        console.log('Google One Tap initialization failed:', error);
        setIsInitialized(true);
        
        if (onError) {
          onError(error);
        }
      }
    };

    initOneTap();
  }, [autoInit, disabled, user, isInitialized, initializeOneTap, onSuccess, onError]);

  // Listen for user changes to handle success
  useEffect(() => {
    if (user && isVisible && onSuccess) {
      onSuccess(user);
      setIsVisible(false);
    }
  }, [user, isVisible, onSuccess]);

  // This component doesn't render any visible UI
  // Google One Tap shows its own browser-managed UI
  return null;
};

export default GoogleOneTap; 