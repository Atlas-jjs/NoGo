import { FALLBACK_LISTS } from './config.js';
import { updateCategoryBlocklists } from './updater.js';
import { checkUrlAgainstCategories } from './matcher.js';

// Handle web navigation blocking (custom lists and categories)
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only check main frame navigations

  const url = details.url;
  if (!url.startsWith("http")) return;

  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");

    // 1. Check custom user blocklist
    const { blockedWebsites } = await chrome.storage.sync.get(["blockedWebsites"]);
    if (blockedWebsites) {
      if (blockedWebsites.some(site => {
        // Strip the last TLD (e.g., example.com -> example)
        const lastDot = site.lastIndexOf(".");
        const siteBase = lastDot !== -1 ? site.substring(0, lastDot) : site;
        
        // Match hostname exactly, or as a subdomain/TLD variant
        const regex = new RegExp(`(^|\\.)${siteBase}\\.`);
        return regex.test(hostname) || hostname === siteBase;
      })) {
        const redirectUrl = chrome.runtime.getURL(`blocked.html?site=${hostname}&reason=manual`);
        chrome.tabs.update(details.tabId, { url: redirectUrl });
        return;
      }
    }

    // 2. Check categories
    const category = await checkUrlAgainstCategories(url);
    if (category) {
      const redirectUrl = chrome.runtime.getURL(`blocked.html?site=${hostname}&reason=${category}`);
      chrome.tabs.update(details.tabId, { url: redirectUrl });
    }
  } catch (err) {
    console.error("[NoGo] Navigation block error:", err);
  }
});

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_CATEGORY_LISTS") {
    chrome.storage.local.get(["categoryLists", "lastUpdated"]).then((data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "FORCE_UPDATE") {
    updateCategoryBlocklists().then(() => sendResponse({ success: true }));
    return true;
  }
});

// On install: load fallbacks immediately, then try to fetch live lists
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[NoGo] Extension installed. Loading default blocklists...");

  await chrome.storage.local.set({
    categoryLists: FALLBACK_LISTS,
    lastUpdated: Date.now(),
  });

  const { enabledCategories } = await chrome.storage.sync.get(["enabledCategories"]);
  if (!enabledCategories) {
    await chrome.storage.sync.set({
      enabledCategories: { nsfw: true, gambling: true, illegal: true },
    });
  }

  updateCategoryBlocklists().catch(console.error);
});

// Daily refresh alarm
chrome.alarms.create("refreshBlocklists", { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refreshBlocklists") {
    updateCategoryBlocklists().catch(console.error);
  }
});

// Startup: refresh if last update was > 24h ago
chrome.runtime.onStartup.addListener(async () => {
  const { lastUpdated } = await chrome.storage.local.get(["lastUpdated"]);
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (!lastUpdated || Date.now() - lastUpdated > oneDayMs) {
    updateCategoryBlocklists().catch(console.error);
  }
});
