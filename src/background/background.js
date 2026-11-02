/**
 * Privacy Shield - Background Service Worker / Script
 * Handles extension lifecycle, tab badges, context menus, and global state.
 */

import { DEFAULT_CONFIG } from '../shared/config.js';

const STORAGE_KEY = 'ps_settings';

// Extension Install & Upgrade lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  // Ensure default configuration exists
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    if (!res || !res[STORAGE_KEY]) {
      chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_CONFIG });
    }
  });

  // Setup Apple-styled Context Menus
  setupContextMenus();
});

function setupContextMenus() {
  if (!chrome.contextMenus) return;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ps_toggle_site',
      title: 'Exclude / Protect This Website',
      contexts: ['page', 'action']
    });

    chrome.contextMenus.create({
      id: 'ps_reveal_temp',
      title: 'Temporarily Reveal Protected Info',
      contexts: ['page', 'action']
    });

    chrome.contextMenus.create({
      id: 'ps_reblur_now',
      title: 'Re-blur All Information',
      contexts: ['page', 'action']
    });

    chrome.contextMenus.create({
      id: 'ps_open_settings',
      title: 'Privacy Shield Settings...',
      contexts: ['action']
    });
  });
}

// Handle Context Menu clicks
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) return;

    if (info.menuItemId === 'ps_open_settings') {
      chrome.runtime.openOptionsPage();
      return;
    }

    if (info.menuItemId === 'ps_reveal_temp') {
      chrome.tabs.sendMessage(tab.id, { action: 'REVEAL_ALL_TEMPORARY' });
      return;
    }

    if (info.menuItemId === 'ps_reblur_now') {
      chrome.tabs.sendMessage(tab.id, { action: 'REBLUR_ALL' });
      return;
    }

    if (info.menuItemId === 'ps_toggle_site') {
      if (!tab.url) return;
      try {
        const url = new URL(tab.url);
        const host = url.hostname.toLowerCase();

        chrome.storage.local.get([STORAGE_KEY], (res) => {
          const config = res[STORAGE_KEY] || { ...DEFAULT_CONFIG };
          const excluded = Array.isArray(config.excludedDomains) ? config.excludedDomains : [];
          const idx = excluded.indexOf(host);

          if (idx >= 0) {
            excluded.splice(idx, 1);
          } else {
            excluded.push(host);
          }

          config.excludedDomains = excluded;
          chrome.storage.local.set({ [STORAGE_KEY]: config });
        });
      } catch (e) {
        console.warn('Could not parse tab URL for exclusion:', e);
      }
    }
  });
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === 'UPDATE_BADGE_COUNT') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId !== null) {
      updateBadge(tabId, msg.count);
    }
    sendResponse({ success: true });
    return true;
  }
});

function updateBadge(tabId, count) {
  if (!chrome.action && !chrome.browserAction) return;
  const actionApi = chrome.action || chrome.browserAction;

  if (count > 0) {
    actionApi.setBadgeText({ tabId, text: count.toString() });
    actionApi.setBadgeBackgroundColor({ tabId, color: '#34C759' }); // Apple Emerald Green
  } else {
    actionApi.setBadgeText({ tabId, text: '' });
  }
}
