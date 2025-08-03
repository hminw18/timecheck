import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import googleCalendarService from '../services/googleCalendarService';

const GoogleOAuthContext = createContext();

export const useGoogleOAuth = () => {
  const context = useContext(GoogleOAuthContext);
  if (!context) {
    throw new Error('useGoogleOAuth must be used within GoogleOAuthProvider');
  }
  return context;
};

export const GoogleOAuthProvider = ({ children }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const googleClientRef = useRef(null);

  // Initialize Google OAuth client
  useEffect(() => {
    if (!window.google || !user) return;

    try {
      googleClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        ux_mode: 'popup',
        callback: handleAuthorizationResponse,
      });
    } catch (error) {
      setError('Failed to initialize Google authentication');
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle authorization response
  const handleAuthorizationResponse = useCallback(async (response) => {
    // Clear the popup check interval since we got a response
    if (window.__googleOAuthPopupInterval) {
      clearInterval(window.__googleOAuthPopupInterval);
      window.__googleOAuthPopupInterval = null;
    }
    
    if (response.error) {
      setError(response.error_description || 'Authorization failed');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Exchange authorization code for tokens
      const result = await googleCalendarService.exchangeCode(response.code);
      
      if (result.success) {
        // Connection successful - tokens are stored in backend
        setIsConnected(true);
        // Redirect with success parameter
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('google_connected', 'true');
        window.history.replaceState({}, '', currentUrl.toString());
        // Force a reload to trigger the URL parameter check
        window.location.reload();
      } else {
        setError(result.error || 'Failed to exchange authorization code');
      }
    } catch (error) {
      setError('Failed to complete authorization');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // Connect to Google Calendar
  const connect = useCallback(() => {
    if (!googleClientRef.current) {
      setError('Google OAuth not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Store the original window.open function
      const originalOpen = window.open;
      let popupWindow = null;
      let popupCheckInterval = null;
      
      // Override window.open to capture the popup window reference
      window.open = function(...args) {
        popupWindow = originalOpen.apply(window, args);
        
        // Start checking if popup is closed
        if (popupWindow && !popupCheckInterval) {
          popupCheckInterval = setInterval(() => {
            if (popupWindow.closed) {
              clearInterval(popupCheckInterval);
              
              // Reset loading state only if still loading
              setTimeout(() => {
                setIsLoading((currentLoading) => {
                  if (currentLoading) {
                    return false;
                  }
                  return currentLoading;
                });
              }, 500); // Small delay to ensure no response is coming
            }
          }, 500); // Check every 500ms
        }
        
        return popupWindow;
      };
      
      // Request authorization code
      googleClientRef.current.requestCode();
      
      // Restore original window.open after a short delay
      setTimeout(() => {
        window.open = originalOpen;
      }, 1000);
      
      // Store interval ID to clear it when we get a response
      window.__googleOAuthPopupInterval = popupCheckInterval;
    } catch (error) {
      setError('Failed to open authorization window');
      setIsLoading(false);
    }
  }, []);

  // Disconnect from Google Calendar
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      await googleCalendarService.disconnect();
      
      // Clear connection state
      setIsConnected(false);
    } catch (error) {
      setError('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check connection status function
  const checkConnectionStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const status = await googleCalendarService.checkConnectionStatus();
      setIsConnected(status.connected);
    } catch (error) {
      // Silently fail status check
    }
  }, [user]);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);


  const value = {
    isLoading,
    error,
    isConnected,
    isConnecting: isLoading,
    connect,
    disconnect,
    checkConnectionStatus,
  };

  return (
    <GoogleOAuthContext.Provider value={value}>
      {children}
    </GoogleOAuthContext.Provider>
  );
};