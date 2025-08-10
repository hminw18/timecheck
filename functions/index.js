const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ICAL = require("ical.js");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const secureEncryption = require("./encryption");
const secretManager = require("./secretManager");
const {OAuth2Client} = require("google-auth-library");
const {google} = require("googleapis");

// Check if tsdav is properly loaded
let createDAVClient;
let davRequest;
try {
  const tsdav = require("tsdav");
  createDAVClient = tsdav.createDAVClient;
  davRequest = tsdav.davRequest;
  // Console statement removed for production
} catch (error) {
  // Console statement removed for production
}

admin.initializeApp();
const db = admin.firestore();

// Set Firestore settings to avoid issues
db.settings({ ignoreUndefinedProperties: true });

// In-memory access token cache
const accessTokenCache = new Map(); // uid -> {token, expiry}

// Apple Calendar DAV client cache (singleton pattern)
const davClientCache = new Map(); // userId -> {client, lastUsed, credentials}
const DAV_CLIENT_TTL = 30 * 60 * 1000; // 30 minutes
const DAV_CLIENT_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Cleanup old DAV clients periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, cache] of davClientCache.entries()) {
    if (now - cache.lastUsed > DAV_CLIENT_TTL) {
      davClientCache.delete(userId);
    }
  }
}, DAV_CLIENT_CLEANUP_INTERVAL);

// Rate limiting for authentication attempts
const authAttempts = new Map(); // key -> {count, firstAttempt, blocked}
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 30;
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour

// Check rate limit
async function checkRateLimit(key, action = 'auth') {
  const now = Date.now();
  // Sanitize key to prevent injection
  const sanitizedKey = key.replace(/[^a-zA-Z0-9:.-]/g, '_');
  const attemptKey = `${action}:${sanitizedKey}`;
  
  // Check Firestore for distributed rate limiting
  const rateLimitDoc = await db.collection('rate_limits').doc(attemptKey).get();
  
  if (rateLimitDoc.exists) {
    const data = rateLimitDoc.data();
    
    // Check if blocked
    if (data.blocked && data.blockedUntil > now) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Too many attempts. Please try again after ${new Date(data.blockedUntil).toLocaleString()}`
      );
    }
    
    // Check attempt count within window
    if (data.firstAttempt > now - RATE_LIMIT_WINDOW) {
      if (data.count >= MAX_ATTEMPTS) {
        // Block the user
        await rateLimitDoc.ref.update({
          blocked: true,
          blockedUntil: now + BLOCK_DURATION
        });
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many attempts. You have been temporarily blocked.'
        );
      }
      
      // Increment count
      await rateLimitDoc.ref.update({
        count: admin.firestore.FieldValue.increment(1),
        lastAttempt: now
      });
    } else {
      // Reset window
      await rateLimitDoc.ref.set({
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      });
    }
  } else {
    // First attempt
    await db.collection('rate_limits').doc(attemptKey).set({
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false
    });
  }
}

// Use secure encryption for all operations
async function encrypt(text, context = '') {
  return await secureEncryption.encrypt(text, context);
}

async function decrypt(encryptedData) {
  return await secureEncryption.decrypt(encryptedData);
}

const APPLE_CALDAV_URL = "https://caldav.icloud.com";

// CSRF token storage using Firestore for production
// Collection: csrf_tokens
// Document ID: token value
// Fields: uid, expiry, createdAt

// Generate CSRF token for Apple Calendar connection
exports.generateAppleCalendarToken = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const cookieToken = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  
  // Create a hash of both tokens for server-side validation
  const tokenHash = crypto.createHash('sha256')
    .update(token + cookieToken)
    .digest('hex');
  
  // Store token hash in Firestore with cookie token
  await db.collection('csrf_tokens').doc(tokenHash).set({
    uid: context.auth.uid,
    expiry: expiry,
    cookieToken: cookieToken, // Store for validation
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Clean up expired tokens (run periodically, not on every request)
  // This could be moved to a scheduled function for better performance
  const now = Date.now();
  const expiredTokensQuery = await db.collection('csrf_tokens')
    .where('expiry', '<', now)
    .limit(10) // Limit cleanup to avoid timeout
    .get();
  
  const deleteBatch = db.batch();
  expiredTokensQuery.forEach(doc => {
    deleteBatch.delete(doc.ref);
  });
  await deleteBatch.commit();
  
  return {
    token,
    cookieToken, // Return cookie token to be set by client
    endpoint: `https://asia-northeast3-timecheck-40840.cloudfunctions.net/appleCalendarConnectForm`,
    expiry
  };
});

// Helper function to get real client IP
function getRealClientIP(req) {
  // Firebase/Google Cloud Functions specific headers
  // Firebase uses Fastly CDN which provides reliable headers
  const fastlyClientIP = req.headers['fastly-client-ip'];
  if (fastlyClientIP) {
    return fastlyClientIP;
  }
  
  // For Google Cloud Load Balancer, use the original IP
  // X-Forwarded-For format: "client, proxy1, proxy2"
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // Take the first IP (original client)
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }
  
  // Fallback to direct connection
  return req.connection.remoteAddress || req.socket.remoteAddress;
}

