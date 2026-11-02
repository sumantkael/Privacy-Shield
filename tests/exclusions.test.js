import test from 'node:test';
import assert from 'node:assert/strict';
import { isDomainExcluded } from '../src/shared/config.js';

test('Website Exclusions - Exact Match', () => {
  const exclusions = ['example.com', 'localhost', 'mycompany.internal'];

  assert.equal(isDomainExcluded('example.com', exclusions), true);
  assert.equal(isDomainExcluded('localhost', exclusions), true);
  assert.equal(isDomainExcluded('mycompany.internal', exclusions), true);

  assert.equal(isDomainExcluded('other.com', exclusions), false);
  assert.equal(isDomainExcluded('google.com', exclusions), false);
});

test('Website Exclusions - Subdomain Match', () => {
  const exclusions = ['example.com', '*.internal.net'];

  // Implicit subdomain
  assert.equal(isDomainExcluded('app.example.com', exclusions), true);
  assert.equal(isDomainExcluded('staging.app.example.com', exclusions), true);

  // Wildcard subdomain
  assert.equal(isDomainExcluded('jira.internal.net', exclusions), true);
  assert.equal(isDomainExcluded('internal.net', exclusions), true);

  // Unrelated domains
  assert.equal(isDomainExcluded('notexample.com', exclusions), false);
  assert.equal(isDomainExcluded('example.org', exclusions), false);
});

test('Website Exclusions - Case Insensitivity and Edge Cases', () => {
  const exclusions = ['GitHub.Com', ' LocalHost '];

  assert.equal(isDomainExcluded('github.com', exclusions), true);
  assert.equal(isDomainExcluded('GITHUB.COM', exclusions), true);
  assert.equal(isDomainExcluded('api.github.com', exclusions), true);
  assert.equal(isDomainExcluded('localhost', exclusions), true);

  assert.equal(isDomainExcluded('', exclusions), false);
  assert.equal(isDomainExcluded(null, exclusions), false);
  assert.equal(isDomainExcluded(undefined, exclusions), false);
});
