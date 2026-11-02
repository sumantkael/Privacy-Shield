/**
 * Privacy Shield - Default Configuration & Settings Model
 */

export const DEFAULT_CONFIG = {
  // Global Protection Switch
  enabled: true,

  // Reveal Behavior
  revealOnHover: false,
  revealOnClick: true,
  reblurTimeout: 4000, // Re-blur after 4 seconds of inactivity
  allowPinReveal: true, // Allow user to pin an element revealed

  // Visual Blur
  blurRadius: 6, // px

  // Detection Categories (all enabled by default)
  categories: {
    email: true,
    password: true,
    creditCard: true,
    apiKey: true,
    authToken: true,
    phone: true,
    otp: true,
    bankAccount: true,
    personalInfo: true
  },

  // Website Exclusions (domains where Privacy Shield is disabled)
  excludedDomains: [],

  // Performance & Scanning
  debounceDelay: 250, // ms for DOM mutation batching
  maxScanDepth: 50,

  // Styling & Typography
  fontChoice: 'geist', // 'geist' | 'manrope'

  // Internal Version
  version: '1.0.0'
};

// Input element selectors corresponding to sensitive categories
export const SENSITIVE_INPUT_SELECTORS = [
  // Password inputs (always protected)
  'input[type="password"]',
  'input[autocomplete*="password" i]',
  'input[name*="password" i]',
  'input[name*="passwd" i]',
  'input[name*="pwd" i]',
  'input[id*="password" i]',

  // Credit card inputs
  'input[autocomplete*="cc-number" i]',
  'input[autocomplete*="card-number" i]',
  'input[name*="creditcard" i]',
  'input[name*="cardnumber" i]',
  'input[name*="card_num" i]',
  'input[id*="cardnumber" i]',

  // Credit card security codes (CVV/CVC)
  'input[autocomplete*="cc-csc" i]',
  'input[name*="cvv" i]',
  'input[name*="cvc" i]',
  'input[id*="cvv" i]',

  // Social Security / National ID
  'input[name*="ssn" i]',
  'input[name*="social_security" i]',
  'input[id*="ssn" i]',

  // OTP / Verification Code inputs
  'input[autocomplete*="one-time-code" i]',
  'input[name*="otp" i]',
  'input[name*="2fa" i]',
  'input[name*="verification_code" i]',
  'input[id*="otp" i]'
];

// Helper to test if a hostname matches any excluded domain (supports subdomains & wildcards)
export function isDomainExcluded(hostname, excludedDomains = []) {
  if (!hostname || !Array.isArray(excludedDomains)) return false;
  const cleanHost = hostname.toLowerCase().trim();

  return excludedDomains.some(entry => {
    if (!entry) return false;
    let pattern = entry.toLowerCase().trim();

    // Exact match
    if (cleanHost === pattern) return true;

    // Wildcard match (e.g. *.example.com or example.com covers sub.example.com)
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.slice(2);
      return cleanHost === baseDomain || cleanHost.endsWith('.' + baseDomain);
    }

    // Implicit subdomain match
    if (cleanHost.endsWith('.' + pattern)) {
      return true;
    }

    return false;
  });
}
