import { BLOCKLIST_SOURCES, FALLBACK_LISTS } from './config.js';

function parseDomainList(text) {
  const domains = new Set();
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!"))
      continue;

    const hostsMatch = trimmed.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(.+)$/);
    if (hostsMatch) {
      const domain = hostsMatch[1].trim();
      if (domain && domain !== "localhost" && !domain.startsWith("#")) {
        domains.add(domain.toLowerCase());
      }
      continue;
    }

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

export async function updateCategoryBlocklists() {
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
