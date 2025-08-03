// CSP Configuration - DEPRECATED
// CSP is now handled by Firebase hosting configuration in firebase.json
// This file is kept for backward compatibility but is no longer used
(function() {
  return; // Early exit - CSP handled by firebase.json
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname.startsWith('192.168.') ||
                       window.location.hostname.startsWith('10.') ||
                       window.location.hostname.startsWith('172.');
  
  // Generate nonce for inline scripts
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  window.CSP_NONCE = nonce;
  
  const cspConfig = {
    development: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:*", "https://apis.google.com", "https://accounts.google.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'img-src': ["'self'", "data:", "https://lh3.googleusercontent.com", "https://*.googleusercontent.com"],
      'connect-src': ["'self'", "http://localhost:*", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com", "https://us-central1-timecheck-40840.cloudfunctions.net", "https://asia-northeast3-timecheck-40840.cloudfunctions.net", "https://firestore.googleapis.com", "https://oauth2.googleapis.com", "ws://localhost:*"],
      'frame-src': ["https://accounts.google.com", "http://localhost:*", "https://timecheck-40840.firebaseapp.com"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    },
    production: {
      'default-src': ["'self'"],
      'script-src': ["'self'", `'nonce-${nonce}'`, "https://apis.google.com", "https://accounts.google.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // MUI requires unsafe-inline for styles
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'img-src': ["'self'", "data:", "https://lh3.googleusercontent.com", "https://*.googleusercontent.com"],
      'connect-src': ["'self'", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com", "https://us-central1-timecheck-40840.cloudfunctions.net", "https://asia-northeast3-timecheck-40840.cloudfunctions.net", "https://firestore.googleapis.com", "https://oauth2.googleapis.com"],
      'frame-src': ["https://accounts.google.com", "https://timecheck-40840.firebaseapp.com"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': [""]
    }
  };
  
  const config = isDevelopment ? cspConfig.development : cspConfig.production;
  
  // Build CSP string
  const cspString = Object.entries(config)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  
  // Apply CSP via meta tag
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = cspString;
  
  // Remove existing CSP meta tag
  const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingCSP) {
    existingCSP.remove();
  }
  
  // Add new CSP
  document.head.appendChild(meta);
})();