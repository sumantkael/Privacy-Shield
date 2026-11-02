/**
 * Privacy Shield - Pattern Detection Engine & Validators
 * High-precision regex definitions and contextual validation routines.
 */

// Luhn Algorithm (Mod 10 Checksum) for Credit Card validation
export function isValidLuhn(numberString) {
  const digits = numberString.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  // Reject all identical digits (e.g., 0000000000000000)
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// IBAN Validation (ISO 7064 Mod 97-10)
export function isValidIBAN(input) {
  const iban = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (iban.length < 15 || iban.length > 34) return false;

  // Move first 4 characters to the end
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numeric = '';
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      numeric += (code - 55).toString();
    } else if (code >= 48 && code <= 57) {
      numeric += rearranged[i];
    } else {
      return false;
    }
  }

  // Modulo 97 on large numbers using chunking
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.substring(i, Math.min(i + 7, numeric.length));
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder === 1;
}

// Known invalid TLDs / code extensions to exclude from emails
const INVALID_EMAIL_TLDS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico',
  'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'json', 'map', 'wasm',
  'lock', 'md', 'html', 'vue', 'py', 'java', 'cpp', 'rs', 'go'
]);

export function isValidEmail(candidate) {
  const match = candidate.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.([a-zA-Z0-9]{2,})$/);
  if (!match) return false;
  const tld = match[1].toLowerCase();
  if (INVALID_EMAIL_TLDS.has(tld)) return false;
  if (/^\d+$/.test(tld)) return false; // Pure number TLD is invalid
  return true;
}

// Phone number contextual validation (avoids dates, IP addresses, versions)
export function isValidPhone(candidate) {
  const clean = candidate.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;

  // Reject 4-4-4 or 4-4-4-4 digit groupings (credit card number segments)
  if (/^\d{4}[\s-]\d{4}[\s-]\d{4}/.test(clean)) return false;

  // Reject date formats (e.g. 2024-05-12 or 12/05/2024)
  if (/^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(candidate.trim())) return false;
  if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(candidate.trim())) return false;

  // Reject IP addresses (e.g. 192.168.1.1)
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate.trim())) return false;

  // Reject version numbers (e.g. 1.2.3.4)
  if (/^(?:\d+\.){2,}\d+$/.test(candidate.trim())) return false;

  // Must contain recognizable phone structure (e.g. '+', '(', or spaces/dashes)
  if (!/[+()\s-]/.test(candidate) && digits.length < 10) return false;

  // Reject repeated single digits (e.g. 000-000-0000)
  if (/^(\d)\1+$/.test(digits)) return false;

  return true;
}

/**
 * Master Pattern Definitions
 */
export const PATTERNS = {
  // Email Addresses
  email: {
    id: 'email',
    name: 'Email Addresses',
    badge: 'Email',
    regex: /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g,
    validate: (val) => isValidEmail(val)
  },

  // Credit & Debit Card Numbers
  creditCard: {
    id: 'creditCard',
    name: 'Payment Cards',
    badge: 'Card',
    // Matches 13-19 digit card numbers separated by spaces or dashes
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    validate: (val) => {
      const clean = val.replace(/\D/g, '');
      if (clean.length < 13 || clean.length > 19) return false;
      return isValidLuhn(clean);
    }
  },

  // API Keys and Developer Secrets
  apiKey: {
    id: 'apiKey',
    name: 'API Keys & Secrets',
    badge: 'Key',
    patterns: [
      // OpenAI API Keys
      { name: 'OpenAI', regex: /\b(?:sk-[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9_-]{40,}|sk-admin-[a-zA-Z0-9_-]{40,})\b/g },
      // AWS Access Key ID
      { name: 'AWS', regex: /\b(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g },
      // GitHub Tokens
      { name: 'GitHub', regex: /\b(?:ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{60,})\b/g },
      // Slack Tokens
      { name: 'Slack', regex: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g },
      // Stripe Keys
      { name: 'Stripe', regex: /\b(?:sk|pk|rk)_(?:test|live)_[0-9a-zA-Z]{24,}\b/g },
      // Google API Key
      { name: 'Google', regex: /\bAIza[0-9A-Za-z-_]{35}\b/g },
      // Generic Private Keys / Bearer Token Assignment
      { name: 'GenericKey', regex: /(?:api[_-]?key|secret[_-]?token|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi }
    ]
  },

  // Authentication Tokens & JWTs
  authToken: {
    id: 'authToken',
    name: 'Auth Tokens & JWT',
    badge: 'Token',
    patterns: [
      // JWT Token
      { name: 'JWT', regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
      // Bearer Auth Token
      { name: 'Bearer', regex: /\bBearer\s+([a-zA-Z0-9._\-]{24,})\b/gi }
    ]
  },

  // Phone Numbers
  phone: {
    id: 'phone',
    name: 'Phone Numbers',
    badge: 'Phone',
    // International & local format bounded by non-digits
    regex: /(?<!\d)(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,5}(?!\d)/g,
    validate: (val) => isValidPhone(val)
  },

  // OTPs & 2FA Codes
  otp: {
    id: 'otp',
    name: 'OTPs & 2FA Codes',
    badge: 'OTP',
    // Requires keyword context near 4-8 digit numbers (supports "is", ":", "-", etc.)
    regex: /(?:otp|one-time|code|verification|passcode|2fa|pin)[\s:#=-]*(?:is\s+)?\b(\d{4,8})\b/gi,
    isContextual: true
  },

  // Bank Account Numbers & IBANs
  bankAccount: {
    id: 'bankAccount',
    name: 'Bank & IBAN Accounts',
    badge: 'Bank',
    patterns: [
      // IBAN pattern
      {
        name: 'IBAN',
        regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
        validate: (val) => isValidIBAN(val)
      },
      // Routing / Account contextual numbers
      {
        name: 'RoutingOrAccount',
        regex: /(?:routing|aba|sort\s*code|bank\s*acc(?:t|ount)?|account\s*(?:no|num|number)?|iban)[\s:#=-]*\b([0-9]{8,17}|[0-9]{2}-[0-9]{2}-[0-9]{2})\b/gi
      }
    ]
  },

  // Personal Addresses & Government IDs (SSN)
  personalInfo: {
    id: 'personalInfo',
    name: 'Addresses & SSN',
    badge: 'Personal',
    patterns: [
      // US Social Security Number (SSN)
      {
        name: 'SSN',
        regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g
      },
      // Physical street address format
      {
        name: 'Address',
        regex: /\b\d{1,5}\s+(?:[A-Z][a-zA-Z0-9#\.\-]+\s+){1,4}(?:Street|St\b|Avenue|Ave\b|Boulevard|Blvd\b|Road|Rd\b|Drive|Dr\b|Lane|Ln\b|Way\b|Court|Ct\b|Circle|Cir\b|Highway|Hwy\b|Parkway|Pkwy\b|Terrace|Ter\b|Place|Pl\b|Square|Sq\b|Suite|Ste\b|Apt\b|Apartment)\.?\b/g
      }
    ]
  }
};