// Helper function to check if request is HTTPS
function isSecureRequest(req) {
  // In Firebase Functions, check multiple indicators
  // 1. Firebase hosting always uses HTTPS in production
  if (req.headers['x-appengine-https'] === 'on') {
    return true;
  }
  
  // 2. Check original protocol (more reliable than x-forwarded-proto)
  if (req.headers['x-forwarded-proto'] === 'https') {
    // Only trust if it's from a known proxy
    const via = req.headers['via'];
    if (via && (via.includes('google') || via.includes('Firebase'))) {
      return true;
    }
  }
  
  // 3. Direct HTTPS connection
  return req.secure || req.protocol === 'https';
}

// Apple Calendar connection via direct HTTP POST (not callable)
exports.appleCalendarConnectForm = functions.region('asia-northeast3').https.onRequest(async (req, res) => {
  // Parse cookies
  cookieParser()(req, res, () => {});
  // Enforce HTTPS (except for localhost development)
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || origin.includes('localhost');
  
  if (!isLocalhost && !origin.startsWith('https://')) {
    res.status(403).json({ error: 'HTTPS required for secure credential transmission' });
    return;
  }
  
  // Validate request is coming from HTTPS using secure method
  if (!isLocalhost && !isSecureRequest(req)) {
    res.status(403).json({ error: 'HTTPS required' });
    return;
  }
  
  // Set CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'https://timecheck-40840.web.app', 'https://timecheck-40840.firebaseapp.com', 'https://timecheck.app'];
  
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  
  // Security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  // Enhanced HSTS with preload
  res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests");
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  try {
    const { appleId, appSpecificPassword, csrfToken } = req.body;
    const csrfCookie = req.cookies ? req.cookies['csrf-token'] : null;
    
    // Rate limiting by real client IP
    const clientIp = getRealClientIP(req);
    try {
      await checkRateLimit(clientIp, 'apple-connect');
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        res.status(429).json({ error: error.message });
        return;
      }
    }
    
    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const appPasswordRegex = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i;
    
    if (!emailRegex.test(appleId)) {
      res.status(400).json({ error: '잘못된 Apple ID 형식입니다. 올바른 이메일 주소를 입력해주세요.' });
      return;
    }
    
    if (!appPasswordRegex.test(appSpecificPassword)) {
      res.status(400).json({ error: '잘못된 앱 암호 형식입니다. (형식: xxxx-xxxx-xxxx-xxxx)' });
      return;
    }
    
    // Validate CSRF token
    if (!csrfToken) {
      res.status(403).json({ error: '보안 토큰이 누락되었습니다. 다시 시도해주세요.' });
      return;
    }
    
    // For cross-domain form submission, we'll validate just the token
    // Look up token directly in Firestore
    const tokenQuery = await db.collection('csrf_tokens')
      .where('expiry', '>', Date.now())
      .get();
    
    let tokenDoc = null;
    let tokenData = null;
    
    // Find matching token
    for (const doc of tokenQuery.docs) {
      const data = doc.data();
      // Check if this token matches (we stored the hash with both tokens)
      const expectedHash = crypto.createHash('sha256')
        .update(csrfToken + data.cookieToken)
        .digest('hex');
      
      if (doc.id === expectedHash) {
        tokenDoc = doc;
        tokenData = data;
        break;
      }
    }
    
    if (!tokenDoc) {
      res.status(403).json({ error: '보안 토큰이 만료되었습니다. 다시 시도해주세요.' });
      return;
    }
    
    if (tokenData.expiry < Date.now()) {
      // Delete expired token
      await tokenDoc.ref.delete();
      res.status(403).json({ error: '보안 토큰이 만료되었습니다. 다시 시도해주세요.' });
      return;
    }
    
    // Don't delete token here - only delete on success
    const userId = tokenData.uid;
    
    if (!appleId || !appSpecificPassword) {
      res.status(400).json({ error: 'Apple ID와 앱 암호를 모두 입력해주세요.' });
      return;
    }

    if (!createDAVClient) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Test connection using singleton pattern
    let client;
    const tempCacheKey = `temp_${appleId}_${Date.now()}`;
    
    // For form submission, create temporary client with shorter timeout
    const https = require('https');
    const agent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 10000,
      maxSockets: 5,
      maxFreeSockets: 2,
      timeout: 10000 // 10 seconds timeout
    });
    
    try {
      client = await createDAVClient({
        serverUrl: APPLE_CALDAV_URL,
        credentials: {
          username: appleId,
          password: appSpecificPassword,
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
        timeout: 10000, // 10 seconds timeout
        httpAgent: agent,
        httpsAgent: agent
      });

      // Set a timeout for fetchCalendars
      const calendarsPromise = client.fetchCalendars();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('401')), 10000)
      );
      
      const calendars = await Promise.race([calendarsPromise, timeoutPromise]);
    } catch (davError) {
      // If authentication fails, it will throw immediately
      if (davError.message && (davError.message.includes('401') || davError.message.includes('Unauthorized'))) {
        res.status(401).json({ error: '잘못된 Apple ID 또는 앱 암호입니다. 다시 확인해주세요.' });
        return;
      }
      throw davError;
    }
    
    // Generate a unique connection ID
    const connectionId = `apple_${userId}_${Date.now()}`;
    
    // Store encrypted credentials in Firestore
    const encryptedPassword = await encrypt(appSpecificPassword, `apple:${userId}`);
    await db.collection('apple_credentials').doc(userId).set({
      connectionId,
      appleId,
      encryptedPassword,
      createdAt: new Date(),
      lastUsed: new Date()
    });
    
    // Also update user document for frontend to detect connection
    await db.collection('users').doc(userId).set({
      appleCalendar: {
        appleId,
        connected: true,
        connectedAt: new Date()
      }
    }, { merge: true });

    // Delete the CSRF token only on success
    if (tokenDoc) {
      await tokenDoc.ref.delete();
    }
    
    // Set security headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    
    // Return success JSON instead of redirect for CORS compatibility
    res.status(200).json({ success: true, message: 'Apple Calendar 연동이 완료되었습니다.' });
    
  } catch (error) {
    
    let errorMessage = 'Apple Calendar 연결에 실패했습니다. 다시 시도해주세요.';
    
    if (error.message && error.message.includes("401")) {
      errorMessage = '잘못된 Apple ID 또는 앱 암호입니다. 다시 확인해주세요.';
    }
    
    // Return JSON error for authentication errors
    res.status(401).json({ error: errorMessage });
  }
});

