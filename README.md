# Tab Reaper

A Chrome extension that automatically closes leftover browser tabs from OAuth callbacks, Slack redirects, and Zoom meeting launchers.

Many tools open a browser tab as part of their flow (SSO login, "Open in Slack", "Launch Zoom") and then leave a useless tab behind once the native app takes over. Tab Reaper watches for these tabs and closes them after a short delay so the original request has time to complete.

## Patterns

| Pattern | What it catches |
|---------|----------------|
| OAuth callbacks | `127.0.0.1/oauth/callback` tabs left behind by `pk connect` and similar AWS SSO CLI tools |
| Slack app redirects | `app.slack.com/client` pages and redirect interstitials that hand off to the native Slack app |
| Zoom meeting launchers | `*.zoom.us/j/*` and `*.zoom.us/wc/*` tabs that open the desktop Zoom client and go blank |

Each pattern can be toggled on or off independently. The close delay is configurable from 0.5 to 5 seconds (default 2 seconds) to give the underlying request time to finish before the tab disappears.

You can also add custom substring patterns for any other leftover tab URLs you want Tab Reaper to clean up, and the popup shows a recent history of closed tabs plus a badge counter for the current browser session.

## Installation

1. Clone or download this directory.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select this directory (`tab-reaper/`).
5. The Tab Reaper icon will appear in your extensions toolbar. Click it to toggle patterns and adjust the close delay.

## Files

- `manifest.json` -- Manifest V3 extension metadata, permissions, and service worker registration.
- `background.js` -- Service worker that listens on `chrome.tabs.onUpdated` and closes matching tabs after a delay.
- `popup.html` / `popup.js` / `popup.css` -- Popup UI for toggling patterns and adjusting the delay.
- `icon16.png` / `icon48.png` / `icon128.png` -- Packaged extension icons used by Chrome and the Chrome Web Store.
- `icon128.svg` -- Source artwork for the extension icon.

## Permissions

- **tabs** -- Required to read tab URLs and close tabs.
- **storage** -- Required to persist toggle state and delay across sessions via `chrome.storage.sync`.
- **host_permissions** -- Scoped to `127.0.0.1`, `app.slack.com`, `slack.com`, and `*.zoom.us` so the extension only sees URLs it needs to match.
