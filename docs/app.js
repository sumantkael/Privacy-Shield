/**
 * Privacy Shield - Apple Style Landing Page Client Logic
 * Interactive hero demo, real-time regex sandbox, and download manager.
 * Strict rules: Zero emojis, zero emdashes.
 */

// Preset detection samples
const PRESETS = {
  email: 'Hello Sarah, your security report has been sent to sarah.connor@cyberdyne.org for your team records.',
  card: 'Order total is $189.50 paid with Visa ending in 4532 0150 1234 5671 and exp 08/29.',
  apikey: 'Export your production metrics using export OPENAI_API_KEY="sk-proj-98a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1" in bash.',
  jwt: 'User session verified with JWT token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisToken44 for dashboard access.',
  phone: 'Direct dispatch emergency contact is +1 (555) 234-5678 or reach our secondary line at 020 7946 0912.',
  otp: 'Your one-time authentication passcode is 849204. Do not share this code with anyone.'
};

// Client-side lightweight detection engine for interactive sandbox
function detectMatches(text) {
  const matches = [];

  // Email regex
  const emailRegex = /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g;
  let m;
  while ((m = emailRegex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, badge: 'Email' });
  }

  // Credit card regex (13-19 digits)
  const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  while ((m = cardRegex.exec(text)) !== null) {
    const clean = m[0].replace(/\D/g, '');
    if (clean.length >= 13 && clean.length <= 19) {
      matches.push({ start: m.index, end: m.index + m[0].length, badge: 'Card' });
    }
  }

  // API keys
  const apiKeyRegex = /\b(?:sk-[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9_-]{40,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})\b/g;
  while ((m = apiKeyRegex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, badge: 'Key' });
  }

  // JWT Token
  const jwtRegex = /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g;
  while ((m = jwtRegex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, badge: 'Token' });
  }

  // Phone regex
  const phoneRegex = /(?<!\d)(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,5}(?!\d)/g;
  while ((m = phoneRegex.exec(text)) !== null) {
    if (m[0].replace(/\D/g, '').length >= 7) {
      // Don't overlap with card
      const overlaps = matches.some(x => !(m.index >= x.end || (m.index + m[0].length) <= x.start));
      if (!overlaps) {
        matches.push({ start: m.index, end: m.index + m[0].length, badge: 'Phone' });
      }
    }
  }

  // OTP regex
  const otpRegex = /(?:otp|one-time|code|verification|passcode|2fa|pin)[\s:#=-]*(?:is\s+)?\b(\d{4,8})\b/gi;
  while ((m = otpRegex.exec(text)) !== null) {
    if (m[1]) {
      const idx = text.indexOf(m[1], m.index);
      matches.push({ start: idx, end: idx + m[1].length, badge: 'OTP' });
    }
  }

  // Sort and resolve overlaps
  matches.sort((a, b) => a.start - b.start);
  const cleanMatches = [];
  let lastEnd = 0;
  for (const item of matches) {
    if (item.start >= lastEnd) {
      cleanMatches.push(item);
      lastEnd = item.end;
    }
  }

  return cleanMatches;
}

// Render blurred HTML
function renderBlurredHTML(rawText) {
  const matches = detectMatches(rawText);
  if (matches.length === 0) {
    return escapeHtml(rawText);
  }

  let html = '';
  let currentIdx = 0;

  for (const match of matches) {
    if (match.start > currentIdx) {
      html += escapeHtml(rawText.substring(currentIdx, match.start));
    }

    const sensitiveVal = rawText.substring(match.start, match.end);
    html += `<mark class="ps-shield-blur" tabindex="0" role="button" aria-label="Protected ${match.badge}">`;
    html += escapeHtml(sensitiveVal);
    html += `</mark>`;

    currentIdx = match.end;
  }

  if (currentIdx < rawText.length) {
    html += escapeHtml(rawText.substring(currentIdx));
  }

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Interactive Pin & Reveal logic
function attachRevealListeners(container) {
  container.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.ps-shield-blur');
    if (!target) return;
    revealElement(target);
  });

  container.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.ps-shield-blur');
    if (!target) return;
    if (target.classList.contains('ps-pinned')) return;
    setTimeout(() => {
      if (!target.matches(':hover') && !target.classList.contains('ps-pinned')) {
        reblurElement(target);
      }
    }, 400);
  });

  container.addEventListener('click', (e) => {
    if (e.target.closest('.ps-pin-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target.closest('.ps-shield-blur');
      if (target) togglePinElement(target);
      return;
    }

    const target = e.target.closest('.ps-shield-blur');
    if (!target) return;
    if (target.classList.contains('ps-revealed')) {
      if (!target.classList.contains('ps-pinned')) {
        reblurElement(target);
      }
    } else {
      revealElement(target);
    }
  });
}

