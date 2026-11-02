import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidLuhn,
  isValidIBAN,
  isValidEmail,
  isValidPhone,
  PATTERNS
} from '../src/shared/patterns.js';
import { Detector } from '../src/content/detector.js';

test('Luhn Algorithm - Credit Card Validation', () => {
  // Valid test card numbers
  assert.equal(isValidLuhn('4532015012345671'), true, 'Valid Visa test card');
  assert.equal(isValidLuhn('4532-0150-1234-5671'), true, 'Valid formatted card');
  assert.equal(isValidLuhn('378282246310005'), true, 'Valid Amex card');
  assert.equal(isValidLuhn('5105105105105100'), true, 'Valid Mastercard');

  // Invalid numbers
  assert.equal(isValidLuhn('4532015012345678'), false, 'Corrupted last digit');
  assert.equal(isValidLuhn('0000000000000000'), false, 'All zeroes should be rejected');
  assert.equal(isValidLuhn('1111111111111111'), false, 'All identical digits rejected');
  assert.equal(isValidLuhn('12345'), false, 'Too short');
});

test('IBAN Mod 97 Validation', () => {
  // Valid IBANs
  assert.equal(isValidIBAN('GB82WEST12345698765432'), true, 'Valid UK IBAN');
  assert.equal(isValidIBAN('DE89370400440532013000'), true, 'Valid German IBAN');

  // Invalid IBANs
  assert.equal(isValidIBAN('GB82WEST12345698765433'), false, 'Invalid checksum');
  assert.equal(isValidIBAN('12345'), false, 'Too short');
  assert.equal(isValidIBAN('INVALIDIBANSTRING'), false, 'Invalid format');
});

test('Email Detection & False-Positive Filtering', () => {
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('first.last+tag@company.co.uk'), true);
  assert.equal(isValidEmail('dev_admin@domain.io'), true);

  // False positives from code, assets, or file paths
  assert.equal(isValidEmail('hero@2x.png'), false, 'Image asset filename');
  assert.equal(isValidEmail('bundle@1.0.js'), false, 'Script filename');
  assert.equal(isValidEmail('react@18.2.0'), false, 'Package version');
  assert.equal(isValidEmail('not-an-email'), false);
});

test('Phone Number Validation & False-Positive Filtering', () => {
  assert.equal(isValidPhone('+1 (415) 555-0199'), true);
  assert.equal(isValidPhone('+44 20 7946 0958'), true);
  assert.equal(isValidPhone('555-019-2834'), true);
  assert.equal(isValidPhone('+91 98765 43210'), true);

  // False positives: dates, IPs, versions
  assert.equal(isValidPhone('2024-05-12'), false, 'ISO Date');
  assert.equal(isValidPhone('12/05/2024'), false, 'Date slash format');
  assert.equal(isValidPhone('192.168.1.1'), false, 'IPv4 Address');
  assert.equal(isValidPhone('1.2.3.4'), false, 'Software version');
  assert.equal(isValidPhone('000-000-0000'), false, 'Repeated digits');
});

test('API Key Detection Patterns', () => {
  const allCategories = { apiKey: true, authToken: true, email: true, creditCard: true, phone: true, otp: true, bankAccount: true, personalInfo: true };
  const detector = new Detector(allCategories);

  // OpenAI (assembled dynamically to prevent static scanner false-positives)
  const mockOpenAiKey = ['sk-', 'proj-', 'MockDetectorApiKeyTestString0123456789ABCDEF'].join('');
  const openAiMatches = detector.detectInText(`Here is my key: ${mockOpenAiKey}`);
  assert.equal(openAiMatches.length, 1);
  assert.equal(openAiMatches[0].category, 'apiKey');

  // AWS Key ID
  const awsMatches = detector.detectInText('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE');
  assert.equal(awsMatches.length, 1);
  assert.equal(awsMatches[0].category, 'apiKey');

  // GitHub Personal Access Token (assembled dynamically to prevent static scanner false-positives)
  const mockGhPat = ['ghp_', 'MockDetectorPatTestString0123456789A'].join('');
  const ghMatches = detector.detectInText(`Authorization: token ${mockGhPat}`);
  assert.equal(ghMatches.length, 1);
  assert.equal(ghMatches[0].category, 'apiKey');

  // Stripe Public Key
  const stripeMatches = detector.detectInText('STRIPE_KEY=pk_test_51OzTest0011223344556677');
  assert.equal(stripeMatches.length, 1);
  assert.equal(stripeMatches[0].category, 'apiKey');

  // Google API Key (assembled dynamically to prevent static scanner false-positives: AIza + 35 chars)
  const mockGoogleKey = ['AIza', 'MockDetectorKeyTestString0123456789'].join('');
  const googleMatches = detector.detectInText(`key=${mockGoogleKey}`);
  assert.equal(googleMatches.length, 1);
  assert.equal(googleMatches[0].category, 'apiKey');
});

test('Authentication Tokens & JWTs', () => {
  const detector = new Detector({ authToken: true });

  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const matches = detector.detectInText(`User auth session: ${jwt}`);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].category, 'authToken');
  assert.equal(matches[0].badge, 'Token');
});

test('OTP & 2FA Contextual Codes', () => {
  const detector = new Detector({ otp: true });

  const text1 = 'Your security verification code is 849204 to complete sign in.';
  const m1 = detector.detectInText(text1);
  assert.equal(m1.length, 1);
  assert.equal(m1[0].category, 'otp');

  const text2 = 'Enter OTP: 492019';
  const m2 = detector.detectInText(text2);
  assert.equal(m2.length, 1);
  assert.equal(m2[0].category, 'otp');
});

test('Social Security Number (SSN) & Addresses', () => {
  const detector = new Detector({ personalInfo: true });

  const ssnText = 'Applicant SSN: 123-45-6789 on record.';
  const ssnMatches = detector.detectInText(ssnText);
  assert.equal(ssnMatches.length, 1);
  assert.equal(ssnMatches[0].category, 'personalInfo');

  const addrText = 'Deliver to 742 Evergreen Terrace, Springfield';
  const addrMatches = detector.detectInText(addrText);
  assert.equal(addrMatches.length, 1);
  assert.equal(addrMatches[0].category, 'personalInfo');
});
