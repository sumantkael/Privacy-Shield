/**
 * Privacy Shield - Cross-Browser WebExtensions Compatibility Layer
 * Normalizes differences between Chrome (chrome.*) and Firefox (browser.*)
 */

class BrowserAPIAdapter {
  constructor() {
    this.isFirefox = typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
    this.api = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
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
            // Silence disconnected port error when popup or background is closed
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
        this.api.tabs.create({ url: this.getURL('settings/settings.html') }, () => resolve());
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
}

export const browserAPI = new BrowserAPIAdapter();
