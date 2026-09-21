# Agent guide (maintainers & AI assistants)

This document orients anyone (including automated coding agents) who opens this repository so work can continue without rediscovering context.

## Purpose

**Say No to YouTube Shorts** is a Web Extension that reduces Shorts-related UI on `https://www.youtube.com/*`, `https://youtube.com/*`, and **mobile** `https://m.youtube.com/*`: sidebar Shorts entry, reel/shelf rows, sections titled “Shorts”, Shorts tabs/chips, bottom nav Shorts tab, and individual Shorts cards. It does **not** change YouTube servers; it only adjusts the DOM/CSS in the user’s tab via a **Manifest V3** content script and bundled CSS.

Human-facing overview: [README.md](README.md). Chrome Web Store–oriented notes: [docs/store-listing.md](docs/store-listing.md).

## Repository map

| Path | Role |
|------|------|
| [manifest.json](manifest.json) | MV3 manifest: permissions, matches, content scripts, action popup, icons, Firefox `browser_specific_settings`. |
| [icons/](icons/) | Toolbar/store icons (`icon16.png`, `icon48.png`, `icon128.png`). Regenerate with [scripts/generate-icons.ps1](scripts/generate-icons.ps1). |
| [src/content/content.js](src/content/content.js) | Loads settings, sets `data-sntys-*` on `<html>`, applies `sntys-force-hide`, injects fallback `<style>`, marks DOM for JS-only rules, `MutationObserver` + debounced refresh, listens for storage changes (any storage area). `applyMobileForceHides()` handles `ytm-*` elements on `m.youtube.com`. `applyPlayablesHides()` handles `ytd-rich-shelf-renderer[is-playables]` and game card elements. |
| [src/content/styles.css](src/content/styles.css) | Static CSS keyed off `documentElement.dataset`; hides sidebar/reel/tabs where selectors allow. |
| [src/popup/popup.html](src/popup/popup.html) | Toolbar popup UI (checkboxes). |
| [src/popup/popup.js](src/popup/popup.js) | Reads/writes settings to `storage.sync`. |
| [src/popup/popup.css](src/popup/popup.css) | Popup styling. |

There is **no** background service worker; all behavior is content script + popup.

## Architecture (runtime)

```mermaid
flowchart LR
  subgraph ext [Extension]
    popup[popup.js]
    store[storage.sync]
    cs[content.js]
  end
  yt[www.youtube.com page]
  popup --> store
  store --> cs
  cs --> yt
```

1. User opens popup and toggles checkboxes → values stored in **`storage.sync`** (browser sync when the user has account sync enabled; otherwise local profile behavior per engine).
2. Content script reads settings on load, mirrors them to **`document.documentElement.dataset`** as `data-sntys-hide-sidebar`, `data-sntys-hide-reel`, `data-sntys-hide-rich`, `data-sntys-hide-nav` (`"1"` / `"0"`).
3. [styles.css](src/content/styles.css) uses those flags to hide elements (plus `:has()` where supported).
4. **JS tagging** fills gaps CSS cannot express reliably: rich sections whose title text is “Shorts” get class `sntys-shorts-heading`; ambiguous Shorts **chips** get `sntys-shorts-chip`.
5. **`applyForceHides()`** adds class `sntys-force-hide` on matched hosts (`ytd-reel-shelf-renderer`, guide rows with Shorts links, etc.) so hiding still applies if static CSS loses the cascade; a **fallback `<style>`** injected once carries the same rules.
6. **MutationObserver** on `document.documentElement` + `requestAnimationFrame` debounce rescans after YouTube’s SPA swaps the DOM.

## Troubleshooting (“nothing happens” on YouTube)

Use this order before changing selectors:

1. **Confirm the URL pattern** — The extension runs on `https://www.youtube.com/*`, `https://youtube.com/*`, and `https://m.youtube.com/*`. It does **not** run on `music.youtube.com`, embedded players on other sites, or non-HTTPS URLs. On mobile (`m.youtube.com`), DOM elements use the `ytm-*` prefix — use the same `sntys_debug` flag to inspect mobile counts.

2. **Reload the extension** after pulling code changes (Chromium: extensions page → Reload; Firefox: remove temporary add-on and load `manifest.json` again, or use “Reload” if shown).

3. **Verify the content script ran** — Open DevTools → **Console** on a YouTube tab. Run:
   - `document.documentElement.dataset.sntysHideReel` — expect `"1"` when hiding is enabled (default).
   - If these attributes are missing entirely, the content script did not inject (wrong origin, disabled extension, or console errors on load).

4. **Enable debug logging** — In the **same tab’s** console:
   ```js
   sessionStorage.setItem("sntys_debug", "1");
   location.reload();
   ```
   Then look for `[say-no-to-yt-shorts]` logs (dataset flags, reel/guide counts). Clear with `sessionStorage.removeItem("sntys_debug")`.

