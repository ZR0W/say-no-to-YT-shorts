# Chrome Web Store checklist

Use this when completing the listing and the **privacy practices** questionnaire.

## Summary for reviewers

- **Single purpose:** Reduce visibility of YouTube Shorts-related UI on youtube.com according to user toggles.
- **Permissions:**
  - **`storage`:** Saves user checkbox preferences (`chrome.storage.sync`).
  - **`host_permissions` (`https://www.youtube.com/*`):** Required so content scripts and packaged CSS can run only on YouTube.

No host access beyond the declared YouTube pattern. No `scripting` permission beyond standard content scripts in the manifest.

## Privacy

- No account or credentials are collected by this extension’s code in this repository.
- No analytics or remote configuration endpoints are embedded in the shipped extension as authored here.
- Options are stored locally/synced via Chrome’s storage API subject to the user’s Chrome sync settings.

If you later add analytics or remote configuration, update the listing and privacy answers accordingly.

## Suggested store description (short)

Blocks or hides Shorts shelves, the sidebar Shorts link, “Shorts” titled sections, and Shorts tabs/chips on YouTube—configurable from the toolbar popup. Works on desktop Chrome; does not change YouTube servers.

## Assets to prepare before submission

- **Screenshots:** At least one of the extension popup; optionally before/after YouTube home with Shorts hidden.
- **Promotional tile / icon:** Already supplied via `icons/` in the manifest (16, 48, 128).

## Testing notes for QA

Load unpacked, open YouTube signed in or out, confirm Shorts-related UI hides per defaults; open popup and toggle each option; reload YouTube and confirm persistence.

---

# AMO (Firefox / Firefox for Android)

Firefox for Android (121+) automatically surfaces **all** AMO-listed extensions. One submission covers both Firefox desktop and Firefox for Android.

## Submission steps

1. Create a developer account at https://addons.mozilla.org/developers/
2. Bump `"version"` in `manifest.json` and run `scripts\package-for-store.bat` to produce the zip (same script, same zip as Chrome Web Store).
3. Go to https://addons.mozilla.org/developers/addon/submit/ → Extension → "On this site" (public listing).
4. Upload the zip.
5. Fill in listing fields:
   - **Name:** Say No to YouTube Shorts
   - **Summary (≤250 chars):** Hides Shorts shelves, the sidebar Shorts link, Shorts tabs, and Shorts sections on YouTube—on both desktop and mobile (m.youtube.com). Toggle each setting from the toolbar popup.
   - **Description:** Expand on the four toggles and mention Firefox for Android support.
   - **Categories:** Appearance, Productivity
6. **Privacy practices:** Select "No" for all data collection fields. The manifest already declares `data_collection_permissions: { "required": ["none"] }` which satisfies Mozilla's disclosure requirement.
7. **Screenshots:** At least 1 required; 2–5 recommended (desktop popup + mobile Firefox on m.youtube.com).
8. Submit for review. Most simple extensions pass automated review within minutes; manual review can take 1–14 days.

## After approval

- The listing will be available at `https://addons.mozilla.org/firefox/addon/<slug>/`
- Firefox for Android users: ⋮ → Add-ons → search "Say No to YouTube Shorts" → Install.
- Do **not** change the Gecko `id` (`saynotoshorts@sntys.app`) after the first submission — AMO ties version updates to this ID.

## Permissions statement for AMO reviewer

- **`storage`:** Saves user checkbox preferences via `browser.storage.sync`. No personal data stored.
- **`host_permissions` (`youtube.com`, `www.youtube.com`, `m.youtube.com`):** Required so content scripts and bundled CSS can run only on YouTube origins.
- No remote code, no analytics, no external network requests.
