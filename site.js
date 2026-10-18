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

let leagueBadgeRequest;

async function loadLeagueBadge() {
  if (!leagueBadgeRequest) {
    const apiBase = window.location.protocol === 'file:'
      ? 'http://127.0.0.1:8001/api'
      : '/api';

    leagueBadgeRequest = fetch(`${apiBase}/site-branding/`)
      .then(response => {
        if (!response.ok) throw new Error('League badge request failed');
        return response.json();
      })
      .then(branding => branding.league_badge || '')
      .catch(error => {
        console.error(error);
        return '';
      });
  }

  const badgeUrl = await leagueBadgeRequest;
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