5. **Inspect for errors** — Red errors mentioning `storage`, `permissions`, or the script path mean the extension context failed before hid logic runs.

6. **DOM drift** — If attributes are `"1"` but Shorts remain visible, YouTube may have renamed nodes. Desktop uses `ytd-*` Polymer elements; mobile (`m.youtube.com`) uses `ytm-*` elements (e.g. `ytm-reel-shelf-renderer`, `ytm-pivot-bar-item-renderer`, `ytm-compact-link-renderer`, `ytm-shorts-lockup-view-model`). Capture **Inspect** → outer HTML for the Shorts block and update selectors in [content.js](src/content/content.js) / [styles.css](src/content/styles.css). A captured page dump may live under `docs/` for comparison (large files—grep for `is-shorts`, `shorts`).

## Settings schema (`chrome.storage.sync` / `browser.storage.sync`)

Flat keys (booleans; default **true** = hide):

| Key | Meaning |
|-----|---------|
| `hideSidebarShorts` | Sidebar + mini-guide entries, `/feed/shorts`, and guide-column chip/tab controls (HOME \| Shorts) linking or labeled as Shorts |
| `hideReelShelf` | `ytd-reel-shelf-renderer` and `ytd-rich-shelf-renderer[is-shorts]` (newer home Shorts row) |
| `hideRichShortsSections` | `ytd-rich-section-renderer` whose title reads as Shorts |
| `hideNavigationShorts` | Shorts tabs, href-based chips, text-tagged chips |
| `hidePlayables` | `ytd-rich-shelf-renderer[is-playables]` + parent `ytd-rich-section-renderer`, sidebar guide entries with `/playables` href, game card elements (`ytd-mini-game-card-view-model`, `ytd-game-card-renderer`), search result shelves. **Note:** YouTube Playables has a staged regional rollout — if the shelf is absent from the page the setting has no visible effect. Use `sntys_debug` to confirm `data-sntys-hide-playables="1"` is set and check the `playables counts` log line; all-zeros is expected when Playables is unavailable on the account. |

Changing any key must keep [content.js](src/content/content.js), [styles.css](src/content/styles.css), [popup.html](src/popup/popup.html), and [popup.js](src/popup/popup.js) in sync (same keys, defaults).

## Cross-browser API usage

Scripts use **`const ext = globalThis.browser ?? globalThis.chrome`** then **`ext.storage`** so the same files run on **Chromium** (Chrome, Edge, …) and **Firefox**. Do not assume `chrome` alone exists in every engine’s content script/popup context.

## How to run & test

### Chromium (Chrome / Edge)

