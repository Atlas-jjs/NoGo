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
