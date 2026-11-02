/**
 * Privacy Shield - Content Detector
 * Evaluates text and DOM nodes for sensitive patterns based on active user categories.
 */

import { PATTERNS } from '../shared/patterns.js';
import { SENSITIVE_INPUT_SELECTORS } from '../shared/config.js';

export class Detector {
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
    if (!text || typeof text !== 'string') return [];
    if (text.length < 3) return [];

    const matches = [];

    // 1. Scan single-regex categories (email, creditCard, phone, otp)
    for (const [catKey, patternDef] of Object.entries(PATTERNS)) {
      if (!this.categories[catKey]) continue;

      if (patternDef.regex) {
        patternDef.regex.lastIndex = 0;
        let match;
        while ((match = patternDef.regex.exec(text)) !== null) {
          const matchedStr = match[0];
          const startIndex = match.index;
          const endIndex = startIndex + matchedStr.length;

          // If category has custom validation (e.g. Luhn for cards, TLD for emails)
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

      // If category has multiple sub-patterns (apiKey, authToken, bankAccount, personalInfo)
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

    // Filter out overlapping matches (prefer longer or earlier match)
    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

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
    if (!el || typeof el.getAttribute !== 'function') return null;

    const tagName = (el.tagName || '').toLowerCase();
    if (tagName !== 'input' && tagName !== 'textarea') return null;

    const type = (el.getAttribute('type') || 'text').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.getAttribute('id') || '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

    // 1. Password detection (ALWAYS protected if category enabled)
    if (this.categories.password !== false) {
      if (type === 'password' || 
          autocomplete.includes('password') ||
          autocomplete.includes('current-password') ||
          autocomplete.includes('new-password') ||
          /\b(password|passwd|pwd|passphrase)\b/i.test(name) ||
          /\b(password|passwd|pwd)\b/i.test(id)) {
        return {
          category: 'password',
          badge: 'Password',
          reason: 'password-input'
        };
      }
    }

    // 2. Credit Card inputs
    if (this.categories.creditCard !== false) {
      if (autocomplete.includes('cc-number') || 
          autocomplete.includes('card-number') ||
          autocomplete.includes('cc-csc') ||
          /\b(card[-_]?num|credit[-_]?card|cc[-_]?num|cvv|cvc)\b/i.test(name) ||
          /\b(card[-_]?num|credit[-_]?card|cc[-_]?num|cvv|cvc)\b/i.test(id) ||
          /card number|security code|cvv/i.test(placeholder) ||
          /card number|security code|cvv/i.test(ariaLabel)) {
        return {
          category: 'creditCard',
          badge: 'Card',
          reason: 'creditcard-input'
        };
      }
    }

    // 3. Social Security / National ID
    if (this.categories.personalInfo !== false) {
      if (/\b(ssn|social[-_]?sec|national[-_]?id)\b/i.test(name) ||
          /\b(ssn|social[-_]?sec)\b/i.test(id) ||
          /ssn|social security/i.test(placeholder) ||
          /ssn|social security/i.test(ariaLabel)) {
        return {
          category: 'personalInfo',
          badge: 'Personal',
          reason: 'ssn-input'
        };
      }
    }

    // 4. OTP / Verification code
    if (this.categories.otp !== false) {
      if (autocomplete.includes('one-time-code') ||
          /\b(otp|2fa|verification[-_]?code|passcode)\b/i.test(name) ||
          /\b(otp|2fa|token)\b/i.test(id) ||
          /verification code|one[- ]time code|enter otp/i.test(placeholder)) {
        return {
          category: 'otp',
          badge: 'OTP',
          reason: 'otp-input'
        };
      }
    }

    // 5. Associated <label> inspection
    const labelText = this.getAssociatedLabelText(el);
    if (labelText) {
      if (this.categories.password !== false && /\b(password|passcode)\b/i.test(labelText)) {
        return { category: 'password', badge: 'Password', reason: 'label-password' };
      }
      if (this.categories.creditCard !== false && /card number|cardholder|cvv|cvc/i.test(labelText)) {
        return { category: 'creditCard', badge: 'Card', reason: 'label-creditcard' };
      }
      if (this.categories.personalInfo !== false && /\b(ssn|social security)\b/i.test(labelText)) {
        return { category: 'personalInfo', badge: 'Personal', reason: 'label-ssn' };
      }
      if (this.categories.otp !== false && /\b(otp|verification code|security code)\b/i.test(labelText)) {
        return { category: 'otp', badge: 'OTP', reason: 'label-otp' };
      }
    }

    return null;
  }

  /**
   * Helper: finds associated label text for an input element
   */
  getAssociatedLabelText(el) {
    if (typeof document === 'undefined') return '';

    // 1. Explicit <label for="id">
    if (el.id && typeof document.querySelector === 'function') {
      try {
        const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(el.id) : el.id;
        const label = document.querySelector(`label[for="${escaped}"]`);
        if (label) return label.textContent.trim();
      } catch (e) {}
    }

    // 2. Wrapping <label>
    if (typeof el.closest === 'function') {
      const parentLabel = el.closest('label');
      if (parentLabel) return parentLabel.textContent.trim();
    }

    return '';
  }
}
