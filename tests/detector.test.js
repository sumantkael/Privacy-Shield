import test from 'node:test';
import assert from 'node:assert/strict';
import { Detector } from '../src/content/detector.js';

test('Detector - Category Toggles Sensitivity', () => {
  // Detector with all categories enabled
  const allEnabled = new Detector({
    email: true,
    creditCard: true,
    apiKey: true,
    phone: true
  });

  const mixedText = 'Contact ceo@enterprise.com with card 4532 0150 1234 5671 or call +1 (415) 555-0199';
  const matches1 = allEnabled.detectInText(mixedText);
  assert.equal(matches1.length, 3, 'Should detect email, card, and phone');

  // Disable credit card & email
  allEnabled.updateCategories({
    email: false,
    creditCard: false,
    apiKey: true,
    phone: true
  });

  const matches2 = allEnabled.detectInText(mixedText);
  assert.equal(matches2.length, 1, 'Only phone should be detected');
  assert.equal(matches2[0].category, 'phone');
});

test('Detector - Overlapping Match Resolution', () => {
  const detector = new Detector({
    email: true,
    phone: true,
    creditCard: true
  });

  // String where an email might have digits that could look like numbers
  const text = 'Reach me at agent007@secret.com or call +1 555-019-2834';
  const matches = detector.detectInText(text);

  assert.equal(matches.length, 2);
  assert.equal(matches[0].category, 'email');
  assert.equal(matches[0].matchedText, 'agent007@secret.com');
  assert.equal(matches[1].category, 'phone');

  // Verify non-overlapping ranges
  assert.ok(matches[0].end <= matches[1].start);
});

test('Detector - Input Semantics Detection', () => {
  const detector = new Detector({
    password: true,
    creditCard: true,
    otp: true,
    personalInfo: true
  });

  // 1. Password input
  const pwInput = {
    tagName: 'INPUT',
    getAttribute: (attr) => attr === 'type' ? 'password' : null
  };
  const pwResult = detector.detectSensitiveInput(pwInput);
  assert.notEqual(pwResult, null);
  assert.equal(pwResult.category, 'password');

  // 2. Autocomplete cc-number
  const ccInput = {
    tagName: 'INPUT',
    getAttribute: (attr) => {
      if (attr === 'type') return 'text';
      if (attr === 'autocomplete') return 'cc-number';
      return null;
    }
  };
  const ccResult = detector.detectSensitiveInput(ccInput);
  assert.notEqual(ccResult, null);
  assert.equal(ccResult.category, 'creditCard');

  // 3. OTP verification code
  const otpInput = {
    tagName: 'INPUT',
    getAttribute: (attr) => {
      if (attr === 'name') return 'two_factor_code';
      if (attr === 'autocomplete') return 'one-time-code';
      return null;
    }
  };
  const otpResult = detector.detectSensitiveInput(otpInput);
  assert.notEqual(otpResult, null);
  assert.equal(otpResult.category, 'otp');

  // 4. Safe standard input (e.g. search query)
  const searchInput = {
    tagName: 'INPUT',
    getAttribute: (attr) => {
      if (attr === 'type') return 'search';
      if (attr === 'name') return 'q';
      return null;
    }
  };
  const searchResult = detector.detectSensitiveInput(searchInput);
  assert.equal(searchResult, null, 'Search input should not be detected as sensitive');
});
