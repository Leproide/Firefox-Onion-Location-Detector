// background.js

console.log("Onion Detector (v8.1): Now with network error handling.");

// An object to store the "available" .onion URL for each tab.
const tabAvailableOnions = {};

// --- Function to Update the Icon ---
function updateActionIcon(tabId, state, onionUrl = '') {
  let iconPath, title;
  switch (state) {
    case 'ON_ONION_SITE':
      iconPath = { 16: "icons/OnionSite-16.png", 32: "icons/OnionSite-32.png" };
      title = "You are currently on an .onion site.";
      break;
    case 'ONION_AVAILABLE':
      iconPath = { 16: "icons/onion-active-16.png", 32: "icons/onion-active-32.png" };
      title = "Onion site available! Click to visit.";
      break;
    default: // 'INACTIVE'
      iconPath = { 16: "icons/onion-inactive-16.png", 32: "icons/onion-inactive-32.png" };
      title = "No .onion site available.";
      break;
  }
  browser.action.setIcon({ tabId, path: iconPath });
  browser.action.setTitle({ tabId, title });
}

// This listener handles all successful requests.
browser.webRequest.onCompleted.addListener(
  (details) => {
    if (details.type !== 'main_frame' || details.frameId !== 0) return;

    const tabId = details.tabId;
    console.log(`[SUCCESS] Request completed for Tab ${tabId}. Making UI decision.`);

    // Priority 1: Is the final URL an .onion site?
    if (details.url.includes('.onion')) {
      updateActionIcon(tabId, 'ON_ONION_SITE');
      return;
    }

    // Priority 2: Does the response contain an Onion-Location header?
    const onionHeader = details.responseHeaders.find(h => h.name.toLowerCase() === 'onion-location');
    if (onionHeader && onionHeader.value) {
      tabAvailableOnions[tabId] = onionHeader.value;
      updateActionIcon(tabId, 'ONION_AVAILABLE', onionHeader.value);
      return;
    }

    // Priority 3: Otherwise, it's inactive.
    updateActionIcon(tabId, 'INACTIVE');
    delete tabAvailableOnions[tabId];
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["responseHeaders"]
);

// This new listener catches network errors, like an unreachable .onion site.
browser.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.type !== 'main_frame' || details.frameId !== 0) return;

    const tabId = details.tabId;
    console.log(`[ERROR] Network error on Tab ${tabId} for URL: ${details.url}. Resetting icon to inactive.`);
    
    // If a request fails, we always reset the icon to its default inactive state.
    updateActionIcon(tabId, 'INACTIVE');
    delete tabAvailableOnions[tabId];
  },
  { urls: ["<all_urls>"], types: ["main_frame"] }
);

// --- Click Handling and Cleanup (unchanged) ---
browser.action.onClicked.addListener((tab) => {
  const onionUrl = tabAvailableOnions[tab.id];
  if (onionUrl) {
    browser.tabs.update(tab.id, { url: onionUrl });
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  delete tabAvailableOnions[tabId];
});

