/**
 * Privacy Shield - Content Script Coordinator
 * Orchestrates detection, visual blurring, DOM observation, and message exchange.
 */

import { storageService } from '../shared/storage.js';
import { DEFAULT_CONFIG, isDomainExcluded } from '../shared/config.js';
import { browserAPI } from '../shared/browser-api.js';
import { Detector } from './detector.js';
import { BlurManager } from './blur.js';
import { RevealManager } from './reveal.js';
import { DomScanner } from './scanner.js';
import { DomObserver } from './observer.js';
import { ShadowDomHandler } from './shadow-dom.js';

// Safe DOM Reconciliation Guard fallback for all browser contexts
try {
  const guardScript = document.createElement('script');
  guardScript.textContent = `
    (function() {
      if (window.__PRIVACY_SHIELD_GUARD__) return;
      window.__PRIVACY_SHIELD_GUARD__ = true;
      try {
        const origRemove = Node.prototype.removeChild;
        Node.prototype.removeChild = function(c) {
          if (!c) return null;
          if (c.parentNode !== this) {
            if (c.parentNode) {
              try { return c.parentNode.removeChild(c); } catch(e) { return c; }
            }
            return c;
          }
          return origRemove.call(this, c);
        };
        const origInsert = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function(n, r) {
          if (!n) return null;
          if (r && r.parentNode !== this) return this.appendChild(n);
          return origInsert.call(this, n, r);
        };
      } catch(e) {}
    })();
  `;
  (document.head || document.documentElement).appendChild(guardScript);
  guardScript.remove();
} catch (e) {}

class PrivacyShieldController {
  constructor() {
    this.hostname = window.location.hostname;
    // 1. Immediately initialize with DEFAULT_CONFIG for instant 0ms pre-paint protection
    this.settings = { ...DEFAULT_CONFIG };
    this.detector = null;
    this.blurManager = null;
    this.revealManager = null;
    this.scanner = null;
    this.observer = null;
    this.shadowHandler = null;
    this.isActive = false;

    // Activate immediately so zero frames are ever painted unblurred
    this.evaluateState();
    this.init();
  }

  async init() {
    try {
      const stored = await storageService.getSettings();
      if (stored) {
        this.settings = stored;
        this.evaluateState();
      }
      this.listenForMessages();
      this.listenForStorageChanges();
    } catch (err) {
      console.warn('[Privacy Shield] Initialization error:', err);
    }
  }

  evaluateState() {
    const isExcluded = isDomainExcluded(this.hostname, this.settings.excludedDomains);
    const shouldBeActive = Boolean(this.settings.enabled && !isExcluded);

    if (shouldBeActive) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  activate() {
    if (this.isActive) return;
    this.isActive = true;

    // Instantiate engine components
    this.detector = new Detector(this.settings.categories);

    this.blurManager = new BlurManager({
      blurRadius: this.settings.blurRadius || 6,
      onCountChanged: (count) => this.sendCountToBackground(count)
    });

    this.revealManager = new RevealManager({
      revealOnHover: this.settings.revealOnHover,
      revealOnClick: this.settings.revealOnClick,
      reblurTimeout: this.settings.reblurTimeout,
      allowPinReveal: this.settings.allowPinReveal
    });

    this.scanner = new DomScanner(this.detector, this.blurManager);
    this.observer = new DomObserver(this.scanner);
    this.shadowHandler = new ShadowDomHandler(this.scanner);

    // Scan on dynamic user interactions (such as opening popups, menus, or modals)
    this.handleInteraction = (e) => {
      if (!this.isActive || !this.scanner) return;
      const target = e && e.target instanceof Element ? e.target : null;
      if (target && !target.closest('button, a, [role="button"], [aria-haspopup], [aria-expanded], img, svg')) {
        return;
      }
      [100, 350].forEach(delay => {
        setTimeout(() => {
          if (!this.isActive || !this.scanner) return;
          const root = document.documentElement || document.body;
          if (!root) return;
          const popups = root.querySelectorAll(
            '[role="dialog"], [role="menu"], [aria-expanded="true"], [aria-haspopup="true"], [class*="popup" i], [class*="modal" i], [class*="dropdown" i], [class*="menu" i], iframe'
          );
          popups.forEach(p => {
            if (p.tagName === 'IFRAME') {
              try {
                if (p.contentDocument && p.contentDocument.body) {
                  this.scanner.scanSubtree(p.contentDocument.body);
                }
              } catch (err) {}
            } else {
              this.scanner.scanSubtree(p);
            }
          });
        }, delay);
      });
    };

    document.addEventListener('click', this.handleInteraction, { capture: true, passive: true });

    // Scan helper
    const doScan = () => {
      if (this.isActive && this.scanner && document.body) {
        this.scanner.scanSubtree(document.body);
        this.shadowHandler.scanShadowRoots(document);
      }
    };

    const startLifecycle = () => {
      if (!this.isActive) return;
      doScan();
      if (this.observer) {
        this.observer.start();
      }
    };

    // Safe hydration lifecycle:
    // If the HTML document is still actively parsing/streaming from server,
    // wait until DOMContentLoaded so React/Next.js hydration completes without interruption!
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startLifecycle, { once: true });
    } else {
      startLifecycle();
    }

