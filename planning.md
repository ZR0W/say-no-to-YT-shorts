## 2026 update — Firefox for Android

The original mobile question ("can this work on Android?") is now answered and implemented.

Firefox for Android (v121+) supports all AMO-listed extensions. Shipping required:
- `manifest.json`: added `m.youtube.com` to `host_permissions` + `content_scripts.matches`; updated Gecko `id` to `saynotoshorts@sntys.app`; bumped version to 1.1.0
- `src/content/styles.css`: added mobile CSS block targeting `ytm-*` elements (bottom nav, reel shelf, sidebar link, Shorts cards)
- `src/content/content.js`: added `applyMobileForceHides()` with JS force-hide logic for `ytm-*` elements; extended `ensureFallbackStyle()` to cover mobile selectors
- AMO submission required for permanent install — see `docs/store-listing.md`

---

plan a chrome extension project with me
my goal is to make a browser extension that modifies what i see on youtube.com

my biggest annoyance is with the shorts section, which i do not care for. 
it is tremendously difficult to modify the actual app, but i se the browser version primary and thin it is possible to use a browser extension to modify my experience.

give me input on the feasibility of such a tool
the primary deliverable is on PC platform, but would like for this to be usable on a mobile device as well (i don't know if browser extensions are available on android device browser so educate me on this possibility)

tell me how this should be done, if it can be done what my tech stack could be like. how i could test this, implement this, ship this.