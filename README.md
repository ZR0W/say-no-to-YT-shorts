# Say No to YouTube Shorts

A [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) browser extension for **desktop Chrome, Edge, Firefox**, and other browsers that load unpacked or store packages. It reduces YouTube Shorts UI on [https://www.youtube.com](https://www.youtube.com): sidebar link, reel/shelf rows, “Shorts”-titled sections, and Shorts-related tabs and filter chips.

**Maintainers & AI assistants:** See [AGENTS.md](AGENTS.md) for repository layout, settings schema, how to test in Chrome vs Firefox, and constraints when changing behavior.

## Install (development — Chromium)

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this repository folder (the directory that contains `manifest.json`).
4. Open [YouTube](https://www.youtube.com). Use the extension icon to toggle what gets hidden.

Changes to the extension code require **Reload** on the extensions page.

### If nothing on YouTube changes

- Use `https://www.youtube.com` or `https://youtube.com` (both are supported). Reload the add-on after updates.
- On YouTube: DevTools → Console → `document.documentElement.dataset.sntysHideReel` should be `"1"` by default. If undefined, the content script is not running on that tab.
- Optional debug: `sessionStorage.setItem("sntys_debug","1");` then reload the tab; look for `[say-no-to-yt-shorts]` messages in the console. See the **Troubleshooting** section in [AGENTS.md](AGENTS.md) for full steps.

## Install (development — Firefox)

1. Open **about:debugging#/runtime/this-firefox**.
2. Click **Load Temporary Add-on…** and select **`manifest.json`** in this repo.
3. Open YouTube and use the toolbar popup to toggle options.

Firefox loads this as a **temporary** add-on (it disappears when Firefox closes unless you publish/sign for permanent install). The same unpacked folder works for both Chromium and Firefox; APIs use `browser ?? chrome` ([AGENTS.md](AGENTS.md)).

## Options

Click the toolbar icon to open the popup. Each checkbox controls one kind of Shorts-related UI:

| Setting | Effect |
|--------|--------|
| Hide sidebar Shorts link | Removes the Shorts entry in the left guide (expanded and mini guide). |
| Hide Shorts reel / shelf rows | Hides `ytd-rich-shelf-renderer[is-shorts]` (current home Shorts row) and legacy `ytd-reel-shelf-renderer`. |
| Hide sections titled “Shorts” | Hides rich sections whose heading is Shorts (SPA-friendly; uses a class applied after DOM checks). |
| Hide Shorts tabs & filter chips | Hides Shorts tabs/titles where supported, chips linking to Shorts, and chips labeled Shorts when detected in the DOM. |

Preferences are stored with **`storage.sync`** (`browser.storage.sync` / `chrome.storage.sync`): they sync when the browser’s account sync is enabled (subject to each engine’s limits); otherwise they stay on the local profile.

## Mobile (Android)

- **Chrome for Android** does not support installing arbitrary extensions from the Chrome Web Store the way desktop Chrome does, so this extension does not apply there today.
- **Firefox for Android** supports a curated set of extensions; shipping there would be a separate packaging and review path.
- Some Chromium-based browsers (e.g. Kiwi) allow loading extensions manually for advanced users only.

The primary supported surface is **desktop** `https://www.youtube.com/*` as declared in `manifest.json`.

## Privacy

- The extension runs only on YouTube origins allowed in `manifest.json`.
- It does not inject remote code, ship analytics in this repo, or send page content to a server.
- **`storage`** is used only to persist your checkbox settings. **`host_permissions`** are limited to YouTube so content scripts can run there.

See [docs/store-listing.md](docs/store-listing.md) for Chrome Web Store–oriented wording (permissions, privacy form).

## Testing (manual)

After reload, spot-check:

- Home: Shorts shelf and Shorts sections (if present).
- Sidebar: Shorts link hidden when enabled.
- A channel with Shorts tab: tab hidden when “Hide Shorts tabs & chips” is on.
- Toggle each popup option off and confirm the corresponding UI returns.

YouTube updates the site often; if something breaks, selectors in [src/content/styles.css](src/content/styles.css) and helpers in [src/content/content.js](src/content/content.js) may need updating.

## Shipping a build

1. Bump `"version"` in [manifest.json](manifest.json).
2. Zip the extension root **contents** (not the parent folder): include `manifest.json`, `icons/`, `src/`, and `README.md` if you like. Exclude `.git`, `scripts/` if you prefer (icons are already generated in `icons/`).

Submit the zip to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). A one-time developer registration fee applies.

## Icons

PNG icons live under `icons/`. Regenerate them after editing [scripts/generate-icons.ps1](scripts/generate-icons.ps1):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
```

## License

Add a `LICENSE` file when you decide how you want to distribute the project.