function revealElement(el) {
  el.classList.add('ps-revealed');
  if (!el.querySelector('.ps-pin-btn')) {
    const isPinned = el.classList.contains('ps-pinned');
    const pinBtn = document.createElement('button');
    pinBtn.className = 'ps-pin-btn' + (isPinned ? ' active' : '');
    pinBtn.title = isPinned ? 'Pinned (Click to unpin)' : 'Keep revealed (Pin)';
    pinBtn.setAttribute('aria-label', 'Pin revealed');
    pinBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12">
        <path d="M16 3H8C7.45 3 7 3.45 7 4V6C7 7.1 6.55 8.15 5.76 8.94L4.29 10.41C4.04 10.66 4.18 11 4.54 11H10V18L12 21L14 18V11H19.46C19.82 11 19.96 10.66 19.71 10.41L18.24 8.94C17.45 8.15 17 7.1 17 6V4C17 3.45 16.55 3 16 3Z" fill="#FFFFFF"></path>
      </svg>
    `;
    el.appendChild(pinBtn);
  }
}

function reblurElement(el) {
  el.classList.remove('ps-revealed', 'ps-pinned');
  const pinBtn = el.querySelector('.ps-pin-btn');
  if (pinBtn) pinBtn.remove();
}

function togglePinElement(el) {
  const pinBtn = el.querySelector('.ps-pin-btn');
  if (el.classList.contains('ps-pinned')) {
    el.classList.remove('ps-pinned');
    if (pinBtn) pinBtn.classList.remove('active');
  } else {
    el.classList.add('ps-revealed', 'ps-pinned');
    if (pinBtn) pinBtn.classList.add('active');
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Hero Mockup interactions
  const mockupContent = document.querySelector('.browser-content');
  if (mockupContent) {
    attachRevealListeners(mockupContent);
  }

  // 2. Setup Sandbox
  const sandboxInput = document.getElementById('sandboxInput');
  const sandboxOutput = document.getElementById('sandboxOutput');
  const presetChips = document.querySelectorAll('.preset-chip');

  function updateSandbox() {
    if (!sandboxInput || !sandboxOutput) return;
    const text = sandboxInput.value;
    sandboxOutput.innerHTML = renderBlurredHTML(text);
  }

  if (sandboxInput) {
    sandboxInput.addEventListener('input', updateSandbox);
    // Initial sandbox content
    sandboxInput.value = PRESETS.email;
    updateSandbox();
  }

  if (sandboxOutput) {
    attachRevealListeners(sandboxOutput);
  }

  // Preset chips click handling
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const key = chip.dataset.preset;
      if (PRESETS[key] && sandboxInput) {
        sandboxInput.value = PRESETS[key];
        updateSandbox();
      }
    });
  });

  // 3. Interactive One-Click URL & Parameter Copy UX
  const copyElements = document.querySelectorAll('.url-copy-box, .copyable-box');
  copyElements.forEach(box => {
    function handleCopy() {
      const textToCopy = box.dataset.copy || (box.querySelector('.url-copy-code, code') ? box.querySelector('.url-copy-code, code').textContent.trim() : '');
      if (!textToCopy) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showCopied(box);
        }).catch(() => {
          fallbackCopy(textToCopy, box);
        });
      } else {
        fallbackCopy(textToCopy, box);
      }
    }

    box.addEventListener('click', handleCopy);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCopy();
      }
    });
  });

  function showCopied(box) {
    box.classList.add('copied');
    const label = box.querySelector('.copy-label, .copy-pill');
    if (label) {
      const original = label.textContent;
      label.textContent = 'Copied!';
      setTimeout(() => {
        label.textContent = original;
        box.classList.remove('copied');
      }, 2000);
    } else {
      setTimeout(() => {
        box.classList.remove('copied');
      }, 2000);
    }
  }

  function fallbackCopy(text, box) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showCopied(box);
    } catch (e) {
      // Ignored
    }
    document.body.removeChild(textArea);
  }

  // 4. Interactive 3D Perspective Tilt on Browser Mockup
  const heroMockupWrapper = document.getElementById('heroMockupWrapper');
  const browserMockup = document.getElementById('browserMockup');
  const floatingBadges = document.querySelectorAll('.floating-badge');

  if (heroMockupWrapper && browserMockup) {
    let bounds = null;

    function updateBounds() {
      bounds = heroMockupWrapper.getBoundingClientRect();
    }
    updateBounds();
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, { passive: true });

    heroMockupWrapper.addEventListener('mousemove', (e) => {
      if (!bounds) updateBounds();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;

      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;

      // Subtle Apple-style 3D tilt
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      browserMockup.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      browserMockup.style.setProperty('--mouse-x', `${x}px`);
      browserMockup.style.setProperty('--mouse-y', `${y}px`);

      // Parallax effect on floating badges
      floatingBadges.forEach(badge => {
        const factor = parseFloat(badge.dataset.parallax || '0.5');
        const moveX = ((x - centerX) / centerX) * (14 * factor);
        const moveY = ((y - centerY) / centerY) * (14 * factor);
        badge.style.transform = `translate(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px)`;
      });
    });

    heroMockupWrapper.addEventListener('mouseleave', () => {
      browserMockup.style.transform = 'rotateX(0deg) rotateY(0deg)';
      floatingBadges.forEach(badge => {
        badge.style.transform = 'translate(0px, 0px)';
      });
    });
  }

  // 5. Scroll Reveal Animations
  const revealTargets = document.querySelectorAll(
    '.install-block-card, .comparison-card, .diagram-card, .tech-card, .usecase-card, .security-card, .sandbox-card'
  );

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    revealTargets.forEach(el => {
      el.classList.add('reveal-on-scroll');
      observer.observe(el);
    });
  }
});
