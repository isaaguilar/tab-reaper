// Tab Reaper - Popup UI
// Reads delay state from chrome.storage.sync and writes changes back.
// Manages custom URL patterns, requests site access, and displays recent closure log.

const DEFAULT_STATE = {
  delayMs: 2000,
  customPatterns: []
};

document.addEventListener("DOMContentLoaded", () => {
  const delaySlider = document.getElementById("delayMs");
  const delayLabel = document.getElementById("delayValue");
  const patternList = document.getElementById("customPatternList");
  const patternInput = document.getElementById("customPatternText");
  const addBtn = document.getElementById("addPatternBtn");

  // Reset the badge counter when the popup opens.
  chrome.action.setBadgeText({ text: "" });
  chrome.storage.local.set({ closedCount: 0 });

  // --- Load saved state and apply to UI ---

  chrome.storage.sync.get(DEFAULT_STATE, (state) => {
    const patterns = normalizePatterns(state.customPatterns);
    delaySlider.value = state.delayMs;
    delayLabel.textContent = formatDelay(state.delayMs);
    renderCustomPatterns(patterns);
  });

  // --- Load recent closures from local storage ---

  chrome.storage.local.get({ recentClosures: [] }, (result) => {
    renderRecentClosures(result.recentClosures);
  });

  // --- Delay slider handler ---

  delaySlider.addEventListener("input", () => {
    const ms = parseInt(delaySlider.value, 10);
    delayLabel.textContent = formatDelay(ms);
    chrome.storage.sync.set({ delayMs: ms });
  });

  // --- Custom pattern handlers ---

  addBtn.addEventListener("click", () => {
    addCustomPattern();
  });

  patternInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addCustomPattern();
    }
  });

  function addCustomPattern() {
    const value = patternInput.value.trim();
    if (!value) {
      showMessage("Enter a hostname or full URL pattern first.", "error");
      return;
    }

    const entry = buildPatternEntry(value);
    if (!entry) {
      showMessage("Use a hostname or full http/https URL so Tab Reaper can request access for the right site.", "error");
      return;
    }

    chrome.storage.sync.get({ customPatterns: [] }, (result) => {
      const patterns = normalizePatterns(result.customPatterns);
      if (patterns.some((pattern) => pattern.match === entry.match)) {
        patternInput.value = "";
        showMessage("That pattern already exists.", "error");
        return;
      }

      chrome.permissions.request({ origins: entry.origins }, (granted) => {
        if (chrome.runtime.lastError) {
          showMessage(chrome.runtime.lastError.message, "error");
          return;
        }

        if (!granted) {
          showMessage("Site access was not granted, so the pattern was not added.", "error");
          return;
        }

        patterns.push(entry);
        chrome.storage.sync.set({ customPatterns: patterns }, () => {
          patternInput.value = "";
          renderCustomPatterns(patterns);
          showMessage("Pattern added and site access granted.", "success");
        });
      });
    });
  }

  function removeCustomPattern(index) {
    chrome.storage.sync.get({ customPatterns: [] }, (result) => {
      const patterns = normalizePatterns(result.customPatterns);
      const [removed] = patterns.splice(index, 1);
      const unusedOrigins = (removed?.origins || []).filter((origin) => {
        return !patterns.some((pattern) => pattern.origins.includes(origin));
      });

      chrome.storage.sync.set({ customPatterns: patterns }, () => {
        if (unusedOrigins.length > 0) {
          chrome.permissions.remove({ origins: unusedOrigins }, () => {
            renderCustomPatterns(patterns);
            showMessage("Pattern removed.", "success");
          });
          return;
        }

        renderCustomPatterns(patterns);
        showMessage("Pattern removed.", "success");
      });
    });
  }

  function renderCustomPatterns(patterns) {
    patternList.innerHTML = "";
    patterns.forEach((pattern, i) => {
      const li = document.createElement("li");

      const text = document.createElement("div");
      text.className = "pattern-text";

      const match = document.createElement("span");
      match.className = "pattern-match";
      match.textContent = pattern.match;
      text.appendChild(match);

      if (pattern.origins.length > 0) {
        const origins = document.createElement("span");
        origins.className = "pattern-origins";
        origins.textContent = pattern.origins.join(", ");
        text.appendChild(origins);
      } else {
        const origins = document.createElement("span");
        origins.className = "pattern-origins";
        origins.textContent = "Legacy pattern, remove and re-add to grant site access.";
        text.appendChild(origins);
      }

      const btn = document.createElement("button");
      btn.className = "delete-pattern";
      btn.textContent = "X";
      btn.title = "Remove pattern";
      btn.addEventListener("click", () => {
        removeCustomPattern(i);
      });

      li.appendChild(text);
      li.appendChild(btn);
      patternList.appendChild(li);
    });
  }

  function renderRecentClosures(closures) {
    const list = document.getElementById("recentClosuresList");
    list.innerHTML = "";

    if (!closures || closures.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.textContent = "No tabs closed yet.";
      list.appendChild(li);
      return;
    }

    for (const entry of closures) {
      const li = document.createElement("li");

      const timeSpan = document.createElement("span");
      timeSpan.className = "closure-time";
      timeSpan.textContent = formatTime(entry.time);

      if (entry.url) {
        const link = document.createElement("a");
        link.className = "closure-link";
        link.textContent = entry.fragment;
        link.href = "#";
        link.title = "Reopen in a new tab (bypasses Tab Reaper)";
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const reopenUrl = appendBypass(entry.url);
          chrome.tabs.create({ url: reopenUrl });
        });
        li.appendChild(timeSpan);
        li.appendChild(link);
      } else {
        const fragSpan = document.createElement("span");
        fragSpan.textContent = entry.fragment;
        li.appendChild(timeSpan);
        li.appendChild(fragSpan);
      }

      list.appendChild(li);
    }
  }
});

