# Privacy Policy for Tab Reaper

Tab Reaper is a Chrome extension that automatically closes leftover browser tabs matching user-defined URL patterns on sites the user explicitly grants access to.

## What Tab Reaper accesses

Tab Reaper reads tab URLs on `localhost` and `127.0.0.1`, plus any additional sites the user explicitly approves when adding a pattern, so it can detect tabs that match its configured auto-close patterns.

Tab Reaper stores extension settings in `chrome.storage.sync`, including which built-in patterns are enabled, the configured close delay, and any custom substring patterns you add.

Tab Reaper stores a recent closure log and badge counter in `chrome.storage.local` so the popup can show recently closed tabs and a per-session count.

## How Tab Reaper uses data

Tab Reaper uses tab URL information only to decide whether a tab should be closed after the configured delay.

Settings and recent closure data are used only to provide the extension's user-facing functionality.

## What Tab Reaper shares

Tab Reaper does not transmit collected data to the developer or to third parties.

Tab Reaper does not sell user data.

## Data retention

Settings remain in Chrome storage until you change or remove them.

The recent closure log is limited to the most recent 10 entries stored locally in the browser.

## Remote code

Tab Reaper does not use remote code.
