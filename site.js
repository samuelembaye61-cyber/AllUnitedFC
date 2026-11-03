function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    const isDark = theme === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
    const icon = button.querySelector(".theme-toggle-icon");
    const label = button.querySelector(".theme-toggle-label");
    if (icon) icon.textContent = isDark ? "☀" : "☾";
    if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
  });
}

function resolveSiteAssetUrl(assetUrl) {
  if (!assetUrl) return "";

  try {
    const resolved = new URL(assetUrl, window.location.href);
    const localHosts = ["localhost", "127.0.0.1"];
    const isLocalAsset = localHosts.includes(resolved.hostname);
    const isRemotePage = !localHosts.includes(window.location.hostname);

    if (window.location.protocol !== "file:" && isLocalAsset && isRemotePage) {
      return new URL(`${resolved.pathname}${resolved.search}${resolved.hash}`, window.location.origin).href;
    }
    return resolved.href;
  } catch (error) {
    return assetUrl;
  }
}

let siteBrandingRequest;

async function loadLeagueBadge() {
  if (!siteBrandingRequest) {
    const apiBase = window.location.protocol === 'file:'
      ? 'http://127.0.0.1:8001/api'
      : '/api';

    siteBrandingRequest = fetch(`${apiBase}/site-branding/`)
      .then(response => {
        if (!response.ok) throw new Error('Site branding request failed');
        return response.json();
      })
      .catch(error => {
        console.error(error);
        return { league_badge: '', homepage_background: '', league_background: '' };
      });
  }

  const branding = await siteBrandingRequest;
  if (branding.homepage_background) {
    const backgroundUrl = resolveSiteAssetUrl(branding.homepage_background);
    document.querySelectorAll('.home-masthead').forEach(hero => {
      hero.style.setProperty('--home-background-image', `url(${JSON.stringify(backgroundUrl)})`);
    });
  }
  if (branding.league_background) {
    const backgroundUrl = resolveSiteAssetUrl(branding.league_background);
    document.querySelectorAll('.league-page-hero').forEach(hero => {
      hero.style.setProperty('--league-background-image', `url(${JSON.stringify(backgroundUrl)})`);
    });
  }

  const badgeUrl = resolveSiteAssetUrl(branding.league_badge || '');
  if (!badgeUrl) return;

  document.querySelectorAll('[data-league-badge-slot]').forEach(slot => {
    if (slot.querySelector('.league-badge-image')) return;
    const image = document.createElement('img');
    image.className = 'league-badge-image';
    image.src = badgeUrl;
    image.alt = 'Official league badge';
    image.loading = 'lazy';
    image.decoding = 'async';
    const link = document.createElement('a');
    link.href = 'https://rdu.allnations.soccer/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Visit the All Nations Soccer league website');
    link.append(image);
    slot.classList.add('has-league-badge');
    slot.replaceChildren(link);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadLeagueBadge();

  const themeKey = "allunited_theme";
  let theme = document.documentElement.dataset.theme;
  try {
    theme = localStorage.getItem(themeKey) || theme;
  } catch (error) {
    // Storage may be disabled; the page can still use the system preference.
  }
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  setTheme(theme);

  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      try {
        localStorage.setItem(themeKey, nextTheme);
      } catch (error) {
        // Keep the selected theme for this page even if storage is unavailable.
      }
    });
  });

  document.querySelectorAll("nav").forEach(nav => {
    const button = nav.querySelector(".nav-toggle");
    if (!button) return;

    const closeMenu = () => {
      nav.dataset.menuOpen = "false";
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open navigation menu");
    };

    nav.dataset.menuOpen = "false";

    button.addEventListener("click", () => {
      const isOpen = nav.dataset.menuOpen === "true";
      nav.dataset.menuOpen = String(!isOpen);
      button.setAttribute("aria-expanded", String(!isOpen));
      button.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    });

    nav.querySelectorAll(".nav-links a").forEach(link => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", event => {
      if (!nav.contains(event.target)) closeMenu();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.dataset.menuOpen === "true") {
        closeMenu();
        button.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 481px)").matches) closeMenu();
    });
  });
});