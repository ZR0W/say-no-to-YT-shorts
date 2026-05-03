/** WebExtension API: Firefox exposes `browser`, Chromium exposes `chrome`. */
const ext = globalThis.browser ?? globalThis.chrome;

const DEFAULT_SETTINGS = {
  hideSidebarShorts: true,
  hideReelShelf: true,
  hideRichShortsSections: true,
  hideNavigationShorts: true,
};

let currentSettings = { ...DEFAULT_SETTINGS };
let debounceScheduled = false;

/** True for Shorts *feed* URLs, not individual /shorts/{id} watch URLs. */
function isShortsFeedHref(href) {
  if (!href || href.startsWith("javascript:")) return false;
  try {
    const u = new URL(href, location.origin || "https://www.youtube.com");
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "feed" && parts[1] === "shorts") return true;
    if (parts[0] === "shorts" && parts.length === 1) return true;
    return false;
  } catch {
    return false;
  }
}

function isDebug() {
  try {
    return sessionStorage.getItem("sntys_debug") === "1";
  } catch {
    return false;
  }
}

function dbg(...args) {
  if (isDebug()) {
    console.info("[say-no-to-yt-shorts]", ...args);
  }
}

async function loadSettings() {
  try {
    const stored = await ext.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (e) {
    console.warn("[say-no-to-yt-shorts] storage sync read failed, using defaults", e);
    return { ...DEFAULT_SETTINGS };
  }
}

/** YouTube’s Polymer `:host` rules can beat extension stylesheets; inline wins. */
function setForcedHidden(el, hide) {
  if (!el) return;
  if (hide) {
    el.classList.add("sntys-force-hide");
    el.style.setProperty("display", "none", "important");
  } else {
    el.classList.remove("sntys-force-hide");
    el.style.removeProperty("display");
  }
}

/** Backup rules when inline style is cleared (e.g. toggles). */
function ensureFallbackStyle() {
  const id = "sntys-fallback-style";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    ytd-guide-entry-renderer.sntys-force-hide,
    ytd-mini-guide-entry-renderer.sntys-force-hide,
    ytd-reel-shelf-renderer.sntys-force-hide,
    ytd-rich-shelf-renderer[is-shorts].sntys-force-hide,
    ytd-rich-section-renderer.sntys-shorts-heading.sntys-force-hide,
    yt-chip-cloud-chip-renderer.sntys-force-hide,
    ytd-chip-cloud-chip-renderer.sntys-force-hide {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function applySettingsToDom(settings) {
  const root = document.documentElement;
  root.dataset.sntysHideSidebar = settings.hideSidebarShorts ? "1" : "0";
  root.dataset.sntysHideReel = settings.hideReelShelf ? "1" : "0";
  root.dataset.sntysHideRich = settings.hideRichShortsSections ? "1" : "0";
  root.dataset.sntysHideNav = settings.hideNavigationShorts ? "1" : "0";
  dbg("dataset flags", {
    sidebar: root.dataset.sntysHideSidebar,
    reel: root.dataset.sntysHideReel,
    rich: root.dataset.sntysHideRich,
    nav: root.dataset.sntysHideNav,
  });
}

function getTitleText(section) {
  const shelfTitle = section.querySelector(
    "ytd-rich-shelf-renderer #title, ytd-rich-shelf-renderer span#title"
  );
  if (shelfTitle) {
    return shelfTitle.textContent.trim().toLowerCase();
  }
  const titleSlot = section.querySelector("#title, [class*='title'], h2");
  if (!titleSlot) return "";
  const formatted = titleSlot.querySelector("yt-formatted-string");
  return (formatted || titleSlot).textContent.trim().toLowerCase();
}

function markRichShortsSections() {
  if (!currentSettings.hideRichShortsSections) {
    document.querySelectorAll(".sntys-shorts-heading").forEach((el) => {
      el.classList.remove("sntys-shorts-heading");
    });
    return;
  }

  document.querySelectorAll("ytd-rich-section-renderer").forEach((section) => {
    const hasShortsShelf = section.querySelector("ytd-rich-shelf-renderer[is-shorts]");
    const text = getTitleText(section);
    const textShorts = text === "shorts" || /^shorts\b/.test(text);
    /*
      The is-shorts home row is hidden via hideReelShelf on ytd-rich-shelf-renderer.
      Do not also tag the parent section, or "hide rich section" can block the shelf
      when "hide reel" is off.
    */
    if (hasShortsShelf) {
      section.classList.remove("sntys-shorts-heading");
    } else if (textShorts) {
      section.classList.add("sntys-shorts-heading");
    } else {
      section.classList.remove("sntys-shorts-heading");
    }
  });
}

function markShortsChips() {
  if (!currentSettings.hideNavigationShorts) {
    document.querySelectorAll(".sntys-shorts-chip").forEach((el) => {
      el.classList.remove("sntys-shorts-chip", "sntys-force-hide");
      el.style.removeProperty("display");
    });
    return;
  }

  const chipSelectors = [
    "yt-chip-cloud-chip-renderer",
    "ytd-chip-cloud-chip-renderer",
  ];

  chipSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((chip) => {
      const link = chip.querySelector('a[href*="/shorts"]');
      const label = chip.querySelector("yt-formatted-string");
      const labelText = label ? label.textContent.trim().toLowerCase() : "";
      if (link || labelText === "shorts") {
        chip.classList.add("sntys-shorts-chip");
      } else {
        chip.classList.remove("sntys-shorts-chip", "sntys-force-hide");
        chip.style.removeProperty("display");
      }
    });
  });
}

/** Sidebar: list rows, mini-guide icons, and HOME-adjacent chip/tab controls in the guide column. */
function applySidebarShortsHides(hideSidebar) {
  function guideEntryIsShorts(entry) {
    const title = entry.querySelector(".title");
    if (title && title.textContent.trim().toLowerCase() === "shorts") return true;
    for (const a of entry.querySelectorAll("a[href]")) {
      if (isShortsFeedHref(a.getAttribute("href"))) return true;
    }
    const tab = entry.querySelector('button[role="tab"]');
    if (tab) {
      const txt = tab.textContent.trim().toLowerCase();
      const al = (tab.getAttribute("aria-label") || "").toLowerCase();
      if (txt === "shorts" || al.includes("shorts")) return true;
    }
    return false;
  }

  document.querySelectorAll("ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer").forEach((entry) => {
    setForcedHidden(entry, !!(hideSidebar && guideEntryIsShorts(entry)));
  });

  document
    .querySelectorAll("#guide-inner-content, tp-yt-app-drawer#guide, ytd-guide-renderer")
    .forEach((region) => {
      region.querySelectorAll("yt-chip-cloud-chip-renderer, ytd-chip-cloud-chip-renderer").forEach((chip) => {
        let shorts = false;
        chip.querySelectorAll("a[href]").forEach((a) => {
          if (isShortsFeedHref(a.getAttribute("href"))) shorts = true;
        });
        const tab = chip.querySelector('button[role="tab"]');
        if (tab) {
          const txt = tab.textContent.trim().toLowerCase();
          const al = (tab.getAttribute("aria-label") || "").toLowerCase();
          if (txt === "shorts" || al.includes("shorts")) shorts = true;
        }
        const label = chip.querySelector("yt-formatted-string");
        if (label && label.textContent.trim().toLowerCase() === "shorts") shorts = true;
        const chipDiv = chip.querySelector(".ytChipShapeChip div");
        if (chipDiv && chipDiv.textContent.trim().toLowerCase() === "shorts") shorts = true;
        setForcedHidden(chip, !!(hideSidebar && shorts));
      });
    });
}

function applyForceHides() {
  const hideSidebar = currentSettings.hideSidebarShorts;
  const hideReel = currentSettings.hideReelShelf;
  const hideRich = currentSettings.hideRichShortsSections;
  const hideNav = currentSettings.hideNavigationShorts;

  applySidebarShortsHides(hideSidebar);

  document.querySelectorAll("ytd-reel-shelf-renderer").forEach((el) => {
    setForcedHidden(el, hideReel);
  });

  document.querySelectorAll("ytd-rich-shelf-renderer[is-shorts]").forEach((el) => {
    setForcedHidden(el, hideReel);
  });

  document.querySelectorAll("ytd-rich-section-renderer.sntys-shorts-heading").forEach((el) => {
    setForcedHidden(el, hideRich);
  });

  document
    .querySelectorAll(
      "yt-chip-cloud-chip-renderer.sntys-shorts-chip, ytd-chip-cloud-chip-renderer.sntys-shorts-chip"
    )
    .forEach((chip) => {
      setForcedHidden(chip, hideNav);
    });

  if (isDebug()) {
    dbg(
      "counts",
      "reelShelf:",
      document.querySelectorAll("ytd-reel-shelf-renderer").length,
      "richShelf_is-shorts:",
      document.querySelectorAll("ytd-rich-shelf-renderer[is-shorts]").length,
      "expandedGuide:",
      document.querySelectorAll("ytd-guide-entry-renderer").length,
      "miniGuide:",
      document.querySelectorAll("ytd-mini-guide-entry-renderer").length,
      "miniGuide_hidden:",
      document.querySelectorAll("ytd-mini-guide-entry-renderer.sntys-force-hide").length
    );
  }
}

function refreshDomHints() {
  ensureFallbackStyle();
  markRichShortsSections();
  markShortsChips();
  applyForceHides();
}

function scheduleRefresh() {
  if (debounceScheduled) return;
  debounceScheduled = true;
  requestAnimationFrame(() => {
    debounceScheduled = false;
    refreshDomHints();
  });
}

function onStorageChanged(changes, areaName) {
  const keys = Object.keys(DEFAULT_SETTINGS);
  const relevant = keys.some((k) => changes[k]);
  if (!relevant) return;
  dbg("storage change", areaName, changes);
  loadSettings().then((s) => {
    currentSettings = s;
    applySettingsToDom(s);
    refreshDomHints();
  });
}

async function init() {
  try {
    currentSettings = await loadSettings();
    applySettingsToDom(currentSettings);
    dbg("loaded settings", currentSettings);
    dbg("page", location.href);
    refreshDomHints();

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    ext.storage.onChanged.addListener(onStorageChanged);
  } catch (e) {
    console.error("[say-no-to-yt-shorts] init failed", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
