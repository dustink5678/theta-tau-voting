import { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, microsoftProvider, db } from '../../services/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  OAuthProvider,
  browserSessionPersistence,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import LogoWhiteTransparent from '../../assets/Logo-white-tparent.png';
import * as amplitude from '@amplitude/analytics-browser';

// Detect if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const createUserDocument = async (user) => {
  if (!user) {
    console.log('No user provided');
    return;
  }
  
  const userRef = doc(db, 'users', user.uid);
  const userData = {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLogin: serverTimestamp(),
    createdAt: serverTimestamp(),
    subscription: {
      status: 'inactive',
      priceId: null,
      currentPeriodEnd: null,
      trial: {
        used: false,
        uploadCount: 0
      }
    }
  };

  try {
    await setDoc(userRef, userData, { merge: true });
    await checkUserSubscription(user);
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

const checkUserSubscription = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  return userDoc.data();
};

const Auth = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null
  });

  // Set up appropriate auth persistence on component mount
  useEffect(() => {
    const setupPersistence = async () => {
      try {
        // Use local persistence for better reliability across mobile/desktop
        await setPersistence(auth, browserLocalPersistence);
        console.log("Using local persistence");
      } catch (error) {
        console.error("Error setting persistence:", error);
      }
    };
    
    setupPersistence();
  }, []);

  useEffect(() => {
    let isMounted = true;

    // First, check for redirect result
    getRedirectResult(auth)
      .then(result => {
        if (result?.user && isMounted) {
          const currentUser = result.user;
          return createUserDocument(currentUser)
            .then(() => checkUserSubscription(currentUser))
            .then(() => {
              const provider = result.providerId === 'google.com' ? 'google' : 'microsoft';
              amplitude.track('Logged In', { 
                method: provider,
              });
              amplitude.identify(new amplitude.Identify()
                .set('userId', currentUser.uid)  // Fixed to use currentUser instead of user
                .set('email', currentUser.email)
                .set('loginMethod', provider)
              );
              setState({
                user: currentUser,
                loading: false,
                error: null
              });
            });
        }
      })
      .catch(error => {
        console.error('Redirect result error:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: 'Unable to sign in. Please try again.',
            loading: false
          }));
        }
      });

    // Then set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (user) {
        try {
          await createUserDocument(user);
          await checkUserSubscription(user);
          setState({
            user,
            loading: false,
            error: null
          });
        } catch (error) {
          console.error('Error in auth state change:', error);
          setState({
            user: null,
            loading: false,
            error: error.message
          });
        }
      } else {
        setState({
          user: null,
          loading: false,
          error: null
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSignIn = async (provider) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const authProvider = provider === 'google' ? googleProvider : microsoftProvider;
      
      // On mobile, directly use redirect to avoid popup issues
      if (isMobile) {
        await signInWithRedirect(auth, authProvider);
        return;
      }
      
      // On desktop, try popup first
      try {
        const result = await signInWithPopup(auth, authProvider);
        const user = result.user;
        amplitude.track('Logged In', { 
          method: provider,
        });
        amplitude.identify(new amplitude.Identify()
          .set('userId', user.uid)
          .set('email', user.email)
          .set('loginMethod', provider)
        );
      } catch (popupError) {
        console.log('Popup error:', popupError.code);
        // Handle specific popup errors
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, authProvider);
          return; // Return here as redirect will reload the page
        }
        throw popupError;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setState(prev => ({
        ...prev,
        error: 'Unable to sign in. Please try again.',
        loading: false
      }));
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (state.user) {
    return <AuthContext.Provider value={{ ...state }}>{children}</AuthContext.Provider>;
  }

  // console.log('Rendering login screen');
  amplitude.track('Login Options Viewed', {
  login_options: ["google connect", "microsoft connect"]
  });
  return (
    <AuthContext.Provider value={{ ...state }}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950">
        <div className="relative flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-12 text-center">
            {/* Logo and Title */}
            <div>
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 inline-block mb-8">
                <img 
                  src={LogoWhiteTransparent} 
                  alt="UpAhead Logo" 
                  className="h-20 w-auto"
                />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Organize your semester in seconds</h2>
              <p className="mt-2 text-lg text-blue-200">Transforming syllabi for smarter studying</p>
            </div>

            {/* Sign In Button */}
            <div className="mt-8 space-y-4">
              {state.error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-200 text-center">{state.error}</p>
                </div>
              )}
              
              <button
                onClick={() => handleSignIn('google')}
                disabled={state.loading}
                className="w-full flex items-center justify-center gap-3 
                  bg-white/10 hover:bg-white/20 text-white
                  rounded-xl px-6 py-4 text-lg font-medium
                  backdrop-blur-lg transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border border-white/20"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                  className="w-6 h-6"
                />
                <span>Continue with Google</span>
              </button>

              <button
                onClick={() => handleSignIn('microsoft')}
                disabled={state.loading}
                className="w-full flex items-center justify-center gap-3 
                  bg-white/10 hover:bg-white/20 text-white
                  rounded-xl px-6 py-4 text-lg font-medium
                  backdrop-blur-lg transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border border-white/20"
              >
                <img
                  src="https://www.microsoft.com/favicon.ico"
                  alt="Microsoft logo"
                  className="w-6 h-6"
                />
                <span>Continue with Microsoft</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthContext.Provider>
  );
};

export default Auth; 