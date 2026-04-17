# Tab Reaper

A Chrome extension that automatically closes leftover browser tabs matching user-defined URL patterns on sites you explicitly grant access to.

Many tools open a browser tab as part of their flow and then leave a useless tab behind once the native app takes over. Tab Reaper watches for those tabs and closes them after a short delay so the original request has time to complete.

## How it works

You define URL substring patterns and Tab Reaper matches them against tab URL changes on sites you approve. When you add a pattern, the extension asks for access only to that pattern's site instead of requesting broad host access up front.

For example, adding `app.slack.com/client` lets Tab Reaper request access to Slack tabs and close Slack redirect tabs. Adding `zoom.us/j/` lets it request access to Zoom tabs and close Zoom launcher tabs.

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
- `popup.html` / `popup.js` / `popup.css` - Popup UI for managing patterns, requesting site access, and adjusting the delay.
- `icon16.png` / `icon48.png` / `icon128.png` - Packaged extension icons used by Chrome and the Chrome Web Store.
- `icon128.svg` - Source icon artwork.

## Permissions

- **tabs** - Required to read tab URLs and close tabs.
- **storage** - Required to persist pattern list and delay across sessions via `chrome.storage.sync`.
- **permissions** - Required to request site access at runtime when the user adds a pattern.
- **optional_host_permissions** - Declared for `http://*/*` and `https://*/*` so the extension can request access only to sites the user explicitly approves.

## Privacy

See [PRIVACY.md](PRIVACY.md) for the extension's privacy policy.
