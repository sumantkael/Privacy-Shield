/**
 * Privacy Shield - Extension Popup Controller
 * Manages live status, master switches, categories, exclusions, and settings shortcut.
 */

import { storageService } from '../shared/storage.js';
import { browserAPI } from '../shared/browser-api.js';

class PopupController {
  constructor() {
    this.currentTab = null;
    this.currentDomain = '';
    this.settings = null;
    this.pageStatus = null;

    this.dom = {
      masterToggle: document.getElementById('masterToggle'),
      statusDot: document.getElementById('statusDot'),
      statusLabel: document.getElementById('statusLabel'),
      protectedCount: document.getElementById('protectedCount'),
      currentDomain: document.getElementById('currentDomain'),
      siteToggle: document.getElementById('siteToggle'),
      openSettingsBtn: document.getElementById('openSettingsBtn'),
      quickRevealBtn: document.getElementById('quickRevealBtn'),
      quickReblurBtn: document.getElementById('quickReblurBtn'),
      segClick: document.getElementById('segClick'),
      segHover: document.getElementById('segHover'),
      categoryToggles: document.querySelectorAll('.cat-toggle')
    };

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadActiveTab();
    await this.refreshUI();
  }

  bindEvents() {
    // Master Switch
    this.dom.masterToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await storageService.setEnabled(enabled);
      this.updateStatusDisplay();
    });

    // Site Exclusion Toggle
    this.dom.siteToggle.addEventListener('change', async (e) => {
      const isProtected = e.target.checked;
      if (!this.currentDomain) return;

      if (isProtected) {
        await storageService.removeExclusion(this.currentDomain);
      } else {
        await storageService.addExclusion(this.currentDomain);
      }
      this.updateStatusDisplay();
    });

    // Reveal Mode Segmented Controls
    this.dom.segClick.addEventListener('click', async () => {
      await storageService.saveSettings({ revealOnHover: false, revealOnClick: true });
      this.updateSegmentedControl(false);
    });

    this.dom.segHover.addEventListener('click', async () => {
      await storageService.saveSettings({ revealOnHover: true, revealOnClick: true });
      this.updateSegmentedControl(true);
    });

    // Category Toggles
    this.dom.categoryToggles.forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const catKey = e.target.dataset.cat;
        const isChecked = e.target.checked;
        await storageService.setCategory(catKey, isChecked);
      });
    });

    // Quick Action: Reveal All
    this.dom.quickRevealBtn.addEventListener('click', async () => {
      if (this.currentTab && this.currentTab.id) {
        await browserAPI.sendMessageToTab(this.currentTab.id, { action: 'REVEAL_ALL_TEMPORARY' });
      }
    });

    // Quick Action: Re-blur All
    this.dom.quickReblurBtn.addEventListener('click', async () => {
      if (this.currentTab && this.currentTab.id) {
        await browserAPI.sendMessageToTab(this.currentTab.id, { action: 'REBLUR_ALL' });
      }
    });

    // Open Settings Page
    this.dom.openSettingsBtn.addEventListener('click', () => {
      browserAPI.openOptionsPage();
    });
  }

  async loadActiveTab() {
    try {
      this.currentTab = await browserAPI.getActiveTab();
      if (this.currentTab && this.currentTab.url) {
        const url = new URL(this.currentTab.url);
        // Exclude internal chrome/firefox/file pages
        if (url.protocol.startsWith('http')) {
          this.currentDomain = url.hostname.toLowerCase();
          this.dom.currentDomain.textContent = this.currentDomain;
        } else {
          this.currentDomain = '';
          this.dom.currentDomain.textContent = 'Browser Internal Page';
          this.dom.siteToggle.disabled = true;
        }
      }
    } catch (e) {
      this.dom.currentDomain.textContent = 'Unavailable';
    }
  }

  async refreshUI() {
    this.settings = await storageService.getSettings();

    // 1. Master Toggle
    this.dom.masterToggle.checked = Boolean(this.settings.enabled);

    // 2. Segmented Reveal Mode
    this.updateSegmentedControl(this.settings.revealOnHover);

    // 3. Category Toggles
    this.dom.categoryToggles.forEach(toggle => {
      const cat = toggle.dataset.cat;
      toggle.checked = this.settings.categories[cat] !== false;
    });

    // 4. Query current page content script for live count & status
    if (this.currentTab && this.currentTab.id) {
      try {
        const response = await browserAPI.sendMessageToTab(this.currentTab.id, { action: 'GET_PAGE_STATUS' });
        if (response) {
          this.pageStatus = response;
          this.dom.protectedCount.textContent = response.count || 0;
        }
      } catch (err) {
        // Tab might not have content script loaded (e.g. extension page)
      }
    }

    this.updateStatusDisplay();
  }

  updateSegmentedControl(hoverEnabled) {
    if (hoverEnabled) {
      this.dom.segHover.classList.add('active');
      this.dom.segClick.classList.remove('active');
    } else {
      this.dom.segClick.classList.add('active');
      this.dom.segHover.classList.remove('active');
    }
  }

  updateStatusDisplay() {
    if (!this.settings) return;

    const isGlobalOn = this.settings.enabled;
    const isExcluded = this.currentDomain 
      ? this.settings.excludedDomains.some(d => this.currentDomain === d || this.currentDomain.endsWith('.' + d))
      : false;

    // Site toggle reflects if site is protected
    this.dom.siteToggle.checked = !isExcluded;

    if (!isGlobalOn) {
      this.dom.statusDot.className = 'status-dot paused';
      this.dom.statusLabel.textContent = 'Protection Paused';
    } else if (isExcluded) {
      this.dom.statusDot.className = 'status-dot excluded';
      this.dom.statusLabel.textContent = 'Excluded on this Site';
    } else {
      this.dom.statusDot.className = 'status-dot active';
      this.dom.statusLabel.textContent = 'Shield Active';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
