// Tab Reaper - Background Service Worker
// Listens for tab URL changes and closes tabs matching user-defined patterns.

const DEFAULT_STATE = {
  delayMs: 2000,
  customPatterns: []
};

// In-memory cache of settings so the hot path avoids async storage reads.
let currentState = { ...DEFAULT_STATE };

// Badge counter for tabs closed this session. Persisted in storage.local
// so it survives service worker restarts but not browser restarts.
let closedCount = 0;

// Load persisted state on startup and keep cache in sync.
function loadState() {
  chrome.storage.sync.get(DEFAULT_STATE, (result) => {
    currentState = {
      ...result,
      customPatterns: normalizePatterns(result.customPatterns)
    };
  });
  // Restore badge counter from local storage.
  chrome.storage.local.get({ closedCount: 0 }, (result) => {
    closedCount = result.closedCount;
    updateBadge();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    for (const [key, { newValue }] of Object.entries(changes)) {
      currentState[key] = key === "customPatterns"
        ? normalizePatterns(newValue)
        : newValue;
    }
  }
  if (area === "local" && changes.closedCount) {
    closedCount = changes.closedCount.newValue;
    updateBadge();
  }
});

loadState();

// --- Badge helpers ---

function updateBadge() {
  const text = closedCount > 0 ? String(closedCount) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#8b1a1a" });
}

// --- Closure log helpers ---

// Append a closure record to chrome.storage.local, keeping the last 10.
function logClosure(url, reason) {
  // Build a short URL fragment for display (host + truncated path).
  let fragment = url;
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30
      ? u.pathname.slice(0, 30) + "..."
      : u.pathname;
    fragment = u.host + path;
  } catch {
    // If URL parsing fails, keep the raw string but truncate it.
    if (fragment.length > 60) {
      fragment = fragment.slice(0, 60) + "...";
    }
  }

  const entry = {
    url,
    fragment,
    reason,
    time: Date.now()
  };

  chrome.storage.local.get({ recentClosures: [] }, (result) => {
    const log = result.recentClosures;
    log.unshift(entry);
    // Keep only the last 10 entries.
    if (log.length > 10) {
      log.length = 10;
    }
    chrome.storage.local.set({ recentClosures: log });
  });
}

function incrementBadge() {
  closedCount += 1;
  chrome.storage.local.set({ closedCount });
  updateBadge();
}

// --- Core listener ---

// Evaluate every tab URL update against user-defined substring patterns.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the URL actually changes (not on every status flip).
  if (!changeInfo.url) {
    return;
  }

  const url = changeInfo.url;

  // If the URL contains the bypass parameter, skip all pattern matching.
  if (url.includes("tab_reaper=bypass")) {
    return;
  }

  // Check user-defined substring patterns.
  const customs = currentState.customPatterns || [];
  for (const entry of customs) {
    if (matchesPattern(url, entry.match)) {
      scheduleClose(tabId, currentState.delayMs, entry.match, url);
      return;
    }
  }
});

function normalizePatterns(patterns) {
  if (!Array.isArray(patterns)) {
    return [];
  }

  return patterns
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          match: entry,
          origins: []
        };
      }

      if (!entry || typeof entry.match !== "string") {
        return null;
      }

      return {
        match: entry.match,
        origins: Array.isArray(entry.origins) ? entry.origins : []
      };
    })
    .filter(Boolean);
}

function matchesPattern(url, pattern) {
  if (!pattern.includes("*")) {
    return url.includes(pattern);
  }
  const regex = new RegExp(
    pattern.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")
  );
  return regex.test(url);
}

function scheduleClose(tabId, delayMs, reason, url) {
  setTimeout(() => {
    chrome.tabs.remove(tabId).then(() => {
      incrementBadge();
      logClosure(url, reason);
    }).catch(() => {
      // Tab may already be closed; ignore.
    });
    console.log(
      `[Tab Reaper] Closed tab ${tabId} after ${delayMs}ms (matched: ${reason})`
    );
  }, delayMs);
}