exports.appleCalendarConnect = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  // Clean up DAV cache on each request
  cleanupDavClientCache();
  
  try {
    const { appleId, appSpecificPassword } = data;

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    
    // Rate limiting by user ID
    await checkRateLimit(context.auth.uid, 'apple-connect');

    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const appPasswordRegex = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i;
    
    if (!appleId || !appSpecificPassword) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Apple ID and app-specific password are required"
      );
    }
    
    if (!emailRegex.test(appleId)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid Apple ID format. Please enter a valid email address."
      );
    }
    
    if (!appPasswordRegex.test(appSpecificPassword)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid app-specific password format. Expected format: xxxx-xxxx-xxxx-xxxx"
      );
    }

    if (!createDAVClient) {
      throw new functions.https.HttpsError(
        "internal",
        "tsdav library not loaded properly"
      );
    }

    // Use singleton pattern for connection test
    let client;
    const cacheKey = context.auth.uid;
    const cachedClient = davClientCache.get(cacheKey);
    const passwordHash = crypto.createHash('sha256').update(appSpecificPassword).digest('hex');
    
    if (cachedClient && 
        cachedClient.credentials.appleId === appleId &&
        cachedClient.credentials.passwordHash === passwordHash) {
      // Reuse existing client for test
      client = cachedClient.client;
      cachedClient.lastUsed = Date.now();
    } else {
      // Create new client with keep-alive for test
      const https = require('https');
      const agent = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 5,
        maxFreeSockets: 2,
        timeout: 60000
      });
      
      client = await createDAVClient({
        serverUrl: APPLE_CALDAV_URL,
        credentials: {
          username: appleId,
          password: appSpecificPassword,
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
        timeout: 30000,
        httpAgent: agent,
        httpsAgent: agent
      });
      
      // Cache the client
      davClientCache.set(cacheKey, {
        client,
        lastUsed: Date.now(),
        credentials: {
          appleId: appleId,
          passwordHash: passwordHash
        }
      });
    }

    // Test connection by fetching calendars
    const calendars = await client.fetchCalendars();
    
    // Generate a unique connection ID
    const connectionId = `apple_${context.auth.uid}_${Date.now()}`;
    
    // Store encrypted credentials in Firestore with user context
    const encryptedPassword = await encrypt(appSpecificPassword, `apple:${context.auth.uid}`);
    await db.collection('apple_credentials').doc(context.auth.uid).set({
      connectionId,
      appleId,
      encryptedPassword,
      createdAt: new Date(),
      lastUsed: new Date()
    });

    return {
      success: true,
      connectionId,
      calendarsCount: calendars.length,
    };
  } catch (error) {
    // Console statement removed for production
    
    // Check for specific error types but return generic messages
    if (error.message && error.message.includes("401")) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Invalid credentials"
      );
    }
    
    if (error.message && error.message.includes("homeUrl")) {
      throw new functions.https.HttpsError(
        "internal",
        "Connection failed. Please check your credentials and try again."
      );
    }

    if (error.message && (error.message.includes("timeout") || error.message.includes("network"))) {
      throw new functions.https.HttpsError(
        "internal",
        "Network error. Please try again."
      );
    }
    
    // Generic error message
    throw new functions.https.HttpsError(
      "internal",
      "Connection failed. Please try again."
    );
  }
});

