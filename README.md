# Tab Reaper

A Chrome extension that automatically closes leftover browser tabs matching user-defined URL patterns.

Many tools open a browser tab as part of their flow (SSO login, "Open in Slack", "Launch Zoom") and then leave a useless tab behind once the native app takes over. Tab Reaper watches for these tabs and closes them after a short delay so the original request has time to complete.

## How it works

You define URL substring patterns and Tab Reaper matches them against every tab URL change. When a tab's URL contains one of your patterns, the tab is closed after the configured delay.

For example, adding `app.slack.com/client` will close Slack redirect tabs, and `zoom.us/j/` will close Zoom launcher tabs.

The close delay is configurable from 0.5 to 5 seconds (default 2 seconds) to give the underlying request time to finish before the tab disappears.

## Installation

1. Clone or download this directory.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select this directory (`tab-reaper/`).
5. The Tab Reaper icon will appear in your extensions toolbar. Click it to toggle patterns and adjust the close delay.

## Files

- `manifest.json` - Manifest V3 extension metadata, permissions, and service worker registration.
- `background.js` - Service worker that listens on `chrome.tabs.onUpdated` and closes matching tabs after a delay.
- `popup.html` / `popup.js` / `popup.css` - Popup UI for managing patterns and adjusting the delay.
- `icon128.svg` - Extension icon.

## Permissions

- **tabs** - Required to read tab URLs and close tabs.
- **storage** - Required to persist pattern list and delay across sessions via `chrome.storage.sync`.
- **host_permissions** - Set to `<all_urls>` so the extension can match any user-defined pattern.
