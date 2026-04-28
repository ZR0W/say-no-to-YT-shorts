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
