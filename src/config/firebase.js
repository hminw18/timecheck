import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, connectAuthEmulator, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'asia-northeast3');

// Set auth persistence to local storage
// For iOS Safari, we need to ensure persistence is set before any auth operations
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    // Silently handle persistence errors
  });

// Connect to emulators based on environment variable
if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  } catch (error) {
    // Already connected
  }
  
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    // Already connected
  }
  
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    // Already connected
  }
}


// Create Google provider for sign-in
const createGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
};

const signInWithGoogle = async () => {
  try {
    const provider = createGoogleProvider();
    
    const result = await signInWithPopup(auth, provider);
    
    // Get the OAuth Access Token (not used in this context)
    // const credential = GoogleAuthProvider.credentialFromResult(result);
    // credential?.accessToken;
    
    // Google sign-in successful
    return { 
      user: result.user
    };
  } catch (error) {
    throw error;
  }
};

const signInWithApple = async () => {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    // Set custom parameters for Apple
    provider.setCustomParameters({
      // Locale
      locale: 'ko_KR',
    });
    
    const result = await signInWithPopup(auth, provider);
    
    // Apple sign-in successful
    return { 
      user: result.user
    };
  } catch (error) {
    console.error('Firebase Apple Sign-In Error:', error);
    throw error;
  }
};


// Handle redirect result on page load
const handleRedirectResult = async () => {
  try {
    // Checking for redirect result
    
    // Check if we were redirected from sign-in
    const wasRedirected = sessionStorage.getItem('google-signin-redirect');
    // sessionStorage.getItem('google-signin-timestamp'); // Not used in this context
    
    if (wasRedirected) {
      // Was redirected from sign-in
      sessionStorage.removeItem('google-signin-redirect');
      sessionStorage.removeItem('google-signin-timestamp');
    }
    
    const result = await getRedirectResult(auth);
    if (result) {
      // Get the OAuth Access Token (not used in this context)
      // const credential = GoogleAuthProvider.credentialFromResult(result);
      // credential?.accessToken;
      
      // Redirect sign-in successful
      return { 
        user: result.user
      };
    } else {
      // No redirect result found
    }
  } catch (error) {
    // Error handling redirect result
  }
  return null;
};

const logout = () => {
  signOut(auth);
};

export { app, auth, db, functions, signInWithGoogle, signInWithApple, handleRedirectResult, logout };
