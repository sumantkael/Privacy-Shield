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

// src/popup/popup.js
var PopupController = class {
  constructor() {
    this.currentTab = null;
    this.currentDomain = "";
    this.settings = null;
    this.pageStatus = null;
    this.dom = {
      masterToggle: document.getElementById("masterToggle"),
      statusDot: document.getElementById("statusDot"),
      statusLabel: document.getElementById("statusLabel"),
      protectedCount: document.getElementById("protectedCount"),
      currentDomain: document.getElementById("currentDomain"),
      siteToggle: document.getElementById("siteToggle"),
      openSettingsBtn: document.getElementById("openSettingsBtn"),
      quickRevealBtn: document.getElementById("quickRevealBtn"),
      quickReblurBtn: document.getElementById("quickReblurBtn"),
      segClick: document.getElementById("segClick"),
      segHover: document.getElementById("segHover"),
      categoryToggles: document.querySelectorAll(".cat-toggle")
    };
    this.init();
  }
  async init() {
    this.bindEvents();
    await this.loadActiveTab();
    await this.refreshUI();
  }
  bindEvents() {
    this.dom.masterToggle.addEventListener("change", async (e) => {
      const enabled = e.target.checked;
      await storageService.setEnabled(enabled);
      this.updateStatusDisplay();
    });
    this.dom.siteToggle.addEventListener("change", async (e) => {
      const isProtected = e.target.checked;
      if (!this.currentDomain) return;
      if (isProtected) {
        await storageService.removeExclusion(this.currentDomain);
      } else {
        await storageService.addExclusion(this.currentDomain);
      }
      this.updateStatusDisplay();
    });
    this.dom.segClick.addEventListener("click", async () => {
      await storageService.saveSettings({ revealOnHover: false, revealOnClick: true });
      this.updateSegmentedControl(false);
    });
    this.dom.segHover.addEventListener("click", async () => {
      await storageService.saveSettings({ revealOnHover: true, revealOnClick: true });
      this.updateSegmentedControl(true);
    });
    this.dom.categoryToggles.forEach((toggle) => {
      toggle.addEventListener("change", async (e) => {
        const catKey = e.target.dataset.cat;
        const isChecked = e.target.checked;
        await storageService.setCategory(catKey, isChecked);
      });
    });
    this.dom.quickRevealBtn.addEventListener("click", async () => {
      if (this.currentTab && this.currentTab.id) {
        await browserAPI.sendMessageToTab(this.currentTab.id, { action: "REVEAL_ALL_TEMPORARY" });
      }
    });
    this.dom.quickReblurBtn.addEventListener("click", async () => {
      if (this.currentTab && this.currentTab.id) {
        await browserAPI.sendMessageToTab(this.currentTab.id, { action: "REBLUR_ALL" });
      }
    });
    this.dom.openSettingsBtn.addEventListener("click", () => {
      browserAPI.openOptionsPage();
    });
  }
  async loadActiveTab() {
    try {
      this.currentTab = await browserAPI.getActiveTab();
      if (this.currentTab && this.currentTab.url) {
        const url = new URL(this.currentTab.url);
        if (url.protocol.startsWith("http")) {
          this.currentDomain = url.hostname.toLowerCase();
          this.dom.currentDomain.textContent = this.currentDomain;
        } else {
          this.currentDomain = "";
          this.dom.currentDomain.textContent = "Browser Internal Page";
          this.dom.siteToggle.disabled = true;
        }
      }
    } catch (e) {
      this.dom.currentDomain.textContent = "Unavailable";
    }
  }
  async refreshUI() {
    this.settings = await storageService.getSettings();
    this.dom.masterToggle.checked = Boolean(this.settings.enabled);
    this.updateSegmentedControl(this.settings.revealOnHover);
    this.dom.categoryToggles.forEach((toggle) => {
      const cat = toggle.dataset.cat;
      toggle.checked = this.settings.categories[cat] !== false;
    });
    if (this.currentTab && this.currentTab.id) {
      try {
        const response = await browserAPI.sendMessageToTab(this.currentTab.id, { action: "GET_PAGE_STATUS" });
        if (response) {
          this.pageStatus = response;
          this.dom.protectedCount.textContent = response.count || 0;
        }
      } catch (err) {
      }
    }
    this.updateStatusDisplay();
  }
  updateSegmentedControl(hoverEnabled) {
    if (hoverEnabled) {
      this.dom.segHover.classList.add("active");
      this.dom.segClick.classList.remove("active");
    } else {
      this.dom.segClick.classList.add("active");
      this.dom.segHover.classList.remove("active");
    }
  }
  updateStatusDisplay() {
    if (!this.settings) return;
    const isGlobalOn = this.settings.enabled;
    const isExcluded = this.currentDomain ? this.settings.excludedDomains.some((d) => this.currentDomain === d || this.currentDomain.endsWith("." + d)) : false;
    this.dom.siteToggle.checked = !isExcluded;
    if (!isGlobalOn) {
      this.dom.statusDot.className = "status-dot paused";
      this.dom.statusLabel.textContent = "Protection Paused";
    } else if (isExcluded) {
      this.dom.statusDot.className = "status-dot excluded";
      this.dom.statusLabel.textContent = "Excluded on this Site";
    } else {
      this.dom.statusDot.className = "status-dot active";
      this.dom.statusLabel.textContent = "Shield Active";
    }
  }
};
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});