    // Window load event sweep
    window.addEventListener('load', () => {
      if (this.isActive) doScan();
    }, { once: true });

    // Safe periodic sweeps for SPAs where async data arrives over WebSocket / fetch
    [400, 1000, 2000].forEach(delay => {
      setTimeout(() => {
        if (this.isActive) doScan();
      }, delay);
    });
  }

  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.handleInteraction) {
      document.removeEventListener('click', this.handleInteraction, { capture: true, passive: true });
      this.handleInteraction = null;
    }

    if (this.observer) {
      this.observer.stop();
      this.observer = null;
    }

    if (this.blurManager) {
      this.blurManager.clearAll();
      this.blurManager = null;
    }

    if (this.revealManager) {
      this.revealManager.detachGlobalListeners();
      this.revealManager = null;
    }

    this.sendCountToBackground(0);
  }

  sendCountToBackground(count) {
    if (window === window.top || count > 0) {
      browserAPI.sendMessage({
        action: 'UPDATE_BADGE_COUNT',
        count: count,
        domain: this.hostname
      });
    }
  }

  listenForMessages() {
    browserAPI.onMessage((msg, sender, sendResponse) => {
      if (!msg || !msg.action) return;

      switch (msg.action) {
        case 'GET_PAGE_STATUS': {
          // If in an iframe with 0 items, let the top frame respond
          if (window !== window.top && (!this.blurManager || this.blurManager.getCount() === 0)) {
            return false;
          }

          // Trigger a scan on popup open to guarantee fresh real-time count
          if (this.isActive && this.scanner && document.body) {
            this.scanner.scanSubtree(document.body);
          }

          const isExcluded = isDomainExcluded(this.hostname, this.settings ? this.settings.excludedDomains : []);
          sendResponse({
            enabled: this.settings ? this.settings.enabled : true,
            isExcluded: isExcluded,
            isActive: this.isActive,
            hostname: this.hostname,
            count: this.blurManager ? this.blurManager.getCount() : 0,
            categories: this.settings ? this.settings.categories : {}
          });
          break;
        }

        case 'REVEAL_ALL_TEMPORARY': {
          if (this.blurManager) {
            document.querySelectorAll('.ps-shield-blur, .ps-shield-input').forEach(el => {
              el.classList.add('ps-revealed');
            });
          }
          sendResponse({ success: true });
          break;
        }

        case 'REBLUR_ALL': {
          if (this.blurManager) {
            document.querySelectorAll('.ps-shield-blur, .ps-shield-input').forEach(el => {
              el.classList.remove('ps-revealed', 'ps-pinned');
            });
          }
          sendResponse({ success: true });
          break;
        }

        case 'RESCAN_PAGE': {
          if (this.isActive && this.scanner && document.body) {
            this.scanner.scanSubtree(document.body);
            sendResponse({ success: true, count: this.blurManager.getCount() });
          } else {
            sendResponse({ success: false });
          }
          break;
        }
      }
      return true; // Keep message channel open for async response
    });
  }

  listenForStorageChanges() {
    browserAPI.onStorageChanged(async (changes, area) => {
      if (area === 'local' && changes.ps_settings) {
        const newSettings = changes.ps_settings.newValue;
        if (!newSettings) return;

        this.settings = newSettings;
        const isExcluded = isDomainExcluded(this.hostname, newSettings.excludedDomains);
        const shouldBeActive = Boolean(newSettings.enabled && !isExcluded);

        if (shouldBeActive !== this.isActive) {
          this.evaluateState();
        } else if (this.isActive) {
          // Update active components with new settings
          if (this.detector) this.detector.updateCategories(newSettings.categories);
          if (this.blurManager) this.blurManager.setBlurRadius(newSettings.blurRadius);
          if (this.revealManager) this.revealManager.updateConfig(newSettings);
          // Rescan with updated categories
          if (this.scanner && document.body) {
            this.scanner.scanSubtree(document.body);
          }
        }
      }
    });
  }
}

// Instantiate controller in the webpage
new PrivacyShieldController();
