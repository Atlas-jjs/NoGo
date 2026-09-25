// NoGo - Background Service Worker
// Handles automatic blocklist fetching and category management

const BLOCKLIST_SOURCES = {
  nsfw: [
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts",
  ],
  gambling: [
    "https://raw.githubusercontent.com/nicehash/NiceHashQuickMiner/master/lists/gambling.txt",
    "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/gambling.txt",
  ],
  illegal: [
    "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/threat-onlyfakes.txt",
  ],
};

// Fallback hardcoded lists in case fetches fail
const FALLBACK_LISTS = {
  nsfw: [
    "pornhub.com",
    "xvideos.com",
    "xnxx.com",
    "xhamster.com",
    "redtube.com",
    "youporn.com",
    "tube8.com",
    "spankbang.com",
    "eporner.com",
    "beeg.com",
    "tnaflix.com",
    "youjizz.com",
    "4tube.com",
    "fapster.com",
    "porntrex.com",
    "hclips.com",
    "hdzog.com",
    "netfapx.com",
    "bravotube.net",
    "vporn.com",
    "onlyfans.com",
    "fapello.com",
    "motherless.com",
    "rule34.xxx",
    "gelbooru.com",
  ],
  gambling: [
    "bet365.com",
    "draftkings.com",
    "fanduel.com",
    "betmgm.com",
    "caesarssportsbook.com",
    "pointsbet.com",
    "barstoolsportsbook.com",
    "williamhill.com",
    "pokerstars.com",
    "partypoker.com",
    "888poker.com",
    "ggpoker.com",
    "bovada.lv",
    "betonline.ag",
    "mybookie.ag",
    "betway.com",
    "unibet.com",
    "ladbrokes.com",
    "betfair.com",
    "paddypower.com",
    "coral.co.uk",
    "skybet.com",
    "betvictor.com",
    "888sport.com",
    "sportingbet.com",
    "slotocash.im",
    "casinox.com",
    "spinamba.com",
    "casumo.com",
    "leovegas.com",
    "mrgreen.com",
    "videoslots.com",
  ],
  illegal: [
    "thepiratebay.org",
    "1337x.to",
    "rarbg.to",
    "kickasstorrents.to",
    "torrentz2.eu",
    "yts.mx",
    "limetorrents.info",
    "zooqle.com",
    "fmovies.to",
    "123movies.mom",
    "putlocker.vip",
    "solarmovie.one",
    "gostream.site",
    "watchseries.gg",
    "itemfix.com",
    "bestgore.com",
    "liveleak.com",
    "goregrish.com",
    "watchpeopledie.tv",
    "silk road",
  ],
};

// Parse a hosts-format file or plain domain list
function parseDomainList(text) {
  const domains = new Set();
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!"))
      continue;

    // Hosts format: "0.0.0.0 domain.com" or "127.0.0.1 domain.com"
    const hostsMatch = trimmed.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(.+)$/);
    if (hostsMatch) {
      const domain = hostsMatch[1].trim();
      if (domain && domain !== "localhost" && !domain.startsWith("#")) {
        domains.add(domain.toLowerCase());
      }
      continue;
    }

    // Plain domain list (no spaces, valid-looking domain)
    if (/^[a-z0-9][a-z0-9\-\.]+\.[a-z]{2,}$/i.test(trimmed)) {
      domains.add(trimmed.toLowerCase());
    }
  }

  return [...domains];
}

async function fetchBlocklist(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return parseDomainList(text);
  } catch (err) {
    console.warn(`[NoGo] Failed to fetch ${url}:`, err.message);
    return [];
  }
}

async function updateCategoryBlocklists() {
  console.log("[NoGo] Updating category blocklists...");
  const result = {};

  for (const [category, urls] of Object.entries(BLOCKLIST_SOURCES)) {
    const allDomains = new Set(FALLBACK_LISTS[category] || []);

    for (const url of urls) {
      const domains = await fetchBlocklist(url);
      domains.forEach((d) => allDomains.add(d));
    }

    result[category] = [...allDomains];
    console.log(`[NoGo] ${category}: ${allDomains.size} domains loaded`);
  }

  await chrome.storage.local.set({
    categoryLists: result,
    lastUpdated: Date.now(),
  });

  console.log("[NoGo] Blocklists updated successfully.");
  return result;
}

// Check if a domain matches any entry in a list (also checks subdomains)
function domainMatchesList(hostname, list) {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return list.some((blocked) => {
    const b = blocked.toLowerCase().replace(/^www\./, "");
    return h === b || h.endsWith("." + b);
  });
}

// Get enabled categories from storage
async function getEnabledCategories() {
  const { enabledCategories } = await chrome.storage.sync.get([
    "enabledCategories",
  ]);
  // Default: all categories enabled
  return (
    enabledCategories || {
      nsfw: true,
      gambling: true,
      illegal: true,
    }
  );
}

// Check on navigation if URL should be blocked by category
async function checkUrlAgainstCategories(url) {
  try {
    const hostname = new URL(url).hostname;
    const { categoryLists } = await chrome.storage.local.get(["categoryLists"]);
    if (!categoryLists) return null;

    const enabledCategories = await getEnabledCategories();

    for (const [category, enabled] of Object.entries(enabledCategories)) {
      if (enabled && categoryLists[category]) {
        if (domainMatchesList(hostname, categoryLists[category])) {
          return category;
        }
      }
    }
  } catch (_) {}
  return null;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_URL") {
    checkUrlAgainstCategories(message.url).then((category) => {
      sendResponse({ blocked: !!category, category });
    });
    return true; // async response
  }

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

  // Store fallbacks immediately so blocking works right away
  await chrome.storage.local.set({
    categoryLists: FALLBACK_LISTS,
    lastUpdated: Date.now(),
  });

  // Default categories all enabled
  const { enabledCategories } = await chrome.storage.sync.get([
    "enabledCategories",
  ]);
  if (!enabledCategories) {
    await chrome.storage.sync.set({
      enabledCategories: { nsfw: true, gambling: true, illegal: true },
    });
  }

  // Try to fetch live lists in background
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
