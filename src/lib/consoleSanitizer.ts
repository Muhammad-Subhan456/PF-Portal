// Console sanitizer - filters sensitive information in production
// This prevents exposing sheet URLs, API keys, and other sensitive data

const isProduction = import.meta.env.PROD;

// Patterns to detect and sanitize sensitive data
const SENSITIVE_PATTERNS = [
  /spreadsheets\.google\.com/i, // Google Sheets URLs
  /docs\.google\.com\/spreadsheets/i, // Google Sheets URLs
  /sheet[_-]?id/i, // Sheet IDs
  /api[_-]?key/i, // API keys
  /secret/i, // Secrets
  /password/i, // Passwords
  /token/i, // Tokens
  /auth/i, // Auth tokens
  /supabase\.co/i, // Supabase URLs (might contain project refs)
  /service[_-]?account/i, // Service account info
  /private[_-]?key/i, // Private keys
  /bearer\s+/i, // Bearer tokens
  /authorization/i, // Authorization headers
  /x-api-key/i, // API key headers
  /client[_-]?secret/i, // Client secrets
  /access[_-]?token/i, // Access tokens
  /refresh[_-]?token/i, // Refresh tokens
];

// Additional patterns for API calls and responses
const API_PATTERNS = [
  /fetch/i,
  /axios/i,
  /request/i,
  /response/i,
  /api[\/\s]/i,
  /endpoint/i,
  /url/i,
];

/**
 * Sanitize a value by replacing sensitive patterns
 */
function sanitizeValue(value: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[Max Depth Reached]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings
  if (typeof value === 'string') {
    let sanitized = value;
    
    // Always sanitize URLs
    sanitized = sanitized.replace(
      /https?:\/\/[^\s\)]+/gi,
      (url) => {
        if (/spreadsheets|docs\.google/i.test(url)) {
          return '[Google Sheet URL - Hidden]';
        }
        if (/supabase\.co/i.test(url)) {
          return '[Supabase URL - Hidden]';
        }
        if (/api/i.test(url)) {
          return '[API URL - Hidden]';
        }
        return '[URL - Hidden]';
      }
    );

    // Check for sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '[Sensitive Data - Hidden]');
      }
    }
    
    return sanitized;
  }

  // Handle objects
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(v => sanitizeValue(v, depth + 1));
    }
    
    // Check if it's a Request/Response object or similar
    if (value instanceof Request || value instanceof Response || value instanceof Error) {
      return '[API Object - Hidden]';
    }
    
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      const keyLower = key.toLowerCase();
      
      // Skip sensitive keys entirely or sanitize their values
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        sanitized[key] = '[Hidden]';
      } else if (API_PATTERNS.some(pattern => pattern.test(key)) && typeof val === 'string') {
        // Sanitize API-related string values
        sanitized[key] = sanitizeValue(val, depth + 1);
      } else if (keyLower === 'url' || keyLower === 'endpoint' || keyLower === 'href') {
        // Always sanitize URLs
        sanitized[key] = typeof val === 'string' ? sanitizeValue(val, depth + 1) : '[Hidden]';
      } else {
        sanitized[key] = sanitizeValue(val, depth + 1);
      }
    }
    return sanitized;
  }

  return value;
}

/**
 * Sanitize console arguments
 */
function sanitizeArgs(args: any[]): any[] {
  if (!isProduction) {
    return args; // Don't sanitize in development
  }
  return args.map(sanitizeValue);
}

/**
 * Initialize console sanitizer
 * Call this early in the app lifecycle
 */
export function initConsoleSanitizer() {
  // Allow disabling sanitizer via environment variable for debugging
  const disableSanitizer = import.meta.env.VITE_DISABLE_CONSOLE_SANITIZER === 'true';
  
  if (!isProduction || disableSanitizer) {
    return; // Don't sanitize in development or if explicitly disabled
  }

  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  const originalTable = console.table;
  const originalDir = console.dir;
  const originalGroup = console.group;
  const originalGroupEnd = console.groupEnd;

  // Override console methods
  console.log = (...args: any[]) => {
    originalLog(...sanitizeArgs(args));
  };

  console.error = (...args: any[]) => {
    originalError(...sanitizeArgs(args));
  };

  console.warn = (...args: any[]) => {
    originalWarn(...sanitizeArgs(args));
  };

  console.info = (...args: any[]) => {
    originalInfo(...sanitizeArgs(args));
  };

  console.debug = (...args: any[]) => {
    originalDebug(...sanitizeArgs(args));
  };

  console.table = (data?: any, columns?: string[]) => {
    if (data) {
      originalTable(sanitizeValue(data), columns);
    } else {
      originalTable(data, columns);
    }
  };

  console.dir = (obj?: any, options?: any) => {
    if (obj) {
      originalDir(sanitizeValue(obj), options);
    } else {
      originalDir(obj, options);
    }
  };

  console.group = (...args: any[]) => {
    originalGroup(...sanitizeArgs(args));
  };

  console.groupEnd = () => {
    originalGroupEnd();
  };

  // Also intercept fetch API calls in production
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = async (...args: any[]) => {
      // Don't log fetch calls in production
      return originalFetch(...args);
    };
  }
}
