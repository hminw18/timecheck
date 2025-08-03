const crypto = require('crypto');
const functions = require('firebase-functions');
const secretManager = require('./secretManager');

// Optimized encryption configuration for production
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16; // Reduced from 32 for better performance
const TAG_LENGTH = 16;
const KEY_ITERATIONS = 1000; // Further reduced for better performance while maintaining security
const KEY_LENGTH = 32;

class SecureEncryption {
  constructor() {
    this.masterKey = null;
    this.keyCache = new Map(); // Cache derived keys for performance
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  // Get or derive the master key (cached for entire process lifetime)
  async getMasterKey() {
    if (!this.masterKey) {
      // Get from Secret Manager only - no fallbacks for production
      const SECRET_KEY = await secretManager.getSecret('encryption-key');
      
      if (!SECRET_KEY || SECRET_KEY.length < 32) {
        throw new Error('Encryption key must be configured in Secret Manager');
      }
      
      // For production, use the secret directly as the master key (already 32+ bytes)
      // This avoids PBKDF2 overhead since Secret Manager already provides secure random keys
      this.masterKey = Buffer.from(SECRET_KEY.slice(0, 32), 'utf8');
    }
    return this.masterKey;
  }

  // Encrypt data with AES-256-GCM (provides both confidentiality and authenticity)
  async encrypt(plaintext, additionalData = '') {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    // Generate random salt and IV for each encryption
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(16);
    
    // Derive a unique key for this encryption using the salt
    // Check cache first for performance
    const cacheKey = `${salt.toString('base64').substring(0, 8)}-${additionalData}`;
    let key = this.keyCache.get(cacheKey);
    
    if (!key) {
      const masterKey = await this.getMasterKey();
      key = crypto.pbkdf2Sync(
        masterKey, 
        salt, 
        KEY_ITERATIONS,
        KEY_LENGTH, 
        'sha256'
      );
      
      // Cache the key with expiry
      this.keyCache.set(cacheKey, key);
      setTimeout(() => this.keyCache.delete(cacheKey), this.cacheTimeout);
    }

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Add additional authenticated data (AAD) if provided
    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData), { plaintextLength: Buffer.byteLength(plaintext) });
    }

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Combine all components into a single string
    // Format: salt:iv:authTag:encrypted:additionalData
    const combined = [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
      Buffer.from(additionalData).toString('base64')
    ].join(':');

    // Skip HMAC for performance - GCM already provides authentication
    // This removes the double authentication overhead
    return combined;
  }

  // Decrypt data
  async decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data');
    }

    // Handle both old format (with HMAC) and new format (without)
    let combined;
    if (encryptedData.includes('$')) {
      // Old format with HMAC
      const [signature, data] = encryptedData.split('$');
      const masterKey = await this.getMasterKey();
      const hmac = crypto.createHmac('sha256', masterKey);
      hmac.update(data);
      const expectedSignature = hmac.digest('base64');
      
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error('Data integrity check failed');
      }
      combined = data;
    } else {
      // New format without HMAC (GCM provides authentication)
      combined = encryptedData;
    }

    // Parse components
    const [saltB64, ivB64, authTagB64, encrypted, additionalDataB64] = combined.split(':');
    if (!saltB64 || !ivB64 || !authTagB64 || !encrypted) {
      throw new Error('Invalid encrypted data components');
    }

    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const additionalData = additionalDataB64 ? Buffer.from(additionalDataB64, 'base64').toString() : '';

    // Derive the key using the salt
    // Check cache first for performance
    const cacheKey = `${salt.toString('base64').substring(0, 8)}-${additionalData}`;
    let key = this.keyCache.get(cacheKey);
    
    if (!key) {
      const masterKey = await this.getMasterKey();
      key = crypto.pbkdf2Sync(
        masterKey, 
        salt, 
        KEY_ITERATIONS,
        KEY_LENGTH, 
        'sha256'
      );
      
      // Cache the key with expiry
      this.keyCache.set(cacheKey, key);
      setTimeout(() => this.keyCache.delete(cacheKey), this.cacheTimeout);
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Set AAD if it was used
    if (additionalData) {
      decipher.setAAD(Buffer.from(additionalData));
    }

    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Encrypt sensitive data with additional context
  async encryptCredentials(credentials, userId) {
    const data = JSON.stringify(credentials);
    const context = `user:${userId}:timestamp:${Date.now()}`;
    return await this.encrypt(data, context);
  }

  // Decrypt credentials
  async decryptCredentials(encryptedData, userId) {
    const decrypted = await this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  // Generate a secure random token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
  }

  // Hash passwords (for any password-like data)
  async hashPassword(password) {
    const salt = crypto.randomBytes(16);
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 10000, 64, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
      });
    });
  }

  // Verify password
  async verifyPassword(password, hash) {
    const [salt, key] = hash.split(':');
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, Buffer.from(salt, 'hex'), 10000, 64, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
      });
    });
  }
}

// Export singleton instance
module.exports = new SecureEncryption();