/**
 * Privacy Shield - Settings & Storage Manager
 * Type-safe access to persistent user settings with fallback to defaults.
 */

import { DEFAULT_CONFIG } from './config.js';
import { browserAPI } from './browser-api.js';

const STORAGE_KEY = 'ps_settings';

export class StorageService {
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

      // Merge deeply with default config
      const merged = {
        ...DEFAULT_CONFIG,
        ...stored,
        categories: {
          ...DEFAULT_CONFIG.categories,
          ...(stored.categories || {})
        },
        excludedDomains: Array.isArray(stored.excludedDomains) 
          ? stored.excludedDomains 
          : DEFAULT_CONFIG.excludedDomains
      };

      this.cache = merged;
      return merged;
    } catch (err) {
      console.warn('[Privacy Shield] Storage read error, falling back to defaults:', err);
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
          ...(newSettings.categories || {})
        }
      };

      await this.storage.set({ [STORAGE_KEY]: updated });
      this.cache = updated;
      return updated;
    } catch (err) {
      console.error('[Privacy Shield] Failed to persist settings:', err);
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
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
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
    const filtered = (current.excludedDomains || []).filter(d => d.toLowerCase().trim() !== cleanDomain);
    return this.saveSettings({ excludedDomains: filtered });
  }

  /**
   * Checks if a domain is excluded
   */
  async isDomainExcluded(hostname) {
    const settings = await this.getSettings();
    if (!hostname || !settings.excludedDomains) return false;
    const clean = hostname.toLowerCase().trim();
    return settings.excludedDomains.some(entry => {
      const pattern = entry.toLowerCase().trim();
      if (clean === pattern) return true;
      if (clean.endsWith('.' + pattern)) return true;
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
}

export const storageService = new StorageService();