exports.appleCalendarGetEvents = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  const startTime = Date.now();
  // Function called
  
  try {
    const { startDate, endDate } = data;

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!startDate || !endDate) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Start and end dates are required"
      );
    }

    // Retrieve encrypted credentials from Firestore
    const firestoreStart = Date.now();
    // Fetching Apple credentials
    const credDoc = await db.collection('apple_credentials').doc(context.auth.uid).get();
    // Credentials lookup completed
    
    if (!credDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Apple Calendar credentials not found. Please connect first."
      );
    }

    const credData = credDoc.data();
    // Decrypt password - handles both old and new formats
    const decryptStart = Date.now();
    const decryptedPassword = await decrypt(credData.encryptedPassword);
    // Password decrypted

    // Update last used timestamp
    await credDoc.ref.update({
      lastUsed: new Date()
    });

    // Check DAV client cache first
    let client;
    const cacheKey = context.auth.uid;
    const cachedClient = davClientCache.get(cacheKey);
    
    if (cachedClient && 
        cachedClient.credentials.appleId === credData.appleId &&
        cachedClient.credentials.passwordHash === crypto.createHash('sha256').update(decryptedPassword).digest('hex')) {
      // Reuse existing client
      client = cachedClient.client;
      cachedClient.lastUsed = Date.now();
    } else {
      // Create new client with keep-alive
      const clientStartTime = Date.now();
      const https = require('https');
      const agent = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 5,
        maxFreeSockets: 2,
        timeout: 60000
      });
      
      client = await createDAVClient({
        serverUrl: APPLE_CALDAV_URL,
        credentials: {
          username: credData.appleId,
          password: decryptedPassword,
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
        httpAgent: agent,
        httpsAgent: agent
      });
      
      // Cache the client
      davClientCache.set(cacheKey, {
        client,
        lastUsed: Date.now(),
        credentials: {
          appleId: credData.appleId,
          passwordHash: crypto.createHash('sha256').update(decryptedPassword).digest('hex')
        }
      });
      
      // DAV client created in ${Date.now() - clientStartTime}ms
    }

    const fetchCalendarsStart = Date.now();
    const calendars = await client.fetchCalendars();
    // Calendars fetched
    
    // Fetch events from all calendars in parallel using fetchCalendarObjects
    const calendarPromises = calendars.map(async (calendar) => {
      const calendarStartTime = Date.now();
      try {
        const fetchStart = Date.now();
        const calendarEvents = await client.fetchCalendarObjects({
          calendar: calendar,
          timeRange: {
            start: startDate,
            end: endDate,
          },
        });
        // Calendar objects fetched

        const parsedEvents = [];
        const parseStart = Date.now();
        
        for (const obj of calendarEvents) {
          try {
            // Parse the raw iCalendar data
            if (obj.data && typeof obj.data === 'string') {
              const jcalData = ICAL.parse(obj.data);
              const comp = new ICAL.Component(jcalData);
              
              // Get both events and todos
              const vevents = comp.getAllSubcomponents('vevent');
              const vtodos = comp.getAllSubcomponents('vtodo');
              
              // Process regular events
              for (const vevent of vevents) {
                const event = new ICAL.Event(vevent);

                // Check if event falls within our time range
                const eventStart = event.startDate.toJSDate();
                const eventEnd = event.endDate.toJSDate();
                
                // For recurring events, we need to check occurrences
                if (event.isRecurring()) {
                  // Get the recurrence rule
                  const rruleProp = vevent.getFirstProperty('rrule');
                  const rruleValue = rruleProp ? rruleProp.getFirstValue() : null;
                  const rruleString = rruleValue ? rruleValue.toString() : null;
                  
                  const iterator = event.iterator();
                  let next;
                  while ((next = iterator.next())) {
                    const occurrenceStart = next.toJSDate();
                    if (occurrenceStart > new Date(endDate)) break;
                    if (occurrenceStart >= new Date(startDate)) {
                      const duration = event.duration;
                      const occurrenceEnd = new Date(occurrenceStart.getTime() + duration.toSeconds() * 1000);
                      
                      parsedEvents.push({
                        id: event.uid + '_' + occurrenceStart.toISOString(),
                        summary: event.summary || "Untitled Event",
                        start: occurrenceStart.toISOString(),
                        end: occurrenceEnd.toISOString(),
                        isAllDay: event.startDate.isDate,
                        status: vevent.getFirstPropertyValue('status') || 'CONFIRMED',
                        transparency: vevent.getFirstPropertyValue('transp') || 'OPAQUE',
                        isRecurring: true,
                        recurrenceRule: rruleString
                      });
                    }
                  }
                } else {
                  // Non-recurring event
                  if (eventStart <= new Date(endDate) && eventEnd >= new Date(startDate)) {
                    parsedEvents.push({
                      id: event.uid,
                      summary: event.summary || "Untitled Event",
                      start: eventStart.toISOString(),
                      end: eventEnd.toISOString(),
                      isAllDay: event.startDate.isDate,
                      status: vevent.getFirstPropertyValue('status') || 'CONFIRMED',
                      transparency: vevent.getFirstPropertyValue('transp') || 'OPAQUE',
                      isRecurring: false,
                      recurrenceRule: null
                    });
                  }
                }
              }
              
              // Process todos (reminders)
              for (const vtodo of vtodos) {
                try {
                  // Get todo properties
                  const uid = vtodo.getFirstPropertyValue('uid');
                  const summary = vtodo.getFirstPropertyValue('summary') || 'Untitled Reminder';
                  const dueProp = vtodo.getFirstProperty('due');
                  const completedProp = vtodo.getFirstProperty('completed');
                  const status = vtodo.getFirstPropertyValue('status');
                  
                  // Skip completed todos
                  if (status === 'COMPLETED' || completedProp) {
                    continue;
                  }
                  
                  if (dueProp) {
                    const dueTime = dueProp.getFirstValue();
                    const dueDate = dueTime.toJSDate();
                    
                    // Check if todo falls within our time range
                    if (dueDate >= new Date(startDate) && dueDate <= new Date(endDate)) {
                      // Create a 1-hour block for the reminder
                      const reminderStart = dueDate;
                      const reminderEnd = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour later
                      
                      parsedEvents.push({
                        id: uid,
                        summary: `📌 ${summary}`,
                        start: reminderStart.toISOString(),
                        end: reminderEnd.toISOString(),
                        isAllDay: dueTime.isDate,
                        status: status || 'NEEDS-ACTION',
                        transparency: 'TRANSPARENT',
                        isRecurring: false,
                        recurrenceRule: null,
                        isTodo: true
                      });
                    }
                  }
                } catch (error) {
                  // Error parsing todo
                }
              }
            }
          } catch (error) {
            // Error parsing event
          }
        }
        
        // Events parsed
        return parsedEvents;
      } catch (error) {
        // Error fetching calendar
        return [];
      }
    });
    
    // Use Promise.allSettled for better error handling and parallel processing
    const allCalendarResults = await Promise.allSettled(calendarPromises);
    
    // Process results and collect successful calendar events
    const events = allCalendarResults
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value || []);

    // Events processing completed
    console.log('[getGoogleCalendarEvents] Final events count:', events.length);
    
    return { events };
  } catch (error) {
    
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to fetch calendar events"
    );
  }
});

