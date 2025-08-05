import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle as firebaseSignIn, signInWithApple as firebaseSignInWithApple, handleRedirectResult, logout as firebaseSignOut, db } from '../config/firebase';
import { doc, setDoc, getDoc, deleteField, updateDoc } from 'firebase/firestore';
import appleCalendarService from '../services/appleCalendarService';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

const AuthProviderContent = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [googleAuthError] = useState(null);
  const [appleCalendarConnected, setAppleCalendarConnected] = useState(false);
  const [appleCalendarError, setAppleCalendarError] = useState(null);
  const [appleCalendarUser, setAppleCalendarUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Console statement removed for production
      if (!mounted) return;

      setUser(currentUser);

      if (!currentUser) {
        setIsLoading(false);
        // Clear calendar states when user logs out
        setGoogleUser(null);
        setGoogleToken(null);
        setAppleCalendarConnected(false);
        setAppleCalendarUser(null);
      } else {
        // User logged in, check for stored calendar connections
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Google Calendar connection removed - to be reimplemented

            // Restore Apple Calendar connection
            if (userData.appleCalendar) {
              setAppleCalendarConnected(true);
              setAppleCalendarUser({appleId: userData.appleCalendar.appleId});
            }
          }
        } catch (error) {
          // Console statement removed for production
        }

        if (mounted) {
          setIsLoading(false);
        }
      }
    }, (error) => {
      // Console statement removed for production
      if (mounted) {
        setIsLoading(false);
      }
    });

    // Handle redirect result from Google/Apple sign-in
    handleRedirectResult().then(async (result) => {
      if (result && result.user) {
        setUser(result.user);
        setIsLoading(false);
      }
    }).catch(error => {
      // Console statement removed for production
    });


    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);


  const signIn = async () => {
    try {
      // Console statement removed for production
      // Check if in iframe
      if (window !== window.top) {
        // Console statement removed for production
      }

      setIsLoading(true);
      const result = await firebaseSignIn();
      if (result && result.user) {
        // No need to setIsLoading(false) here, onAuthStateChanged will handle it
      } else {
        // Console statement removed for production
      }
    } catch (error) {
      // Console statement removed for production
      let errorMessage = error.message;
      
      // Only show error for specific cases, ignore cancelled popup
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for sign-in. Please contact the administrator.';
        setAuthError(errorMessage);
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site.';
        setAuthError(errorMessage);
      } else if (error.code === 'auth/cancelled-popup-request') {
        // This can happen when user clicks sign-in multiple times
        // or when the popup is still loading. Don't show error.
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User actually closed the popup
      } else {
        // For other errors, show a generic message
        setAuthError('Sign-in failed. Please try again.');
      }
      
      setIsLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      setIsLoading(true);
      const result = await firebaseSignInWithApple();
      if (result && result.user) {
        // No need to setIsLoading(false) here, onAuthStateChanged will handle it
      }
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      let errorMessage = error.message;
      
      // Handle Apple Sign-In specific errors
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for sign-in. Please contact the administrator.';
        setAuthError(errorMessage);
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site.';
        setAuthError(errorMessage);
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Apple Sign-In is not enabled in Firebase. Please enable it in Firebase Console.';
        setAuthError(errorMessage);
      } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        // For other errors, show more detail
        setAuthError(`Apple sign-in failed: ${error.message}`);
      }
      
      setIsLoading(false);
    }
  };


  const signOut = async () => {
    try {
      await firebaseSignOut();
    } catch (error) {
      // Console statement removed for production
    }
  };

    const connectGoogleCalendar = async () => {
      // Google Calendar connection removed - to be reimplemented
      return { success: false, error: 'Google Calendar integration is being rebuilt' };
    };

    const disconnectGoogleCalendar = async () => {
      // Google Calendar disconnection removed - to be reimplemented
      setGoogleUser(null);
      setGoogleToken(null);
    };

    const connectAppleCalendar = async (appleId, appSpecificPassword) => {
      try {
        const result = await appleCalendarService.connect(appleId, appSpecificPassword);

        if (result.success) {
          // Only store minimal info, not credentials
          const userInfo = {appleId, isConnected: true};
          setAppleCalendarUser(userInfo);
          setAppleCalendarConnected(true);
          setAppleCalendarError(null);

          if (user) {
            await setDoc(doc(db, 'users', user.uid), {
              appleCalendar: {
                appleId,
                connectionId: result.connectionId,
                connectedAt: new Date().toISOString()
              }
            }, {merge: true});
          }

          return {success: true};
        } else {
          setAppleCalendarError(result.error);
          return {success: false, error: result.error};
        }
      } catch (error) {
        const errorMessage = error.message || 'Failed to connect to Apple Calendar';
        setAppleCalendarError(errorMessage);
        return {success: false, error: errorMessage};
      }
    };

    const disconnectAppleCalendar = async () => {
      await appleCalendarService.disconnect();
      setAppleCalendarUser(null);
      setAppleCalendarConnected(false);
      setAppleCalendarError(null);

      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            appleCalendar: deleteField()
          });
        } catch (error) {
          // Console statement removed for production
        }
      }
    };


    const value = {
      user,
      isLoading,
      signIn,
      signInWithApple,
      signOut,
      googleUser,
      googleToken,
      googleAuthError,
      connectGoogleCalendar, // Keep for manual connection
      disconnectGoogleCalendar,
      appleCalendarConnected,
      appleCalendarError,
      appleCalendarUser,
      connectAppleCalendar,
      disconnectAppleCalendar,
      authError,
      setAuthError,
    };

    // Always render children but pass loading state
    return (
        <AuthContext.Provider value={value}>
          {children}
        </AuthContext.Provider>
    );
  };

  export const AuthProvider = ({children}) => {
    return (
        <AuthProviderContent>{children}</AuthProviderContent>
    );
  };