// Input validation utilities for production security

// Event title validation
export const validateEventTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: '이벤트 제목을 입력해 주세요' };
  }

  const trimmedTitle = title.trim();
  
  // Check length
  if (trimmedTitle.length === 0) {
    return { isValid: false, error: '이벤트 제목을 입력해 주세요' };
  }
  
  if (trimmedTitle.length > 100) {
    return { isValid: false, error: '이벤트 제목은 100자 이하로 입력해 주세요' };
  }

  // Check for potentially malicious patterns
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<img[^>]+onerror/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedTitle)) {
      return { isValid: false, error: '사용할 수 없는 문자가 포함되어 있습니다' };
    }
  }

  return { isValid: true, value: trimmedTitle };
};

// Guest name validation
export const validateGuestName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: '이름을 입력해 주세요' };
  }

  const trimmedName = name.trim();
  
  // Check length
  if (trimmedName.length === 0) {
    return { isValid: false, error: '이름을 입력해 주세요' };
  }
  
  if (trimmedName.length > 50) {
    return { isValid: false, error: '이름은 50자 이하로 입력해 주세요' };
  }

  // Allow various character types including emojis and Chinese characters
  // Instead of whitelist approach, use blacklist for dangerous characters
  const dangerousChars = /[<>\"'`;\\\/\{\}\[\]\(\)]/;
  if (dangerousChars.test(trimmedName)) {
    return { isValid: false, error: '사용할 수 없는 특수문자가 포함되어 있습니다: < > " \' ` ; \\ / { } [ ] ( )' };
  }

  // Check for SQL injection patterns (more lenient now)
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC)\b)/i,
    /--$/,  // Only block -- at the end
    /\/\*.*\*\//  // Block /* */ comments
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(trimmedName)) {
      return { isValid: false, error: '사용할 수 없는 문자가 포함되어 있습니다' };
    }
  }

  return { isValid: true, value: trimmedName };
};

// Apple ID validation
export const validateAppleId = (appleId) => {
  if (!appleId || typeof appleId !== 'string') {
    return { isValid: false, error: 'Apple ID를 입력해 주세요' };
  }

  const trimmedId = appleId.trim();
  
  // Basic email format validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmedId)) {
    return { isValid: false, error: '올바른 이메일 형식이 아닙니다' };
  }

  // Length check
  if (trimmedId.length > 255) {
    return { isValid: false, error: 'Apple ID가 너무 깁니다' };
  }

  return { isValid: true, value: trimmedId };
};

// Password validation (for app-specific passwords)
export const validateAppSpecificPassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: '앱 암호를 입력해 주세요' };
  }

  // Apple app-specific passwords are 16 characters with hyphens
  const cleanPassword = password.replace(/[\s-]/g, '');
  
  if (cleanPassword.length !== 16) {
    return { isValid: false, error: '앱 암호는 16자여야 합니다' };
  }

  // Should only contain letters and numbers
  if (!/^[a-zA-Z0-9]+$/.test(cleanPassword)) {
    return { isValid: false, error: '앱 암호는 문자와 숫자만 포함해야 합니다' };
  }

  return { isValid: true, value: password };
};

// Sanitize HTML to prevent XSS
export const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate time format
export const validateTimeFormat = (time) => {
  if (!time || typeof time !== 'string') {
    return { isValid: false, error: '시간을 선택해 주세요' };
  }

  // Check HH:mm format
  const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timePattern.test(time)) {
    return { isValid: false, error: '올바른 시간 형식이 아닙니다' };
  }

  return { isValid: true, value: time };
};

// Rate limiting helper
export const createRateLimiter = (maxRequests = 10, windowMs = 60000) => {
  const requests = new Map();

  return (userId) => {
    const now = Date.now();
    const userRequests = requests.get(userId) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return { allowed: false, retryAfter: windowMs - (now - validRequests[0]) };
    }

    validRequests.push(now);
    requests.set(userId, validRequests);
    
    return { allowed: true };
  };
};