// Exchange authorization code for tokens
exports.googleCalendarExchangeCode = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    
    // Rate limiting by user ID
    await checkRateLimit(context.auth.uid, 'google-connect');

    const { code } = data;
    if (!code) {
      throw new functions.https.HttpsError("invalid-argument", "Authorization code required");
    }

    // Exchange code for tokens
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || functions.config().google?.client_id;
    const CLIENT_SECRET = await secretManager.getSecret('google-client-secret');
    const REDIRECT_URI = 'postmessage'; // For popup mode

    const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new functions.https.HttpsError("failed-precondition", "No refresh token received");
    }

    // Encrypt and store refresh token
    const encryptedRefreshToken = await encrypt(tokens.refresh_token, `google:${context.auth.uid}`);
    await db.collection('google_credentials').doc(context.auth.uid).set({
      encryptedRefreshToken,
      hasRefreshToken: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });

    // Store access token in cache (backend only)
    accessTokenCache.set(context.auth.uid, {
      token: tokens.access_token,
      expiry: Date.now() + (tokens.expiry_date || 3600 * 1000)
    });

    // BFF Pattern: Don't return access token to frontend
    return {
      success: true,
      connected: true
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Authentication failed. Please try again.");
  }
});

// Helper function to get valid access token with better error handling
async function getValidAccessToken(userId) {
  try {
    // Check memory cache first
    const cached = accessTokenCache.get(userId);
    if (cached && Date.now() < cached.expiry - 60000) { // 1 minute buffer
      console.log('[getValidAccessToken] Using cached token for user:', userId);
      return cached.token;
    }

    // Get refresh token from Firestore
    const credDoc = await db.collection('google_credentials').doc(userId).get();
    if (!credDoc.exists || !credDoc.data().encryptedRefreshToken) {
      console.error('[getValidAccessToken] No refresh token found for user:', userId);
      throw new functions.https.HttpsError("failed-precondition", "No refresh token found. Please complete OAuth setup.");
    }

    const decryptedRefreshToken = await decrypt(credDoc.data().encryptedRefreshToken);
    
    // Get OAuth config
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || functions.config().google?.client_id;
    const CLIENT_SECRET = await secretManager.getSecret('google-client-secret');
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('[getValidAccessToken] Missing OAuth configuration');
      throw new functions.https.HttpsError("internal", "OAuth configuration error");
    }
    
    const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: decryptedRefreshToken });
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        console.error('[getValidAccessToken] No access token in refresh response');
        throw new Error('Failed to obtain access token');
      }
      
      // Cache the new access token
      accessTokenCache.set(userId, {
        token: credentials.access_token,
        expiry: credentials.expiry_date || Date.now() + 3600 * 1000
      });
      
      console.log('[getValidAccessToken] Successfully refreshed token for user:', userId);
    
    // Update last used timestamp
    await credDoc.ref.update({
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });
      return credentials.access_token;
    } catch (error) {
      console.error('[getValidAccessToken] Token refresh error:', error.message);
      
      if (error.message?.includes('invalid_grant')) {
        // Delete invalid credentials
        await credDoc.ref.delete();
        accessTokenCache.delete(userId);
        throw new functions.https.HttpsError(
          "unauthenticated", 
          "Google Calendar 연동이 만료되었습니다. 다시 연동해주세요."
        );
      }
      
      // Generic token refresh error
      throw new functions.https.HttpsError(
        "internal",
        "Failed to refresh access token. Please try again."
      );
    }
  } catch (outerError) {
    console.error('[getValidAccessToken] Unexpected error:', outerError);
    throw new functions.https.HttpsError(
      "internal",
      "Authentication error. Please try reconnecting."
    );
  }
}

// Refresh access token
exports.googleCalendarRefreshToken = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get stored refresh token
    const credDoc = await db.collection('google_credentials').doc(context.auth.uid).get();
    if (!credDoc.exists) {
      throw new functions.https.HttpsError("not-found", "No Google Calendar connection found");
    }

    const decryptedRefreshToken = await decrypt(credDoc.data().encryptedRefreshToken);
    
    // Get OAuth config
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || functions.config().google?.client_id;
    const CLIENT_SECRET = await secretManager.getSecret('google-client-secret');
    
    const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: decryptedRefreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Cache the new access token
    accessTokenCache.set(context.auth.uid, {
      token: credentials.access_token,
      expiry: credentials.expiry_date || Date.now() + 3600 * 1000
    });
    
    // Update last used timestamp
    await credDoc.ref.update({
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // BFF Pattern: Don't return access token to frontend
    return {
      success: true,
      tokenRefreshed: true
    };
  } catch (error) {
    if (error.message?.includes('invalid_grant')) {
      // Delete invalid credentials
      await db.collection('google_credentials').doc(context.auth.uid).delete();
      accessTokenCache.delete(context.auth.uid);
      throw new functions.https.HttpsError(
        "unauthenticated", 
        "Google Calendar connection expired. Please reconnect."
      );
    }
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Token refresh failed. Please reconnect.");
  }
});

