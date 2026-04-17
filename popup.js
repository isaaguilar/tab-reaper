// Tab Reaper - Popup UI
// Reads toggle/delay state from chrome.storage.sync and writes changes back.
// Manages custom URL patterns and displays recent closure log.

const TOGGLES = ["oauthCallback", "slackRedirect", "zoomLauncher"];

const DEFAULT_STATE = {
  oauthCallback: true,
  slackRedirect: true,
  zoomLauncher: true,
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
    for (const id of TOGGLES) {
      document.getElementById(id).checked = state[id];
    }
    delaySlider.value = state.delayMs;
    delayLabel.textContent = formatDelay(state.delayMs);
    renderCustomPatterns(state.customPatterns || []);
  });

  // --- Load recent closures from local storage ---

  chrome.storage.local.get({ recentClosures: [] }, (result) => {
    renderRecentClosures(result.recentClosures);
  });

  // --- Toggle change handlers ---

  for (const id of TOGGLES) {
    document.getElementById(id).addEventListener("change", (e) => {
      chrome.storage.sync.set({ [id]: e.target.checked });
    });
  }

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
      return;
    }
    chrome.storage.sync.get({ customPatterns: [] }, (result) => {
      const patterns = result.customPatterns;
      // Avoid duplicates.
      if (patterns.includes(value)) {
        patternInput.value = "";
        return;
      }
      patterns.push(value);
      chrome.storage.sync.set({ customPatterns: patterns }, () => {
        patternInput.value = "";
        renderCustomPatterns(patterns);
      });
    });
  }

  function removeCustomPattern(index) {
    chrome.storage.sync.get({ customPatterns: [] }, (result) => {
      const patterns = result.customPatterns;
      patterns.splice(index, 1);
      chrome.storage.sync.set({ customPatterns: patterns }, () => {
        renderCustomPatterns(patterns);
      });
    });
  }

  function renderCustomPatterns(patterns) {
    patternList.innerHTML = "";
    patterns.forEach((pattern, i) => {
      const li = document.createElement("li");

      const text = document.createElement("span");
      text.textContent = pattern;

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
