/**
 * Privacy Shield - Settings Page Controller
 * Controls settings persistence, exclusion management, and the interactive test sandbox.
 */

import { storageService } from '../shared/storage.js';
import { DEFAULT_CONFIG } from '../shared/config.js';
import { Detector } from '../content/detector.js';
import { BlurManager } from '../content/blur.js';
import { RevealManager } from '../content/reveal.js';
import { DomScanner } from '../content/scanner.js';

class SettingsController {
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
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.tab-panel');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.dataset.tab;
        navItems.forEach(i => i.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        item.classList.add('active');
        const targetPanel = document.getElementById(`tab-${targetTab}`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  }

  bindControls() {
    // 1. General Settings
    const masterToggle = document.getElementById('settingMasterToggle');
    masterToggle.addEventListener('change', async (e) => {
      await storageService.setEnabled(e.target.checked);
    });

    const revealClick = document.getElementById('settingRevealClick');
    revealClick.addEventListener('change', async (e) => {
      await storageService.saveSettings({ revealOnClick: e.target.checked });
    });

    const revealHover = document.getElementById('settingRevealHover');
    revealHover.addEventListener('change', async (e) => {
      await storageService.saveSettings({ revealOnHover: e.target.checked });
    });

    const allowPin = document.getElementById('settingAllowPin');
    allowPin.addEventListener('change', async (e) => {
      await storageService.saveSettings({ allowPinReveal: e.target.checked });
    });

    const reblurSlider = document.getElementById('settingReblurSlider');
    const reblurLabel = document.getElementById('reblurValLabel');
    reblurSlider.addEventListener('input', (e) => {
      const valSec = (e.target.value / 1000).toFixed(1);
      reblurLabel.textContent = `${valSec}s`;
    });
    reblurSlider.addEventListener('change', async (e) => {
      await storageService.saveSettings({ reblurTimeout: parseInt(e.target.value, 10) });
    });

    const blurRadiusSlider = document.getElementById('settingBlurRadius');
    const blurRadiusLabel = document.getElementById('blurRadiusValLabel');
    blurRadiusSlider.addEventListener('input', (e) => {
      blurRadiusLabel.textContent = `${e.target.value}px`;
    });
    blurRadiusSlider.addEventListener('change', async (e) => {
      await storageService.saveSettings({ blurRadius: parseInt(e.target.value, 10) });
    });

    // 2. Category Switches
    const catToggles = document.querySelectorAll('.setting-cat');
    catToggles.forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const cat = e.target.dataset.cat;
        await storageService.setCategory(cat, e.target.checked);
      });
    });

    // 3. Exclusions
    const addBtn = document.getElementById('addDomainBtn');
    const domainInput = document.getElementById('newDomainInput');
    const searchInput = document.getElementById('searchExclusionsInput');

    const handleAddDomain = async () => {
      const domain = domainInput.value.trim();
      if (!domain) return;
      await storageService.addExclusion(domain);
      domainInput.value = '';
      this.settings = await storageService.getSettings();
      this.renderExclusionsList();
    };

    addBtn.addEventListener('click', handleAddDomain);
    domainInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddDomain();
    });

    searchInput.addEventListener('input', () => {
      this.renderExclusionsList(searchInput.value.trim().toLowerCase());
    });

    // 4. Reset Button
    const resetBtn = document.getElementById('resetSettingsBtn');
    resetBtn.addEventListener('click', async () => {
      if (confirm('Reset all Privacy Shield settings to default values?')) {
        await storageService.resetToDefaults();
        this.settings = await storageService.getSettings();
        this.populateUI();
      }
    });
  }

  populateUI() {
    if (!this.settings) return;

    // General
    document.getElementById('settingMasterToggle').checked = Boolean(this.settings.enabled);
    document.getElementById('settingRevealClick').checked = Boolean(this.settings.revealOnClick);
    document.getElementById('settingRevealHover').checked = Boolean(this.settings.revealOnHover);
    document.getElementById('settingAllowPin').checked = Boolean(this.settings.allowPinReveal);

    const reblurSlider = document.getElementById('settingReblurSlider');
    reblurSlider.value = this.settings.reblurTimeout || 4000;
    document.getElementById('reblurValLabel').textContent = `${(reblurSlider.value / 1000).toFixed(1)}s`;

    const blurRadiusSlider = document.getElementById('settingBlurRadius');
    blurRadiusSlider.value = this.settings.blurRadius || 6;
    document.getElementById('blurRadiusValLabel').textContent = `${blurRadiusSlider.value}px`;

    // Categories
    const catToggles = document.querySelectorAll('.setting-cat');
    catToggles.forEach(toggle => {
      const cat = toggle.dataset.cat;
      toggle.checked = this.settings.categories[cat] !== false;
    });

    // Exclusions
    this.renderExclusionsList();
  }

  renderExclusionsList(filter = '') {
    const container = document.getElementById('exclusionListContainer');
    const countLabel = document.getElementById('exclusionCountLabel');
    const domains = this.settings.excludedDomains || [];

    countLabel.textContent = domains.length.toString();
    container.innerHTML = '';

    const filtered = domains.filter(d => !filter || d.toLowerCase().includes(filter));

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-exclusions';
      empty.textContent = domains.length === 0 
        ? 'No website exclusions configured yet.' 
        : 'No exclusions match your search filter.';
      container.appendChild(empty);
      return;
    }

    filtered.forEach(domain => {
      const row = document.createElement('div');
      row.className = 'exclusion-row';

      const label = document.createElement('span');
      label.className = 'domain-name';
      label.textContent = domain;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-domain-btn';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', async () => {
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
    const sandboxArea = document.getElementById('sandboxPreviewArea');
    const scanBtn = document.getElementById('sandboxScanBtn');

    const detector = new Detector(this.settings.categories);
    this.sandboxBlurManager = new BlurManager({ blurRadius: this.settings.blurRadius });
    this.sandboxRevealManager = new RevealManager({
      revealOnClick: this.settings.revealOnClick,
      revealOnHover: this.settings.revealOnHover,
      reblurTimeout: this.settings.reblurTimeout,
      allowPinReveal: this.settings.allowPinReveal
    });

    this.sandboxScanner = new DomScanner(detector, this.sandboxBlurManager);

    // Initial Sandbox Scan
    this.sandboxScanner.scanSubtree(sandboxArea);

    scanBtn.addEventListener('click', () => {
      detector.updateCategories(this.settings.categories);
      this.sandboxBlurManager.setBlurRadius(this.settings.blurRadius);
      this.sandboxScanner.scanSubtree(sandboxArea);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});