// Check connection status
exports.googleCalendarCheckStatus = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check if refresh token exists
    const credDoc = await db.collection('google_credentials').doc(context.auth.uid).get();
    if (!credDoc.exists) {
      return { connected: false };
    }

    // Check cached access token (backend only)
    const cached = accessTokenCache.get(context.auth.uid);
    const hasValidToken = cached && Date.now() < cached.expiry - 60000;
    
    // BFF Pattern: Don't expose token details
    return { 
      connected: true,
      tokenValid: hasValidToken
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Status check failed.");
  }
});

// Disconnect Google Calendar
exports.googleCalendarDisconnect = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Delete stored credentials
    await db.collection('google_credentials').doc(context.auth.uid).delete();
    
    // Clear cache
    accessTokenCache.delete(context.auth.uid);
    
    // Google Calendar disconnected
    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Disconnection failed. Please try again.");
  }
});

// DEPRECATED - Remove after migration
exports.googleCalendarStoreRefreshToken = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const { refreshToken } = data;
    if (!refreshToken) {
      throw new functions.https.HttpsError("invalid-argument", "Refresh token required");
    }

    // Encrypt and store refresh token
    // Encrypting refresh token
    const encryptedRefreshToken = await encrypt(refreshToken, `google:${context.auth.uid}`);
    
    // Storing encrypted credentials
    await db.collection('google_credentials').doc(context.auth.uid).set({
      encryptedRefreshToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });
    // Credentials stored

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to save credentials. Please try again.");
  }
});

// Original Google Calendar auth function (kept for backward compatibility)
exports.googleCalendarAuth = functions
  .region('asia-northeast3')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'  // Increased memory for better performance
  })
  .https.onCall(async (data, context) => {
  // googleCalendarAuth called
  
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    
    // Rate limiting by user ID
    await checkRateLimit(context.auth.uid, 'google-auth');

    const { code } = data;
    
    if (!code) {
      throw new functions.https.HttpsError("invalid-argument", "Authorization code is required");
    }

    // Google Client ID from environment variable (public info)
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || functions.config().google?.client_id;

    
    if (!CLIENT_ID) {

      throw new functions.https.HttpsError("failed-precondition", "Google Client ID not configured");
    }
    
    // Client Secret from Secret Manager (sensitive)
    let CLIENT_SECRET;
    try {
      CLIENT_SECRET = await secretManager.getSecret('google-client-secret');



    } catch (error) {

      throw new functions.https.HttpsError("failed-precondition", "Google OAuth secret not configured in Secret Manager");
    }
    
    const REDIRECT_URI = 'postmessage'; // Standard for Google Sign-In

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();

      throw new functions.https.HttpsError("internal", `Failed to exchange authorization code: ${error}`);
    }

    const tokens = await tokenResponse.json();
    
    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new functions.https.HttpsError("internal", "Failed to fetch user info");
    }

    const userInfo = await userInfoResponse.json();

    // Store encrypted refresh token in Firestore
    if (tokens.refresh_token) {
      // Encrypting refresh token
      const encryptedRefreshToken = await encrypt(tokens.refresh_token, `google:${context.auth.uid}`);
      
      // Storing encrypted credentials
      await db.collection('google_credentials').doc(context.auth.uid).set({
        encryptedRefreshToken,
        userInfo,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
      });
      // Credentials stored
    } else {
      // This might happen if user has already authorized the app
      // Check if we already have stored credentials
      const existingCreds = await db.collection('google_credentials').doc(context.auth.uid).get();
      if (!existingCreds.exists) {
        throw new functions.https.HttpsError(
          "failed-precondition", 
          "No refresh token received. Please disconnect and reconnect Google Calendar."
        );
      }
    }


    // BFF Pattern: Don't return access token to frontend
    return {
      success: true,
      userInfo
    };
  } catch (error) {
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Authentication failed. Please try again.");
  }
});

// Google Calendar refresh token function
exports.googleCalendarRefresh = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Retrieve encrypted refresh token from Firestore
    const credDoc = await db.collection('google_credentials').doc(context.auth.uid).get();
    
    if (!credDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Google Calendar not connected");
    }

    const credData = credDoc.data();
    const decryptedRefreshToken = await decrypt(credData.encryptedRefreshToken);

    // Google Client ID from environment variable (public info)
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || functions.config().google?.client_id;

    
    if (!CLIENT_ID) {

      throw new functions.https.HttpsError("failed-precondition", "Google Client ID not configured");
    }
    
    // Client Secret from Secret Manager (sensitive)
    let CLIENT_SECRET;
    try {
      CLIENT_SECRET = await secretManager.getSecret('google-client-secret');

    } catch (error) {

      throw new functions.https.HttpsError("failed-precondition", "Google OAuth secret not configured in Secret Manager");
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new functions.https.HttpsError("failed-precondition", "Google OAuth not configured");
    }

    // Refresh the token
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: decryptedRefreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const error = await refreshResponse.text();
      // Console statement removed for production
    
    throw new functions.https.HttpsError("internal", "Failed to refresh token");
    }

    const tokens = await refreshResponse.json();

    // Update last used timestamp
    await credDoc.ref.update({
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });

    // BFF Pattern: Don't return access token to frontend
    return {
      success: true
    };
  } catch (error) {
    // Console statement removed for production
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Token refresh failed. Please reconnect.");
  }
});

