const ext = globalThis.browser ?? globalThis.chrome;

const KEYS = [
  "hideSidebarShorts",
  "hideReelShelf",
  "hideRichShortsSections",
  "hideNavigationShorts",
];

const DEFAULTS = {
  hideSidebarShorts: true,
  hideReelShelf: true,
  hideRichShortsSections: true,
  hideNavigationShorts: true,
};

async function loadAndBind() {
  const stored = await ext.storage.sync.get(KEYS);
  const values = { ...DEFAULTS, ...stored };

  KEYS.forEach((key) => {
    const el = document.getElementById(key);
    if (!el) return;
    el.checked = values[key] !== false;

    el.addEventListener("change", async () => {
      await ext.storage.sync.set({ [key]: el.checked });
    });
  });
}

loadAndBind();
