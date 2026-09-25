export function getBlockedWebsites(callback) {
  chrome.storage.sync.get(["blockedWebsites"], (result) => {
    const blocked = result.blockedWebsites || [];
    callback(blocked);
  });
}

export function saveBlockedWebsites(array, callback) {
  chrome.storage.sync.set({ blockedWebsites: array }, callback);
}