// Google Calendar disconnect function (duplicate - DEPRECATED)
exports.googleCalendarDisconnectOld = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Delete encrypted credentials from Firestore
    await db.collection('google_credentials').doc(context.auth.uid).delete();

    return { success: true };
  } catch (error) {
    // Console statement removed for production
    
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to disconnect Google Calendar"
    );
  }
});

// Get Google Calendar events using backend proxy pattern (secure)
exports.getGoogleCalendarEvents = functions
  .region('asia-northeast3')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    console.log('[getGoogleCalendarEvents] Function called with data:', JSON.stringify(data));
    
  try {
    // Verify user is authenticated
    if (!context.auth) {
      console.log('[getGoogleCalendarEvents] No auth context');
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    console.log('[getGoogleCalendarEvents] User ID:', context.auth.uid);

    const { startDate, endDate, eventType, startTime, endTime, selectedDays } = data;
    if (!startDate || !endDate) {
      console.log('[getGoogleCalendarEvents] Missing dates');
      throw new functions.https.HttpsError("invalid-argument", "Start date and end date are required");
    }
    
    console.log('[getGoogleCalendarEvents] Parameters:', {
      startDate,
      endDate,
      eventType,
      startTime,
      endTime,
      selectedDays
    });
    
    // Get valid access token using refresh token from Firestore
    console.log('[getGoogleCalendarEvents] Getting access token for user:', context.auth.uid);
    const accessToken = await getValidAccessToken(context.auth.uid);
    console.log('[getGoogleCalendarEvents] Access token obtained:', accessToken ? 'Yes' : 'No');
    
    // Use direct Google API client with access token
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const calendar = google.calendar({version: 'v3', auth: oauth2Client});

    // Exponential backoff helper
    const withExponentialBackoff = async (fn, maxRetries = 3) => {
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          // Only retry on quota errors (403) or rate limit errors (429)
          if (error.code === 403 || error.code === 429) {
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000; // 1s, 2s, 4s + jitter
            // Rate limited, retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    };

    // Fetch calendar events with exponential backoff
    try {
      const timeMin = new Date(startDate).toISOString();
      const timeMax = new Date(endDate).toISOString();
      console.log('[getGoogleCalendarEvents] Fetching events from Google Calendar:', {
        timeMin,
        timeMax
      });
      
      const response = await withExponentialBackoff(async () => {
        return await calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin,
          timeMax: timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
          fields: 'items(id,summary,start,end,status,transparency,recurringEventId)'
        });
      });
      
      console.log('[getGoogleCalendarEvents] Google Calendar API response:', {
        itemsCount: response.data.items ? response.data.items.length : 0,
        hasItems: !!response.data.items
      });
      
      // Process events
      let events = (response.data.items || []).map(event => ({
        id: event.id,
        title: event.summary || 'Untitled',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        isAllDay: !event.start.dateTime,
        status: event.status,
        transparency: event.transparency || 'opaque',
        isRecurring: !!event.recurringEventId,
      }));

      console.log('[getGoogleCalendarEvents] Raw events count:', events.length);
      if (events.length > 0) {
        console.log('[getGoogleCalendarEvents] Sample event:', JSON.stringify(events[0]));
      }
      
      // Filter events based on eventType and selectedDays on the backend
      if (eventType === 'day' && selectedDays && selectedDays.length > 0) {
        const beforeCount = events.length;
        console.log('[getGoogleCalendarEvents] Filtering for day-based events. Selected days:', selectedDays);
        events = events.filter(event => {
          // For day-based events, only include recurring events
          if (!event.isRecurring) {
            console.log(`[getGoogleCalendarEvents] Non-recurring event excluded: ${event.title}`);
            return false;
          }
          
          const eventDate = new Date(event.start);
          const dayIndex = eventDate.getDay();
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayNames[dayIndex];
          const isIncluded = selectedDays.includes(dayName);
          if (!isIncluded && events.length < 10) { // Log only first few exclusions
            console.log(`[getGoogleCalendarEvents] Event on ${dayName} (${event.start}) excluded`);
          }
          return isIncluded;
        });
        console.log(`[getGoogleCalendarEvents] Day filter applied: ${beforeCount} -> ${events.length}`);
      }

      // Filter by time range if provided
      if (startTime && endTime && eventType !== 'day') {
        const beforeCount = events.length;
        console.log('[getGoogleCalendarEvents] Filtering by time range:', { startTime, endTime });
        events = events.filter(event => {
          // For all-day events, include them by default
          if (event.isAllDay) {
            // Including all-day event
            return true;
          }
          
          // Parse event time - extract hours/minutes from the original timezone string
          // Event.start is in format "2025-07-28T11:00:00+09:00"
          let hours, minutes;
          
          // Check if the date string contains timezone info (has + or - for timezone offset)
          if (event.start.includes('T') && (event.start.includes('+') || event.start.includes('-'))) {
            // Extract time from the ISO string directly without timezone conversion
            const timeMatch = event.start.match(/T(\d{2}):(\d{2})/);
            if (timeMatch) {
              hours = parseInt(timeMatch[1], 10);
              minutes = parseInt(timeMatch[2], 10);
            } else {
              // Fallback to Date parsing
              const eventStartTime = new Date(event.start);
              hours = eventStartTime.getHours();
              minutes = eventStartTime.getMinutes();
            }
          } else {
            // For dates without timezone, use regular Date parsing
            const eventStartTime = new Date(event.start);
            hours = eventStartTime.getHours();
            minutes = eventStartTime.getMinutes();
          }
          
          const eventTimeMinutes = hours * 60 + minutes;
          
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          const startTimeMinutes = startHour * 60 + startMinute;
          const endTimeMinutes = endHour * 60 + endMinute;
          
          // Check if event overlaps with the time range
          let eventEndHours, eventEndMinutes;
          
          // Parse end time the same way
          if (event.end.includes('T') && (event.end.includes('+') || event.end.includes('-'))) {
            const endTimeMatch = event.end.match(/T(\d{2}):(\d{2})/);
            if (endTimeMatch) {
              eventEndHours = parseInt(endTimeMatch[1], 10);
              eventEndMinutes = parseInt(endTimeMatch[2], 10);
            } else {
              const eventEndTime = new Date(event.end);
              eventEndHours = eventEndTime.getHours();
              eventEndMinutes = eventEndTime.getMinutes();
            }
          } else {
            const eventEndTime = new Date(event.end);
            eventEndHours = eventEndTime.getHours();
            eventEndMinutes = eventEndTime.getMinutes();
          }
          
          const eventEndTimeMinutes = eventEndHours * 60 + eventEndMinutes;
          
          // Debug log for all events
          // Event time validation
          
          // Handle events that cross midnight
          let overlaps;
          if (eventEndTimeMinutes < eventTimeMinutes) {
            // Event crosses midnight (e.g., 23:00 to 00:00)
            // Event crosses midnight
            // Check if any part of the event falls within the time range
            overlaps = (eventTimeMinutes < endTimeMinutes) || (eventEndTimeMinutes > startTimeMinutes);
          } else {
            // Normal event
            // Event overlaps if it starts before range ends AND ends after range starts
            overlaps = eventTimeMinutes < endTimeMinutes && eventEndTimeMinutes > startTimeMinutes;
          }
          
          // Event filtering result
          
          return overlaps;
        });
        // Time filter applied
      }

      // Filtering completed
      return { events };
    } catch (calendarError) {
      
      if (calendarError.code === 401) {
        // Token might be expired, clear from cache and throw error
        accessTokenCache.delete(context.auth.uid);
        throw new functions.https.HttpsError(
          "unauthenticated", 
          "Google Calendar 인증이 만료되었습니다. 다시 시도해주세요."
        );
      }
      
      throw calendarError;
    }
    
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to fetch events. Please try again.");
  }
});