1. `chrome://extensions` → Developer mode → **Load unpacked** → select repo root (folder containing `manifest.json`).
2. Open [YouTube](https://www.youtube.com), exercise home, subscriptions, a channel with a Shorts tab.
3. After code changes: **Reload** the extension on the extensions page.

### Firefox (desktop)

1. `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → choose `manifest.json` in this repo.
2. Same YouTube smoke test. **Note:** Temporary add-ons are removed when Firefox closes unless you package/sign for permanent install ([addons.mozilla.org](https://addons.mozilla.org/) flow).

Firefox includes `browser_specific_settings.gecko` in [manifest.json](manifest.json) for packaging. The `id` is `saynotoshorts@sntys.app` — do not change this after the first AMO submission, as AMO ties updates to the registered ID.

### Firefox for Android

#### Dev device setup (no AMO account required)

You need a physical Android device or emulator with Firefox for Android (v121+) installed.

**One-time setup:**
1. On the Android device: Settings → About phone → tap **Build number** 7× to enable Developer Options.
2. Settings → Developer Options → enable **USB debugging**.
3. Connect the device to your computer via USB; accept the RSA key prompt on the device.
4. In Firefox for Android: tap ⋮ → Settings → scroll to bottom → **About Firefox** → tap the Firefox logo 5× to enable debug menu.
5. Back in Settings → **Remote debugging via USB** → toggle on.
6. In Firefox desktop: go to `about:debugging` → **This Network Location** → add `localhost:0` if no device appears, or click **USB Devices** — the Android device should appear.
7. Click **Connect** next to the device name.

**Load the extension as a temporary add-on on the device:**
8. In `about:debugging`, under the connected device, click **Load Temporary Add-on…**.
9. Select `manifest.json` from this repo root.
10. The extension now appears in Firefox for Android's address bar (tap ⋮ → Add-ons to confirm).

The add-on is removed when Firefox for Android is closed. Repeat steps 8–9 after each code change.

#### Mobile QA checklist

Run these after loading the extension. All items default to **hidden** (all four settings on).

**Setup verification**
- [ ] Extension icon visible in Firefox for Android address bar (or ⋮ → Add-ons shows the extension as enabled)
- [ ] `about:debugging` desktop console shows no errors for the extension

**Home feed (`m.youtube.com` or `youtube.com` on mobile)**
- [ ] Shorts reel shelf / row is not visible on the home feed
- [ ] Individual Shorts thumbnail cards (`ytm-shorts-lockup-view-model`) are not visible in any section
- [ ] Regular video recommendations and channel rows are still visible (no over-hiding)

**Bottom navigation bar**
- [ ] Shorts tab is absent from the bottom nav bar
- [ ] Remaining tabs (Home, Explore, Subscriptions, Library or local equivalents) are all still present

**Hamburger / sidebar menu**
- [ ] Open ☰ or the slide-out menu → "Shorts" link is not listed
- [ ] All other menu items (History, Playlists, Watch Later, etc.) are still present

**Per-setting toggle verification** (open popup via address bar icon)
- [ ] Uncheck **"Hide Shorts reel / shelf rows"** → Shorts shelf row reappears on home; re-check → hides again
- [ ] Uncheck **"Hide Shorts tabs & filter chips"** → Shorts bottom nav tab reappears; re-check → hides again
- [ ] Uncheck **"Hide sidebar Shorts link"** → Shorts link reappears in ☰ menu; re-check → hides again
- [ ] Uncheck **"Hide sections titled 'Shorts'"** → any "Shorts" headed section reappears; re-check → hides again

**SPA navigation (YouTube is a single-page app — DOM re-renders on route change)**
- [ ] Tap Home → Shorts shelf hidden
- [ ] Tap Explore or a channel → navigate back to Home → Shorts shelf still hidden (MutationObserver fired correctly)
- [ ] Tap a video → back → home still correct
- [ ] Open a channel that has a Shorts tab → Shorts tab in the channel header is hidden (if `hideNavigationShorts` on)

**Debug logging (use `about:debugging` remote console)**
- [ ] Run in the page console: `sessionStorage.setItem("sntys_debug","1"); location.reload()`
- [ ] Confirm `[say-no-to-yt-shorts]` lines appear, including `mobile counts` with non-zero values for at least one of: `reelShelf`, `pivotBarItems`, `sidebarLinks`, `shortsCards`
- [ ] Run `document.documentElement.dataset.sntysHideReel` → should return `"1"`
- [ ] Clear debug: `sessionStorage.removeItem("sntys_debug")`

**Settings persistence**
- [ ] Change a setting in the popup → close Firefox for Android completely → reopen → open `m.youtube.com` → setting still applied

**Desktop regression (confirm no breakage)**
- [ ] Open `www.youtube.com` in desktop Firefox → all four hide behaviors still work correctly
- [ ] Chrome: open `www.youtube.com` → no regressions

## When YouTube breaks the extension

YouTube changes class names and structure often. Typical workflow:

1. Reproduce on a logged-in (or logged-out) session; open DevTools on the broken control.
2. Prefer **CSS** + `data-sntys-*` + `:has()` in [styles.css](src/content/styles.css) when the target is stable.
3. Use **JS** in [content.js](src/content/content.js) when you need text content or ambiguous chips (follow existing `markRichShortsSections` / `markShortsChips` patterns).
4. Avoid hiding broad selectors (e.g. every `a[href*="/shorts"]`) without scoping—can break legitimate mixed pages.

Namespace new classes with the `sntys-` prefix to avoid collisions.

## Constraints (do not regress without intent)

- **Permissions:** Keep `host_permissions` limited to YouTube origins unless there is a clear feature need.
- **Privacy:** No remote code execution, no undisclosed telemetry; if you add network or analytics, update [README.md](README.md) and [docs/store-listing.md](docs/store-listing.md).
- **Payload:** Avoid heavy frameworks in the content script; keep observers debounced.

## Shipping

- Bump `version` in [manifest.json](manifest.json).
- Zip the extension **root contents** for store upload (include `manifest.json`, `icons/`, `src/`). See [README.md](README.md).

## Product / scope reminders

- **Primary:** Desktop web at `https://www.youtube.com/*` and `https://youtube.com/*`.
- **Firefox for Android:** Supported via AMO listing. Mobile YouTube (`m.youtube.com`) uses `ytm-*` Polymer elements; `applyMobileForceHides()` in [content.js](src/content/content.js) and the mobile CSS block in [styles.css](src/content/styles.css) handle these.
- **Android Chrome:** Does not support loading arbitrary extensions.
- **Kiwi Browser:** Supports sideloading unpacked extensions; Chrome code path applies.

Original brainstorming file: [planning.md](planning.md) (historical context only).