function formatDelay(ms) {
  return (ms / 1000).toFixed(1) + "s";
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return h + ":" + m + ":" + s;
}

function appendBypass(url) {
  const separator = url.includes("?") ? "&" : "?";
  return url + separator + "tab_reaper=bypass";
}

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

function buildPatternEntry(value) {
  const origins = deriveOrigins(value);
  if (!origins) {
    return null;
  }

  return {
    match: value,
    origins
  };
}

function deriveOrigins(value) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }

      return buildOriginPatterns(parsed.host, [parsed.protocol]);
    } catch {
      return null;
    }
  }

  const host = value.split(/[/?#]/, 1)[0];
  if (!isValidHost(host)) {
    return null;
  }

  return buildOriginPatterns(host, ["http:", "https:"]);
}

function isValidHost(host) {
  if (!host) {
    return false;
  }

  const bareHost = host.replace(/:\d+$/, "");
  if (bareHost === "localhost") {
    return true;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bareHost)) {
    return true;
  }

  if (bareHost.startsWith("*.")) {
    return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(bareHost.slice(2));
  }

  return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(bareHost);
}

function buildOriginPatterns(host, protocols) {
  const origins = [];
  const bareHost = host.replace(/:\d+$/, "");
  const canUseWildcard = !bareHost.startsWith("*.") &&
    bareHost !== "localhost" &&
    !/^\d{1,3}(\.\d{1,3}){3}$/.test(bareHost) &&
    bareHost.includes(".") &&
    !host.includes(":");

  for (const protocol of protocols) {
    origins.push(`${protocol}//${host}/*`);
    if (bareHost.startsWith("*.")) {
      origins.push(`${protocol}//${bareHost}/*`);
      continue;
    }

    if (canUseWildcard) {
      origins.push(`${protocol}//*.${bareHost}/*`);
    }
  }

  return [...new Set(origins)];
}

function showMessage(text, type) {
  const message = document.getElementById("message");
  if (!text) {
    message.hidden = true;
    message.textContent = "";
    message.className = "message";
    return;
  }

  message.hidden = false;
  message.textContent = text;
  message.className = "message " + type;
}