// New function to disconnect Apple Calendar
exports.appleCalendarDisconnect = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Delete encrypted credentials from Firestore
    await db.collection('apple_credentials').doc(context.auth.uid).delete();
    
    // Remove cached DAV client
    davClientCache.delete(context.auth.uid);
    
    // Also remove from user document
    await db.collection('users').doc(context.auth.uid).update({
      appleCalendar: admin.firestore.FieldValue.delete()
    });

    return { success: true };
  } catch (error) {
    // Console statement removed for production
    
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to disconnect Apple Calendar"
    );
  }
});

// Get fresh access token using stored refresh token
exports.googleCalendarGetAccessToken = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  // googleCalendarGetAccessToken called
  
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get stored credentials
    // Fetching Google credentials
    const credDoc = await db.collection('google_credentials').doc(context.auth.uid).get();
    if (!credDoc.exists) {
      // No Google credentials found
      throw new functions.https.HttpsError("not-found", "Google Calendar not connected");
    }

    const credData = credDoc.data();
    // Decrypting refresh token
    const decryptedRefreshToken = await decrypt(credData.encryptedRefreshToken);

    // Get secrets
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || functions.config().google?.client_id;
    let CLIENT_SECRET;
    try {
      CLIENT_SECRET = await secretManager.getSecret('google-client-secret');
    } catch (error) {
      throw new functions.https.HttpsError("failed-precondition", "Google OAuth secret not configured");
    }

    // Refreshing access token
    
    // Use OAuth2Client to refresh the token
    const oauth2Client = new OAuth2Client(
      CLIENT_ID,
      CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      refresh_token: decryptedRefreshToken
    });
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      // Access token refreshed
      
      // Update last used timestamp
      await credDoc.ref.update({
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // BFF Pattern: Don't return access token to frontend
      return {
        success: true,
        tokenRefreshed: true
      };
    } catch (refreshError) {
      
      if (refreshError.message?.includes('invalid_grant')) {
        // Refresh token is invalid or expired
        // Delete the invalid credentials
        await credDoc.ref.delete();
        throw new functions.https.HttpsError(
          "unauthenticated", 
          "Google Calendar 연동이 만료되었습니다. 다시 연동해주세요."
        );
      }
      
      throw new functions.https.HttpsError("internal", refreshError.message || "Failed to refresh token");
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Authentication failed. Please reconnect.");
  }
});
