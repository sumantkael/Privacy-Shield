// src/shared/config.js
var DEFAULT_CONFIG = {
  // Global Protection Switch
  enabled: true,
  // Reveal Behavior
  revealOnHover: false,
  revealOnClick: true,
  reblurTimeout: 4e3,
  // Re-blur after 4 seconds of inactivity
  allowPinReveal: true,
  // Allow user to pin an element revealed
  // Visual Blur
  blurRadius: 6,
  // px
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
  debounceDelay: 250,
  // ms for DOM mutation batching
  maxScanDepth: 50,
  // Styling & Typography
  fontChoice: "geist",
  // 'geist' | 'manrope'
  // Internal Version
  version: "1.0.0"
};

// src/shared/browser-api.js
var BrowserAPIAdapter = class {
  constructor() {
    this.isFirefox = typeof browser !== "undefined" && typeof browser.runtime !== "undefined";
    this.api = typeof browser !== "undefined" ? browser : typeof chrome !== "undefined" ? chrome : null;
  }
  getStorageLocal() {
    return {
      get: (keys) => {
        return new Promise((resolve, reject) => {
          if (!this.api || !this.api.storage) {
            resolve({});
            return;
          }
          this.api.storage.local.get(keys, (result) => {
            if (this.api.runtime && this.api.runtime.lastError) {
              return reject(this.api.runtime.lastError);
            }
            resolve(result || {});
          });
        });
      },
      set: (items) => {
        return new Promise((resolve, reject) => {
          if (!this.api || !this.api.storage) {
            resolve();
            return;
          }
          this.api.storage.local.set(items, () => {
            if (this.api.runtime && this.api.runtime.lastError) {
              return reject(this.api.runtime.lastError);
            }
            resolve();
          });
        });
      },
      remove: (keys) => {
        return new Promise((resolve, reject) => {
          if (!this.api || !this.api.storage) {
            resolve();
            return;
          }
          this.api.storage.local.remove(keys, () => {
            if (this.api.runtime && this.api.runtime.lastError) {
              return reject(this.api.runtime.lastError);
            }
            resolve();
          });
        });
      },
      clear: () => {
        return new Promise((resolve, reject) => {
          if (!this.api || !this.api.storage) {
            resolve();
            return;
          }
          this.api.storage.local.clear(() => {
            if (this.api.runtime && this.api.runtime.lastError) {
              return reject(this.api.runtime.lastError);
            }
            resolve();
          });
        });
      }
    };
  }
  // Runtime messaging
  sendMessage(message) {
    return new Promise((resolve) => {
      if (!this.api || !this.api.runtime || !this.api.runtime.sendMessage) {
        resolve(null);
        return;
      }
      try {
        this.api.runtime.sendMessage(message, (response) => {
          if (this.api.runtime && this.api.runtime.lastError) {
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  onMessage(callback) {
    if (this.api && this.api.runtime && this.api.runtime.onMessage) {
      this.api.runtime.onMessage.addListener(callback);
    }
  }
  getURL(path) {
    if (this.api && this.api.runtime && this.api.runtime.getURL) {
      return this.api.runtime.getURL(path);
    }
    return path;
  }
  openOptionsPage() {
    return new Promise((resolve) => {
      if (this.api && this.api.runtime && this.api.runtime.openOptionsPage) {
        this.api.runtime.openOptionsPage(() => resolve());
      } else if (this.api && this.api.tabs && this.api.tabs.create) {
        this.api.tabs.create({ url: this.getURL("settings/settings.html") }, () => resolve());
      } else {
        resolve();
      }
    });
  }
  // Active Tab query & messaging
  async getActiveTab() {
    return new Promise((resolve) => {
      if (!this.api || !this.api.tabs || !this.api.tabs.query) {
        resolve(null);
        return;
      }
      this.api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          resolve(tabs[0]);
        } else {
          resolve(null);
        }
      });
    });
  }
  sendMessageToTab(tabId, message) {
    return new Promise((resolve) => {
      if (!this.api || !this.api.tabs || !this.api.tabs.sendMessage) {
        resolve(null);
        return;
      }
      try {
        this.api.tabs.sendMessage(tabId, message, (response) => {
          if (this.api.runtime && this.api.runtime.lastError) {
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  // Storage change listener
  onStorageChanged(callback) {
    if (this.api && this.api.storage && this.api.storage.onChanged) {
      this.api.storage.onChanged.addListener(callback);
    }
  }
};
var browserAPI = new BrowserAPIAdapter();

// src/shared/storage.js
var STORAGE_KEY = "ps_settings";
var StorageService = class {
  constructor() {
    this.storage = browserAPI.getStorageLocal();
    this.cache = null;
  }
  /**
   * Retrieves current settings, merged with defaults
   */
  async getSettings() {
    try {
      const data = await this.storage.get([STORAGE_KEY]);
      const stored = data[STORAGE_KEY] || {};
      const merged = {
        ...DEFAULT_CONFIG,
        ...stored,
        categories: {
          ...DEFAULT_CONFIG.categories,
          ...stored.categories || {}
        },
        excludedDomains: Array.isArray(stored.excludedDomains) ? stored.excludedDomains : DEFAULT_CONFIG.excludedDomains
      };
      this.cache = merged;
      return merged;
    } catch (err) {
      console.warn("[Privacy Shield] Storage read error, falling back to defaults:", err);
      return { ...DEFAULT_CONFIG };
    }
  }
  /**
   * Saves updated settings to local browser storage
   */
  async saveSettings(newSettings) {
    try {
      const current = await this.getSettings();
      const updated = {
        ...current,
        ...newSettings,
        categories: {
          ...current.categories,
          ...newSettings.categories || {}
        }
      };
      await this.storage.set({ [STORAGE_KEY]: updated });
      this.cache = updated;
      return updated;
    } catch (err) {
      console.error("[Privacy Shield] Failed to persist settings:", err);
      throw err;
    }
  }
  /**
   * Toggles global protection
   */
  async setEnabled(enabled) {
    return this.saveSettings({ enabled });
  }
  /**
   * Toggles an individual detection category
   */
  async setCategory(categoryKey, isEnabled) {
    const current = await this.getSettings();
    const categories = { ...current.categories, [categoryKey]: isEnabled };
    return this.saveSettings({ categories });
  }
  /**
   * Adds a domain to the exclusion list
   */
  async addExclusion(domain) {
    if (!domain) return;
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const current = await this.getSettings();
    const set = new Set(current.excludedDomains || []);
    set.add(cleanDomain);
    return this.saveSettings({ excludedDomains: Array.from(set) });
  }
  /**
   * Removes a domain from the exclusion list
   */
  async removeExclusion(domain) {
    if (!domain) return;
    const cleanDomain = domain.toLowerCase().trim();
    const current = await this.getSettings();
    const filtered = (current.excludedDomains || []).filter((d) => d.toLowerCase().trim() !== cleanDomain);
    return this.saveSettings({ excludedDomains: filtered });
  }
  /**
   * Checks if a domain is excluded
   */
  async isDomainExcluded(hostname) {
    const settings = await this.getSettings();
    if (!hostname || !settings.excludedDomains) return false;
    const clean = hostname.toLowerCase().trim();
    return settings.excludedDomains.some((entry) => {
      const pattern = entry.toLowerCase().trim();
      if (clean === pattern) return true;
      if (clean.endsWith("." + pattern)) return true;
      return false;
    });
  }
  /**
   * Resets settings back to factory defaults
   */
  async resetToDefaults() {
    await this.storage.set({ [STORAGE_KEY]: DEFAULT_CONFIG });
    this.cache = { ...DEFAULT_CONFIG };
    return this.cache;
  }
};
var storageService = new StorageService();

// src/shared/patterns.js
function isValidLuhn(numberString) {
  const digits = numberString.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
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
function isValidIBAN(input) {
  const iban = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (iban.length < 15 || iban.length > 34) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";
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
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.substring(i, Math.min(i + 7, numeric.length));
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder === 1;
}
var INVALID_EMAIL_TLDS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "js",
  "ts",
  "jsx",
  "tsx",
  "css",
  "scss",
  "json",
  "map",
  "wasm",
  "lock",
  "md",
  "html",
  "vue",
  "py",
  "java",
  "cpp",
  "rs",
  "go"
]);
function isValidEmail(candidate) {
  const match = candidate.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.([a-zA-Z0-9]{2,})$/);
  if (!match) return false;
  const tld = match[1].toLowerCase();
  if (INVALID_EMAIL_TLDS.has(tld)) return false;
  if (/^\d+$/.test(tld)) return false;
  return true;
}
function isValidPhone(candidate) {
  const clean = candidate.trim();
  const digits = clean.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  if (/^\d{4}[\s-]\d{4}[\s-]\d{4}/.test(clean)) return false;
  if (/^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(candidate.trim())) return false;
  if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(candidate.trim())) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate.trim())) return false;
  if (/^(?:\d+\.){2,}\d+$/.test(candidate.trim())) return false;
  if (!/[+()\s-]/.test(candidate) && digits.length < 10) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
}
var PATTERNS = {
  // Email Addresses
  email: {
    id: "email",
    name: "Email Addresses",
    badge: "Email",
    regex: /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g,
    validate: (val) => isValidEmail(val)
  },
  // Credit & Debit Card Numbers
  creditCard: {
    id: "creditCard",
    name: "Payment Cards",
    badge: "Card",
    // Matches 13-19 digit card numbers separated by spaces or dashes
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    validate: (val) => {
      const clean = val.replace(/\D/g, "");
      if (clean.length < 13 || clean.length > 19) return false;
      return isValidLuhn(clean);
    }
  },
  // API Keys and Developer Secrets
  apiKey: {
    id: "apiKey",
    name: "API Keys & Secrets",
    badge: "Key",
    patterns: [
      // OpenAI API Keys
      { name: "OpenAI", regex: /\b(?:sk-[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9_-]{40,}|sk-admin-[a-zA-Z0-9_-]{40,})\b/g },
      // AWS Access Key ID
      { name: "AWS", regex: /\b(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g },
      // GitHub Tokens
      { name: "GitHub", regex: /\b(?:ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{60,})\b/g },
      // Slack Tokens
      { name: "Slack", regex: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g },
      // Stripe Keys
      { name: "Stripe", regex: /\b(?:sk|pk|rk)_(?:test|live)_[0-9a-zA-Z]{24,}\b/g },
      // Google API Key
      { name: "Google", regex: /\bAIza[0-9A-Za-z-_]{35}\b/g },
      // Generic Private Keys / Bearer Token Assignment
      { name: "GenericKey", regex: /(?:api[_-]?key|secret[_-]?token|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi }
    ]
  },
  // Authentication Tokens & JWTs
  authToken: {
    id: "authToken",
    name: "Auth Tokens & JWT",
    badge: "Token",
    patterns: [
      // JWT Token
      { name: "JWT", regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
      // Bearer Auth Token
      { name: "Bearer", regex: /\bBearer\s+([a-zA-Z0-9._\-]{24,})\b/gi }
    ]
  },
  // Phone Numbers
  phone: {
    id: "phone",
    name: "Phone Numbers",
    badge: "Phone",
    // International & local format bounded by non-digits
    regex: /(?<!\d)(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,5}(?!\d)/g,
    validate: (val) => isValidPhone(val)
  },
  // OTPs & 2FA Codes
  otp: {
    id: "otp",
    name: "OTPs & 2FA Codes",
    badge: "OTP",
    // Requires keyword context near 4-8 digit numbers (supports "is", ":", "-", etc.)
    regex: /(?:otp|one-time|code|verification|passcode|2fa|pin)[\s:#=-]*(?:is\s+)?\b(\d{4,8})\b/gi,
    isContextual: true
  },
  // Bank Account Numbers & IBANs
  bankAccount: {
    id: "bankAccount",
    name: "Bank & IBAN Accounts",
    badge: "Bank",
    patterns: [
      // IBAN pattern
      {
        name: "IBAN",
        regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
        validate: (val) => isValidIBAN(val)
      },
      // Routing / Account contextual numbers
      {
        name: "RoutingOrAccount",
        regex: /(?:routing|aba|sort\s*code|bank\s*acc(?:t|ount)?|account\s*(?:no|num|number)?|iban)[\s:#=-]*\b([0-9]{8,17}|[0-9]{2}-[0-9]{2}-[0-9]{2})\b/gi
      }
    ]
  },
  // Personal Addresses & Government IDs (SSN)
  personalInfo: {
    id: "personalInfo",
    name: "Addresses & SSN",
    badge: "Personal",
    patterns: [
      // US Social Security Number (SSN)
      {
        name: "SSN",
        regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g
      },
      // Physical street address format
      {
        name: "Address",
        regex: /\b\d{1,5}\s+(?:[A-Z][a-zA-Z0-9#\.\-]+\s+){1,4}(?:Street|St\b|Avenue|Ave\b|Boulevard|Blvd\b|Road|Rd\b|Drive|Dr\b|Lane|Ln\b|Way\b|Court|Ct\b|Circle|Cir\b|Highway|Hwy\b|Parkway|Pkwy\b|Terrace|Ter\b|Place|Pl\b|Square|Sq\b|Suite|Ste\b|Apt\b|Apartment)\.?\b/g
      }
    ]
  }
};

// src/content/detector.js
var Detector = class {
  constructor(categories = {}) {
    this.categories = categories;
  }
  updateCategories(categories) {
    this.categories = categories || {};
  }
  /**
   * Scans a string of text for sensitive patterns.
   * Returns a list of non-overlapping match ranges.
   */
  detectInText(text) {
    if (!text || typeof text !== "string") return [];
    if (text.length < 3) return [];
    const matches = [];
    for (const [catKey, patternDef] of Object.entries(PATTERNS)) {
      if (!this.categories[catKey]) continue;
      if (patternDef.regex) {
        patternDef.regex.lastIndex = 0;
        let match;
        while ((match = patternDef.regex.exec(text)) !== null) {
          const matchedStr = match[0];
          const startIndex = match.index;
          const endIndex = startIndex + matchedStr.length;
          if (patternDef.validate && !patternDef.validate(matchedStr)) {
            continue;
          }
          matches.push({
            start: startIndex,
            end: endIndex,
            category: catKey,
            badge: patternDef.badge || catKey,
            matchedText: matchedStr
          });
        }
      }
      if (patternDef.patterns && Array.isArray(patternDef.patterns)) {
        for (const sub of patternDef.patterns) {
          sub.regex.lastIndex = 0;
          let match;
          while ((match = sub.regex.exec(text)) !== null) {
            const matchedStr = match[0];
            const startIndex = match.index;
            const endIndex = startIndex + matchedStr.length;
            if (sub.validate && !sub.validate(matchedStr)) {
              continue;
            }
            matches.push({
              start: startIndex,
              end: endIndex,
              category: catKey,
              badge: patternDef.badge || catKey,
              matchedText: matchedStr,
              subName: sub.name
            });
          }
        }
      }
    }
    if (matches.length === 0) return [];
    matches.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const resolved = [];
    let lastEnd = -1;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        resolved.push(m);
        lastEnd = m.end;
      }
    }
    return resolved;
  }
  /**
   * Evaluates whether an <input> or <textarea> element is sensitive.
   * SECURITY PRINCIPLE: NEVER reads or inspects .value of password inputs!
   */
  detectSensitiveInput(el) {
    if (!el || typeof el.getAttribute !== "function") return null;
    const tagName = (el.tagName || "").toLowerCase();
    if (tagName !== "input" && tagName !== "textarea") return null;
    const type = (el.getAttribute("type") || "text").toLowerCase();
    const name = (el.getAttribute("name") || "").toLowerCase();
    const id = (el.getAttribute("id") || "").toLowerCase();
    const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
    const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
    const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
    if (this.categories.password !== false) {
      if (type === "password" || autocomplete.includes("password") || autocomplete.includes("current-password") || autocomplete.includes("new-password") || /\b(password|passwd|pwd|passphrase)\b/i.test(name) || /\b(password|passwd|pwd)\b/i.test(id)) {
        return {
          category: "password",
          badge: "Password",
          reason: "password-input"
        };
      }
    }
    if (this.categories.creditCard !== false) {
      if (autocomplete.includes("cc-number") || autocomplete.includes("card-number") || autocomplete.includes("cc-csc") || /\b(card[-_]?num|credit[-_]?card|cc[-_]?num|cvv|cvc)\b/i.test(name) || /\b(card[-_]?num|credit[-_]?card|cc[-_]?num|cvv|cvc)\b/i.test(id) || /card number|security code|cvv/i.test(placeholder) || /card number|security code|cvv/i.test(ariaLabel)) {
        return {
          category: "creditCard",
          badge: "Card",
          reason: "creditcard-input"
        };
      }
    }
    if (this.categories.personalInfo !== false) {
      if (/\b(ssn|social[-_]?sec|national[-_]?id)\b/i.test(name) || /\b(ssn|social[-_]?sec)\b/i.test(id) || /ssn|social security/i.test(placeholder) || /ssn|social security/i.test(ariaLabel)) {
        return {
          category: "personalInfo",
          badge: "Personal",
          reason: "ssn-input"
        };
      }
    }
    if (this.categories.otp !== false) {
      if (autocomplete.includes("one-time-code") || /\b(otp|2fa|verification[-_]?code|passcode)\b/i.test(name) || /\b(otp|2fa|token)\b/i.test(id) || /verification code|one[- ]time code|enter otp/i.test(placeholder)) {
        return {
          category: "otp",
          badge: "OTP",
          reason: "otp-input"
        };
      }
    }
    const labelText = this.getAssociatedLabelText(el);
    if (labelText) {
      if (this.categories.password !== false && /\b(password|passcode)\b/i.test(labelText)) {
        return { category: "password", badge: "Password", reason: "label-password" };
      }
      if (this.categories.creditCard !== false && /card number|cardholder|cvv|cvc/i.test(labelText)) {
        return { category: "creditCard", badge: "Card", reason: "label-creditcard" };
      }
      if (this.categories.personalInfo !== false && /\b(ssn|social security)\b/i.test(labelText)) {
        return { category: "personalInfo", badge: "Personal", reason: "label-ssn" };
      }
      if (this.categories.otp !== false && /\b(otp|verification code|security code)\b/i.test(labelText)) {
        return { category: "otp", badge: "OTP", reason: "label-otp" };
      }
    }
    return null;
  }
  /**
   * Helper: finds associated label text for an input element
   */
  getAssociatedLabelText(el) {
    if (typeof document === "undefined") return "";
    if (el.id && typeof document.querySelector === "function") {
      try {
        const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(el.id) : el.id;
        const label = document.querySelector(`label[for="${escaped}"]`);
        if (label) return label.textContent.trim();
      } catch (e) {
      }
    }
    if (typeof el.closest === "function") {
      const parentLabel = el.closest("label");
      if (parentLabel) return parentLabel.textContent.trim();
    }
    return "";
  }
};

// src/content/blur.js
var BlurManager = class {
  constructor(options = {}) {
    this.blurRadius = options.blurRadius || 6;
    this.blurredElements = /* @__PURE__ */ new Set();
    this.counterCallback = options.onCountChanged || null;
  }
  setBlurRadius(radius) {
    this.blurRadius = radius;
    document.documentElement.style.setProperty("--ps-blur-radius", `${radius}px`);
  }
  /**
   * Blurs sensitive matches inside a single DOM Text node
   */
  blurTextNode(textNode, matches) {
    if (!textNode || !textNode.parentNode || matches.length === 0) return 0;
    const parent = textNode.parentNode;
    if (parent.closest(".ps-shield-blur") || parent.closest(".ps-shield-input")) {
      return 0;
    }
    if (parent.isContentEditable || ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)) {
      return 0;
    }
    const fullText = textNode.nodeValue || "";
    if (!fullText.trim()) return 0;
    const isSingleChild = parent.childNodes.length === 1;
    const isSoleText = parent.textContent.trim().length <= matches[0].matchedText.trim().length + 10;
    if (matches.length === 1 && (isSingleChild || isSoleText) && parent !== document.body && parent !== document.documentElement) {
      parent.classList.add("ps-shield-blur");
      parent.setAttribute("data-ps-cat", matches[0].category);
      parent.setAttribute("data-ps-badge", matches[0].badge || matches[0].category);
      parent.setAttribute("tabindex", "0");
      parent.setAttribute("role", "button");
      parent.setAttribute("aria-label", `Protected ${matches[0].badge || "sensitive content"}. Press Enter to reveal.`);
      this.blurredElements.add(parent);
      this.notifyCountChanged();
      return 1;
    }
    try {
      const fragment = document.createDocumentFragment();
      let currentIdx = 0;
      let createdCount = 0;
      for (const match of matches) {
        if (match.start > currentIdx) {
          fragment.appendChild(document.createTextNode(fullText.substring(currentIdx, match.start)));
        }
        const sensitiveText = fullText.substring(match.start, match.end);
        const blurSpan = document.createElement("mark");
        blurSpan.className = "ps-shield-blur";
        blurSpan.setAttribute("data-ps-cat", match.category);
        blurSpan.setAttribute("data-ps-badge", match.badge || match.category);
        blurSpan.setAttribute("tabindex", "0");
        blurSpan.setAttribute("role", "button");
        blurSpan.setAttribute("aria-label", `Protected ${match.badge || "sensitive content"}. Press Enter to reveal.`);
        blurSpan.textContent = sensitiveText;
        fragment.appendChild(blurSpan);
        this.blurredElements.add(blurSpan);
        createdCount++;
        currentIdx = match.end;
      }
      if (currentIdx < fullText.length) {
        fragment.appendChild(document.createTextNode(fullText.substring(currentIdx)));
      }
      parent.replaceChild(fragment, textNode);
      this.notifyCountChanged();
      return createdCount;
    } catch (err) {
      return 0;
    }
  }
  /**
   * Blurs sensitive input element (e.g. password, credit card, ssn)
   * Non-destructive: does not modify .value
   */
  blurInput(inputEl, info) {
    if (!inputEl || this.blurredElements.has(inputEl)) return false;
    inputEl.classList.add("ps-shield-input");
    inputEl.setAttribute("data-ps-cat", info.category);
    inputEl.setAttribute("data-ps-badge", info.badge);
    inputEl.setAttribute("aria-label", `Privacy Shield: protected ${info.badge}`);
    this.blurredElements.add(inputEl);
    this.notifyCountChanged();
    return true;
  }
  /**
   * Restores a blurred text element back to plain text
   */
  unblurTextElement(blurSpan) {
    if (!blurSpan) return;
    if (blurSpan.tagName === "MARK") {
      if (blurSpan.parentNode) {
        try {
          const textNode = document.createTextNode(blurSpan.textContent);
          blurSpan.parentNode.replaceChild(textNode, blurSpan);
        } catch (e) {
        }
      }
    } else {
      blurSpan.classList.remove("ps-shield-blur", "ps-revealed", "ps-pinned");
      blurSpan.removeAttribute("data-ps-cat");
      blurSpan.removeAttribute("data-ps-badge");
      const pinBtn = blurSpan.querySelector(".ps-pin-btn");
      if (pinBtn) pinBtn.remove();
    }
    this.blurredElements.delete(blurSpan);
  }
  /**
   * Restores an input element
   */
  unblurInput(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove("ps-shield-input", "ps-revealed", "ps-pinned");
    inputEl.removeAttribute("data-ps-cat");
    inputEl.removeAttribute("data-ps-badge");
    this.blurredElements.delete(inputEl);
  }
  /**
   * Removes all Privacy Shield blur effects and wrappers across the entire document
   */
  clearAll() {
    const textSpans = document.querySelectorAll(".ps-shield-blur");
    textSpans.forEach((span) => this.unblurTextElement(span));
    const inputs = document.querySelectorAll(".ps-shield-input");
    inputs.forEach((input) => this.unblurInput(input));
    this.blurredElements.clear();
    this.notifyCountChanged();
  }
  /**
   * Returns total count of currently protected elements
   */
  getCount() {
    for (const el of this.blurredElements) {
      if (!el.isConnected) {
        this.blurredElements.delete(el);
      }
    }
    return this.blurredElements.size;
  }
  notifyCountChanged() {
    if (typeof this.counterCallback === "function") {
      this.counterCallback(this.getCount());
    }
  }
};

// src/content/reveal.js
var RevealManager = class {
  constructor(options = {}) {
    this.revealOnHover = options.revealOnHover || false;
    this.revealOnClick = options.revealOnClick !== false;
    this.reblurTimeout = options.reblurTimeout || 4e3;
    this.allowPinReveal = options.allowPinReveal !== false;
    this.reblurTimers = /* @__PURE__ */ new WeakMap();
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.attachGlobalListeners();
  }
  updateConfig(config = {}) {
    if (typeof config.revealOnHover === "boolean") this.revealOnHover = config.revealOnHover;
    if (typeof config.revealOnClick === "boolean") this.revealOnClick = config.revealOnClick;
    if (typeof config.reblurTimeout === "number") this.reblurTimeout = config.reblurTimeout;
    if (typeof config.allowPinReveal === "boolean") this.allowPinReveal = config.allowPinReveal;
  }
  attachGlobalListeners() {
    document.addEventListener("click", this.handleClick, true);
    document.addEventListener("mouseover", this.handleMouseEnter, true);
    document.addEventListener("mouseout", this.handleMouseLeave, true);
    document.addEventListener("keydown", this.handleKeyDown, true);
  }
  detachGlobalListeners() {
    document.removeEventListener("click", this.handleClick, true);
    document.removeEventListener("mouseover", this.handleMouseEnter, true);
    document.removeEventListener("mouseout", this.handleMouseLeave, true);
    document.removeEventListener("keydown", this.handleKeyDown, true);
  }
  getShieldTarget(eventTarget) {
    if (!eventTarget || !(eventTarget instanceof Element)) return null;
    return eventTarget.closest(".ps-shield-blur, .ps-shield-input");
  }
  handleClick(e) {
    const target = this.getShieldTarget(e.target);
    if (!target) return;
    if (e.target.closest(".ps-pin-btn")) {
      e.preventDefault();
      e.stopPropagation();
      this.togglePin(target);
      return;
    }
    if (!this.revealOnClick) return;
    if (target.classList.contains("ps-revealed")) {
      if (!target.classList.contains("ps-pinned")) {
        this.reblur(target);
      }
    } else {
      this.reveal(target);
    }
  }
  handleMouseEnter(e) {
    if (!this.revealOnHover) return;
    const target = this.getShieldTarget(e.target);
    if (!target) return;
    this.clearTimer(target);
    this.reveal(target);
  }
  handleMouseLeave(e) {
    const target = this.getShieldTarget(e.target);
    if (!target) return;
    if (target.classList.contains("ps-pinned")) return;
    if (target.classList.contains("ps-revealed")) {
      this.scheduleReblur(target);
    }
  }
  handleKeyDown(e) {
    if (e.key === "Escape") {
      const revealed = document.querySelectorAll(".ps-revealed:not(.ps-pinned)");
      revealed.forEach((el) => this.reblur(el));
      return;
    }
    const target = this.getShieldTarget(document.activeElement);
    if (!target) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (target.classList.contains("ps-revealed")) {
        this.reblur(target);
      } else {
        this.reveal(target);
      }
    }
    if ((e.key === "p" || e.key === "P") && this.allowPinReveal) {
      e.preventDefault();
      this.togglePin(target);
    }
  }
  reveal(el) {
    if (!el) return;
    this.clearTimer(el);
    el.classList.add("ps-revealed");
    el.setAttribute("aria-expanded", "true");
    if (this.allowPinReveal && !el.querySelector(".ps-pin-btn") && el.classList.contains("ps-shield-blur")) {
      const isPinned = el.classList.contains("ps-pinned");
      const pinBtn = document.createElement("button");
      pinBtn.className = "ps-pin-btn" + (isPinned ? " active" : "");
      pinBtn.title = isPinned ? "Pinned (Click to unpin)" : "Keep revealed (Pin)";
      pinBtn.setAttribute("aria-label", "Pin revealed");
      pinBtn.setAttribute("tabindex", "-1");
      pinBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" style="display:block!important;width:12px!important;height:12px!important;margin:auto!important;pointer-events:none!important;overflow:visible!important;">
          <path d="M16 3H8C7.45 3 7 3.45 7 4V6C7 7.1 6.55 8.15 5.76 8.94L4.29 10.41C4.04 10.66 4.18 11 4.54 11H10V18L12 21L14 18V11H19.46C19.82 11 19.96 10.66 19.71 10.41L18.24 8.94C17.45 8.15 17 7.1 17 6V4C17 3.45 16.55 3 16 3Z" fill="#FFFFFF" style="fill:#FFFFFF!important;stroke:none!important;opacity:1!important;visibility:visible!important;"></path>
        </svg>
      `;
      el.appendChild(pinBtn);
    }
    this.scheduleReblur(el);
  }
  reblur(el) {
    if (!el) return;
    this.clearTimer(el);
    el.classList.remove("ps-revealed", "ps-pinned");
    el.setAttribute("aria-expanded", "false");
    const pinBtn = el.querySelector(".ps-pin-btn");
    if (pinBtn) pinBtn.remove();
  }
  togglePin(el) {
    if (!el) return;
    const pinBtn = el.querySelector(".ps-pin-btn");
    if (el.classList.contains("ps-pinned")) {
      el.classList.remove("ps-pinned");
      if (pinBtn) {
        pinBtn.classList.remove("active");
        pinBtn.title = "Keep revealed (Pin)";
      }
      this.scheduleReblur(el);
    } else {
      this.clearTimer(el);
      el.classList.add("ps-revealed", "ps-pinned");
      if (pinBtn) {
        pinBtn.classList.add("active");
        pinBtn.title = "Pinned (Click to unpin)";
      }
    }
  }
  scheduleReblur(el) {
    if (!el || el.classList.contains("ps-pinned")) return;
    this.clearTimer(el);
    if (this.reblurTimeout > 0) {
      const timer = setTimeout(() => {
        if (!el.matches(":hover") && document.activeElement !== el && !el.classList.contains("ps-pinned")) {
          this.reblur(el);
        }
      }, this.reblurTimeout);
      this.reblurTimers.set(el, timer);
    }
  }
  clearTimer(el) {
    if (this.reblurTimers.has(el)) {
      clearTimeout(this.reblurTimers.get(el));
      this.reblurTimers.delete(el);
    }
  }
};

// src/content/scanner.js
var DomScanner = class {
  constructor(detector, blurManager) {
    this.detector = detector;
    this.blurManager = blurManager;
    this.ignoredTags = /* @__PURE__ */ new Set([
      "SCRIPT",
      "STYLE",
      "NOSCRIPT",
      "SVG",
      "CANVAS",
      "TEMPLATE",
      "HEAD",
      "META",
      "LINK",
      "AUDIO",
      "VIDEO",
      "OBJECT",
      "EMBED"
    ]);
  }
  /**
   * Scans a subtree starting from a root node
   */
  scanSubtree(rootNode = document.body) {
    if (!rootNode || !rootNode.isConnected) return;
    if (this.ignoredTags.has(rootNode.nodeName)) return;
    this.scanInputs(rootNode);
    this.scanTextNodes(rootNode);
    this.scanSameOriginIframes(rootNode);
  }
  scanInputs(rootNode) {
    if (rootNode instanceof HTMLElement && (rootNode.tagName === "INPUT" || rootNode.tagName === "TEXTAREA")) {
      this.checkAndBlurInput(rootNode);
      return;
    }
    if (!rootNode.querySelectorAll) return;
    const inputs = rootNode.querySelectorAll("input, textarea");
    inputs.forEach((el) => this.checkAndBlurInput(el));
  }
  checkAndBlurInput(inputEl) {
    if (inputEl.classList.contains("ps-shield-input")) return;
    const sensitiveInfo = this.detector.detectSensitiveInput(inputEl);
    if (sensitiveInfo) {
      this.blurManager.blurInput(inputEl, sensitiveInfo);
    }
  }
  scanTextNodes(rootNode) {
    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (this.ignoredTags.has(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest(".ps-shield-blur") || parent.closest(".ps-shield-input")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.isContentEditable || parent.closest('.monaco-editor, .ace_editor, .cm-editor, [contenteditable="true"]')) {
            return NodeFilter.FILTER_REJECT;
          }
          const val = node.nodeValue;
          if (!val || val.trim().length < 3) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const nodesToProcess = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      nodesToProcess.push(currentNode);
      currentNode = walker.nextNode();
    }
    for (const textNode of nodesToProcess) {
      if (!textNode.isConnected) continue;
      const text = textNode.nodeValue;
      const matches = this.detector.detectInText(text);
      if (matches.length > 0) {
        this.blurManager.blurTextNode(textNode, matches);
      }
    }
  }
  scanSameOriginIframes(rootNode) {
    if (!rootNode.querySelectorAll) return;
    const iframes = rootNode.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          this.scanSubtree(iframe.contentDocument.body);
        }
      } catch (e) {
      }
    });
  }
};

// src/settings/settings.js
var SettingsController = class {
  constructor() {
    this.settings = null;
    this.sandboxScanner = null;
    this.sandboxBlurManager = null;
    this.sandboxRevealManager = null;
    this.init();
  }
  async init() {
    this.settings = await storageService.getSettings();
    this.initTabs();
    this.bindControls();
    this.populateUI();
    this.initSandbox();
  }
  initTabs() {
    const navItems = document.querySelectorAll(".nav-item");
    const panels = document.querySelectorAll(".tab-panel");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const targetTab = item.dataset.tab;
        navItems.forEach((i) => i.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        item.classList.add("active");
        const targetPanel = document.getElementById(`tab-${targetTab}`);
        if (targetPanel) {
          targetPanel.classList.add("active");
        }
      });
    });
  }
  bindControls() {
    const masterToggle = document.getElementById("settingMasterToggle");
    masterToggle.addEventListener("change", async (e) => {
      await storageService.setEnabled(e.target.checked);
    });
    const revealClick = document.getElementById("settingRevealClick");
    revealClick.addEventListener("change", async (e) => {
      await storageService.saveSettings({ revealOnClick: e.target.checked });
    });
    const revealHover = document.getElementById("settingRevealHover");
    revealHover.addEventListener("change", async (e) => {
      await storageService.saveSettings({ revealOnHover: e.target.checked });
    });
    const allowPin = document.getElementById("settingAllowPin");
    allowPin.addEventListener("change", async (e) => {
      await storageService.saveSettings({ allowPinReveal: e.target.checked });
    });
    const reblurSlider = document.getElementById("settingReblurSlider");
    const reblurLabel = document.getElementById("reblurValLabel");
    reblurSlider.addEventListener("input", (e) => {
      const valSec = (e.target.value / 1e3).toFixed(1);
      reblurLabel.textContent = `${valSec}s`;
    });
    reblurSlider.addEventListener("change", async (e) => {
      await storageService.saveSettings({ reblurTimeout: parseInt(e.target.value, 10) });
    });
    const blurRadiusSlider = document.getElementById("settingBlurRadius");
    const blurRadiusLabel = document.getElementById("blurRadiusValLabel");
    blurRadiusSlider.addEventListener("input", (e) => {
      blurRadiusLabel.textContent = `${e.target.value}px`;
    });
    blurRadiusSlider.addEventListener("change", async (e) => {
      await storageService.saveSettings({ blurRadius: parseInt(e.target.value, 10) });
    });
    const catToggles = document.querySelectorAll(".setting-cat");
    catToggles.forEach((toggle) => {
      toggle.addEventListener("change", async (e) => {
        const cat = e.target.dataset.cat;
        await storageService.setCategory(cat, e.target.checked);
      });
    });
    const addBtn = document.getElementById("addDomainBtn");
    const domainInput = document.getElementById("newDomainInput");
    const searchInput = document.getElementById("searchExclusionsInput");
    const handleAddDomain = async () => {
      const domain = domainInput.value.trim();
      if (!domain) return;
      await storageService.addExclusion(domain);
      domainInput.value = "";
      this.settings = await storageService.getSettings();
      this.renderExclusionsList();
    };
    addBtn.addEventListener("click", handleAddDomain);
    domainInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleAddDomain();
    });
    searchInput.addEventListener("input", () => {
      this.renderExclusionsList(searchInput.value.trim().toLowerCase());
    });
    const resetBtn = document.getElementById("resetSettingsBtn");
    resetBtn.addEventListener("click", async () => {
      if (confirm("Reset all Privacy Shield settings to default values?")) {
        await storageService.resetToDefaults();
        this.settings = await storageService.getSettings();
        this.populateUI();
      }
    });
  }
  populateUI() {
    if (!this.settings) return;
    document.getElementById("settingMasterToggle").checked = Boolean(this.settings.enabled);
    document.getElementById("settingRevealClick").checked = Boolean(this.settings.revealOnClick);
    document.getElementById("settingRevealHover").checked = Boolean(this.settings.revealOnHover);
    document.getElementById("settingAllowPin").checked = Boolean(this.settings.allowPinReveal);
    const reblurSlider = document.getElementById("settingReblurSlider");
    reblurSlider.value = this.settings.reblurTimeout || 4e3;
    document.getElementById("reblurValLabel").textContent = `${(reblurSlider.value / 1e3).toFixed(1)}s`;
    const blurRadiusSlider = document.getElementById("settingBlurRadius");
    blurRadiusSlider.value = this.settings.blurRadius || 6;
    document.getElementById("blurRadiusValLabel").textContent = `${blurRadiusSlider.value}px`;
    const catToggles = document.querySelectorAll(".setting-cat");
    catToggles.forEach((toggle) => {
      const cat = toggle.dataset.cat;
      toggle.checked = this.settings.categories[cat] !== false;
    });
    this.renderExclusionsList();
  }
  renderExclusionsList(filter = "") {
    const container = document.getElementById("exclusionListContainer");
    const countLabel = document.getElementById("exclusionCountLabel");
    const domains = this.settings.excludedDomains || [];
    countLabel.textContent = domains.length.toString();
    container.innerHTML = "";
    const filtered = domains.filter((d) => !filter || d.toLowerCase().includes(filter));
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-exclusions";
      empty.textContent = domains.length === 0 ? "No website exclusions configured yet." : "No exclusions match your search filter.";
      container.appendChild(empty);
      return;
    }
    filtered.forEach((domain) => {
      const row = document.createElement("div");
      row.className = "exclusion-row";
      const label = document.createElement("span");
      label.className = "domain-name";
      label.textContent = domain;
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-domain-btn";
      deleteBtn.textContent = "Remove";
      deleteBtn.addEventListener("click", async () => {
        await storageService.removeExclusion(domain);
        this.settings = await storageService.getSettings();
        this.renderExclusionsList(filter);
      });
      row.appendChild(label);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    });
  }
  initSandbox() {
    const sandboxArea = document.getElementById("sandboxPreviewArea");
    const scanBtn = document.getElementById("sandboxScanBtn");
    const detector = new Detector(this.settings.categories);
    this.sandboxBlurManager = new BlurManager({ blurRadius: this.settings.blurRadius });
    this.sandboxRevealManager = new RevealManager({
      revealOnClick: this.settings.revealOnClick,
      revealOnHover: this.settings.revealOnHover,
      reblurTimeout: this.settings.reblurTimeout,
      allowPinReveal: this.settings.allowPinReveal
    });
    this.sandboxScanner = new DomScanner(detector, this.sandboxBlurManager);
    this.sandboxScanner.scanSubtree(sandboxArea);
    scanBtn.addEventListener("click", () => {
      detector.updateCategories(this.settings.categories);
      this.sandboxBlurManager.setBlurRadius(this.settings.blurRadius);
      this.sandboxScanner.scanSubtree(sandboxArea);
    });
  }
};
document.addEventListener("DOMContentLoaded", () => {
  new SettingsController();
});
