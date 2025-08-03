/**
 * Secure storage utility for handling sensitive data
 * Replaces direct localStorage usage with more secure alternatives
 */

// Simple encryption for local storage (not production-grade, but better than plain text)
class SecureStorage {
  constructor() {
    this.keyPrefix = 'timecheck_';
    this.sessionOnly = true; // Use sessionStorage by default for better security
  }

  // Generate a simple key for basic obfuscation
  _obfuscateKey(key) {
    return btoa(this.keyPrefix + key).replace(/[+=]/g, '');
  }

  // Simple XOR cipher for basic data obfuscation
  _obfuscateData(data, key) {
    if (!data) return null;
    const keyStr = key.repeat(Math.ceil(data.length / key.length));
    return data.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ keyStr.charCodeAt(i % keyStr.length))
    ).join('');
  }

  _deobfuscateData(data, key) {
    return this._obfuscateData(data, key); // XOR is its own inverse
  }

  // Store data with obfuscation
  setItem(key, value, persistent = false) {
    try {
      const storage = persistent ? localStorage : sessionStorage;
      const obfuscatedKey = this._obfuscateKey(key);
      const serializedValue = JSON.stringify(value);
      const obfuscatedValue = this._obfuscateData(serializedValue, key);
      
      storage.setItem(obfuscatedKey, btoa(obfuscatedValue));
      
      // Set expiration (1 hour for session, 24 hours for persistent)
      const expiration = Date.now() + (persistent ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
      storage.setItem(obfuscatedKey + '_exp', expiration.toString());
      
    } catch (error) {
      // Console statement removed for production
    }
  }

  // Retrieve and de-obfuscate data
  getItem(key, persistent = false) {
    try {
      const storage = persistent ? localStorage : sessionStorage;
      const obfuscatedKey = this._obfuscateKey(key);
      
      // Check expiration
      const expiration = storage.getItem(obfuscatedKey + '_exp');
      if (expiration && Date.now() > parseInt(expiration)) {
        this.removeItem(key, persistent);
        return null;
      }
      
      const obfuscatedValue = storage.getItem(obfuscatedKey);
      if (!obfuscatedValue) return null;
      
      const decodedValue = atob(obfuscatedValue);
      const deobfuscatedValue = this._deobfuscateData(decodedValue, key);
      
      return JSON.parse(deobfuscatedValue);
    } catch (error) {
      // Console statement removed for productionreturn null;
    }
  }

  // Remove item
  removeItem(key, persistent = false) {
    try {
      const storage = persistent ? localStorage : sessionStorage;
      const obfuscatedKey = this._obfuscateKey(key);
      storage.removeItem(obfuscatedKey);
      storage.removeItem(obfuscatedKey + '_exp');
    } catch (error) {
      // Console statement removed for production
    }
  }

  // Clear all app data
  clearAll() {
    try {
      [localStorage, sessionStorage].forEach(storage => {
        const keys = Object.keys(storage);
        keys.forEach(key => {
          if (key.startsWith(btoa(this.keyPrefix).substring(0, 10))) {
            storage.removeItem(key);
          }
        });
      });
    } catch (error) {
      // Console statement removed for production
    }
  }

  // Check if an item exists and is not expired
  hasItem(key, persistent = false) {
    const storage = persistent ? localStorage : sessionStorage;
    const obfuscatedKey = this._obfuscateKey(key);
    
    const expiration = storage.getItem(obfuscatedKey + '_exp');
    if (expiration && Date.now() > parseInt(expiration)) {
      this.removeItem(key, persistent);
      return false;
    }
    
    return storage.getItem(obfuscatedKey) !== null;
  }
}

export default new SecureStorage();