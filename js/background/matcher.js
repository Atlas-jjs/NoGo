import { FALLBACK_LISTS } from "./config.js";

export function domainMatchesList(hostname, list) {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return list.some((blocked) => {
    const b = blocked.toLowerCase().replace(/^www\./, "");
    return h === b || h.endsWith("." + b);
  });
}

export async function getEnabledCategories() {
  const { enabledCategories } = await chrome.storage.sync.get(["enabledCategories"]);
  return (
    enabledCategories || {
      nsfw: true,
      gambling: true,
      illegal: true,
    }
  );
}

export async function checkUrlAgainstCategories(url) {
  try {
    const hostname = new URL(url).hostname;
    let { categoryLists } = await chrome.storage.local.get(["categoryLists"]);
    
    // Fallback immediately if storage is empty
    if (!categoryLists || Object.keys(categoryLists).length === 0) {
      categoryLists = FALLBACK_LISTS;
    }

    const enabledCategories = await getEnabledCategories();

    for (const [category, enabled] of Object.entries(enabledCategories)) {
      if (enabled && categoryLists[category]) {
        if (domainMatchesList(hostname, categoryLists[category])) {
          return category;
        }
      }
    }
  } catch (err) {
    console.error("[NoGo] Category match error:", err);
  }
  return null;
}
