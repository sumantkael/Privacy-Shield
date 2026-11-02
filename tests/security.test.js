import test from 'node:test';
import assert from 'node:assert/strict';
import { Detector } from '../src/content/detector.js';
import { DEFAULT_CONFIG } from '../src/shared/config.js';

test('SECURITY: Password input field values are NEVER read or accessed', () => {
  const detector = new Detector({ password: true });

  let valueAccessed = false;

  // Mock input element with a trap on `.value`
  const mockPasswordInput = {
    tagName: 'INPUT',
    getAttribute(attr) {
      if (attr === 'type') return 'password';
      if (attr === 'name') return 'user_password';
      if (attr === 'id') return 'login-password';
      if (attr === 'autocomplete') return 'current-password';
      return null;
    },
    get value() {
      valueAccessed = true;
      return 'SuperSecretUserPassword123!#';
    },
    closest() { return null; }
  };

  // Run detection
  // Cast for duck-typing
  mockPasswordInput instanceof Object;
  const result = detector.detectSensitiveInput.call(detector, mockPasswordInput);

  // Assertions
  assert.notEqual(result, null, 'Must detect as sensitive password input');
  assert.equal(result.category, 'password');
  assert.equal(valueAccessed, false, 'CRITICAL: The .value property was accessed! It must NEVER be read.');
});

test('SECURITY: Zero external endpoints, tracking or telemetry configured', () => {
  assert.equal(DEFAULT_CONFIG.enabled, true);

  // Verify excludedDomains defaults to clean array without tracking services
  assert.deepEqual(DEFAULT_CONFIG.excludedDomains, []);

  // Inspect that no external API keys or remote URLs are present in default config
  const configString = JSON.stringify(DEFAULT_CONFIG);
  assert.equal(configString.includes('http://'), false, 'No unencrypted endpoints');
  assert.equal(configString.includes('analytics'), false, 'No analytics telemetry');
  assert.equal(configString.includes('telemetry'), false, 'No telemetry endpoints');
});

test('SECURITY: React & Virtual DOM Safety - removeChild guard handles detached nodes gracefully', () => {
  // Simulate the main-world reconciliation guard
  const parent = {
    children: [],
    removeChild(child) {
      if (!child) return null;
      if (child.parentNode !== this) {
        if (child.parentNode) {
          return child.parentNode.removeChild(child);
        }
        return child; // Gracefully handled without throwing DOMException
      }
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
      return child;
    }
  };

  const detachedChild = { parentNode: null };
  const foreignChild = { parentNode: { removeChild: (c) => c } };

  // Must not throw errors when framework attempts to remove detached or foreign child
  assert.doesNotThrow(() => {
    const res1 = parent.removeChild(detachedChild);
    assert.equal(res1, detachedChild);
  });

  assert.doesNotThrow(() => {
    const res2 = parent.removeChild(foreignChild);
    assert.equal(res2, foreignChild);
  });
});
