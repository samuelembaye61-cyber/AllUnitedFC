const LEAGUE_API = window.location.protocol === "file:"
  ? "http://127.0.0.1:8001/api"
  : "/api";

let leagueSeasons = [];
let selectedLeagueSeason = null;
let currentMatches = [];
let activeMatchTab = "results";
let matchRequestId = 0;

const seasonSelect = document.getElementById("league-season-select");
const leagueSelect = document.getElementById("league-select");
const leagueContent = document.getElementById("league-content");
const seasonBadge = document.getElementById("league-season-badge");

function formatLeagueDate(value, options = {}) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

function isCompletedLeagueMatch(match) {
  return Number.isInteger(match.home_score) && Number.isInteger(match.away_score);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showLeagueMessage(message, kind = "empty") {
  leagueContent.replaceChildren(makeElement("p", `league-state-message ${kind}`, message));
  leagueContent.setAttribute("aria-busy", "false");
}

function getUniqueSeasons() {
  const seasonsById = new Map();
  leagueSeasons.forEach(item => seasonsById.set(item.season.id, item.season));
  return [...seasonsById.values()].sort((first, second) => {
    if (first.start_date && second.start_date) return second.start_date.localeCompare(first.start_date);
    if (first.start_date) return -1;
    if (second.start_date) return 1;
    return first.name.localeCompare(second.name);
  });
}

function fillSeasonSelect(defaultSeasonId) {
  seasonSelect.replaceChildren();
  const seasons = getUniqueSeasons();
  seasons.forEach(season => {
    const option = document.createElement("option");
    option.value = String(season.id);
    option.textContent = `${season.name}${season.id === defaultSeasonId ? " — Default" : ""}`;
    seasonSelect.append(option);
  });
  seasonSelect.disabled = seasons.length === 0;
}

function fillLeagueSelect(seasonId, preferredLeagueSeasonId = null) {
  const available = leagueSeasons.filter(item => item.season.id === Number(seasonId));
  leagueSelect.replaceChildren();
  available.forEach(item => {
    const option = document.createElement("option");
    option.value = String(item.id);
    option.textContent = item.league.name;
    leagueSelect.append(option);
  });
  leagueSelect.disabled = available.length === 0;

  const preferred = available.find(item => item.id === Number(preferredLeagueSeasonId))
    || available.find(item => item.is_default)
    || available[0];
  if (preferred) {
    leagueSelect.value = String(preferred.id);
    return preferred;
  }
  return null;
}

function renderRecord(record, league) {
  const section = makeElement("section", "league-record-section");
  section.setAttribute("aria-labelledby", "league-record-title");
  const title = makeElement("h2", "league-section-kicker", "All United FC record");
  title.id = "league-record-title";
  section.append(title);
  section.append(makeElement(
    "p",
    "league-points-rule",
    `Points: Win ${league.points_for_win} · Draw ${league.points_for_draw} · Loss ${league.points_for_loss}`,
  ));

  const stats = [
    ["Played", record.played],
    ["Won", record.won],
    ["Drawn", record.drawn],
    ["Lost", record.lost],
    ["Goals for", record.goals_for],
    ["Goals against", record.goals_against],
    ["Goal difference", record.goal_difference],
    ["Points", record.points],
  ];
  const grid = makeElement("dl", "league-record-grid");
  stats.forEach(([label, value]) => {
    const item = makeElement("div", "league-record-stat");
    item.append(makeElement("dt", "", label));
    item.append(makeElement("dd", "", String(value)));
    grid.append(item);
  });
  section.append(grid);
  return section;
}

function renderLeagueOverview(combination) {
  leagueContent.replaceChildren();
  leagueContent.setAttribute("aria-busy", "true");

  const top = makeElement("section", "league-overview");
  const identity = makeElement("div", "league-identity");
  if (combination.league.logo) {
    const logo = document.createElement("img");
    logo.className = "league-logo";
    logo.src = combination.league.logo;
    logo.alt = `${combination.league.name} logo`;
    logo.loading = "lazy";
    logo.addEventListener("error", () => {
      logo.replaceWith(makeElement("span", "league-logo-fallback", "League"));
    }, { once: true });
    identity.append(logo);
  }

  const details = makeElement("div", "league-overview-details");
  details.append(makeElement("p", "league-section-kicker", `${combination.league.name} · ${combination.season.name}`));
  const leagueTitle = makeElement("h2", "league-overview-title", combination.league.name);
  leagueTitle.id = "league-overview-title";
  details.append(leagueTitle);
  details.append(makeElement("p", "league-description", combination.league.description || "League details will be added soon."));
  if (combination.league.official_website) {
    const officialLink = makeElement("a", "league-official-link", "Official league website ↗");
    officialLink.href = combination.league.official_website;
    officialLink.target = "_blank";
    officialLink.rel = "noopener noreferrer";
    details.append(officialLink);
  }
  identity.append(details);
  top.append(identity, renderRecord(combination.club_record, combination.league));

  const matchSection = makeElement("section", "league-matches-section");
  matchSection.setAttribute("aria-labelledby", "league-matches-title");
  const heading = makeElement("h2", "league-matches-title", "Fixtures & results");
  heading.id = "league-matches-title";
  matchSection.append(heading);

  const tabs = makeElement("div", "league-match-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Filter matches");
  [
    ["results", "Results"],
    ["upcoming", "Upcoming"],
    ["all", "All matches"],
  ].forEach(([value, label]) => {
    const tab = makeElement("button", "league-match-tab", label);
    tab.type = "button";
    tab.dataset.matchTab = value;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(activeMatchTab === value));
    tab.addEventListener("click", () => {
      activeMatchTab = value;
      tabs.querySelectorAll(".league-match-tab").forEach(button => {
        button.setAttribute("aria-selected", String(button === tab));
      });
      renderLeagueMatches(matchList, currentMatches, activeMatchTab);
    });
    tabs.append(tab);
  });
  matchSection.append(tabs);

  const matchList = makeElement("div", "league-match-list");
  matchList.id = "league-match-list";
  matchList.setAttribute("role", "tabpanel");
  matchSection.append(matchList);
  leagueContent.append(top, matchSection);
  renderLeagueMatches(matchList, currentMatches, activeMatchTab);
}

function renderLeagueMatches(container, matches, tab) {
  const now = Date.now();
  let filtered = [...matches];
  if (tab === "results") {
    filtered = filtered.filter(isCompletedLeagueMatch);
    filtered.sort((first, second) => Date.parse(second.completed_at || second.date) - Date.parse(first.completed_at || first.date));
  } else if (tab === "upcoming") {
    filtered = filtered.filter(match => !isCompletedLeagueMatch(match) && Date.parse(match.date) >= now);
    filtered.sort((first, second) => Date.parse(first.date) - Date.parse(second.date));
  } else {
    filtered.sort((first, second) => Date.parse(second.date) - Date.parse(first.date));
  }

  container.replaceChildren();
  if (!filtered.length) {
    const emptyMessage = tab === "results"
      ? "No completed results for this league and season yet."
      : tab === "upcoming"
        ? "No upcoming fixtures for this league and season."
        : "No matches are recorded for this league and season yet.";
    container.append(makeElement("p", "league-state-message", emptyMessage));
    return;
  }

  filtered.forEach(match => {
    const hasScore = isCompletedLeagueMatch(match);
    const card = makeElement("article", `league-match-card${hasScore ? " is-result" : " is-fixture"}`);
    const status = !hasScore && Date.parse(match.date) < now ? "Awaiting result" : hasScore ? "Final" : "Fixture";
    card.append(makeElement("p", "league-match-status", status));
    const matchup = makeElement("div", "league-match-matchup");
    matchup.append(makeElement("span", "league-match-team", match.home_team));
    matchup.append(makeElement("strong", "league-match-score", hasScore ? `${match.home_score} – ${match.away_score}` : "vs."));
    matchup.append(makeElement("span", "league-match-team", match.away_team));
    card.append(matchup);
    const dateTime = makeElement("time", "league-match-date", formatLeagueDate(match.date, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }));
    dateTime.dateTime = match.date;
    card.append(dateTime, makeElement("p", "league-match-location", match.location));
    container.append(card);
  });
}

async function selectLeagueSeason(combination) {
  if (!combination) return;
  selectedLeagueSeason = combination;
  activeMatchTab = "results";
  seasonSelect.value = String(combination.season.id);
  fillLeagueSelect(combination.season.id, combination.id);
  seasonBadge.hidden = false;
  seasonBadge.textContent = combination.is_default ? "Current season" : "Past season";
  renderLeagueOverview(combination);

  const requestId = ++matchRequestId;
  try {
    const response = await fetch(`${LEAGUE_API}/matches/?league_season=${encodeURIComponent(combination.id)}`);
    if (!response.ok) throw new Error("Could not load this league's matches.");
    const matches = await response.json();
    if (requestId !== matchRequestId || selectedLeagueSeason.id !== combination.id) return;
    currentMatches = matches;
    renderLeagueMatches(document.getElementById("league-match-list"), currentMatches, activeMatchTab);
  } catch (error) {
    if (requestId !== matchRequestId) return;
    const matchList = document.getElementById("league-match-list");
    if (matchList) matchList.replaceChildren(makeElement("p", "league-state-message error", "Could not load matches. Please try again."));
    console.error(error);
  } finally {
    if (requestId === matchRequestId) leagueContent.setAttribute("aria-busy", "false");
  }
}

async function loadLeagueHub() {
  try {
    const response = await fetch(`${LEAGUE_API}/league-seasons/`);
    if (!response.ok) throw new Error("Could not load league seasons.");
    leagueSeasons = await response.json();

    if (!leagueSeasons.length) {
      seasonSelect.replaceChildren(new Option("No seasons available", ""));
      leagueSelect.replaceChildren(new Option("No leagues available", ""));
      seasonSelect.disabled = true;
      leagueSelect.disabled = true;
      seasonBadge.hidden = true;
      showLeagueMessage("No leagues or seasons have been added yet. Please check back later.");
      return;
    }

    const requestedLeagueSeasonId = new URLSearchParams(window.location.search).get("league_season");
    const requestedCombination = leagueSeasons.find(item => String(item.id) === requestedLeagueSeasonId);
    const defaultCombination = requestedCombination || leagueSeasons.find(item => item.is_default) || leagueSeasons[0];
    fillSeasonSelect(defaultCombination.season.id);
    fillLeagueSelect(defaultCombination.season.id, defaultCombination.id);

    seasonSelect.addEventListener("change", () => {
      const available = leagueSeasons.filter(item => item.season.id === Number(seasonSelect.value));
      const selected = available.find(item => item.is_default) || available[0];
      fillLeagueSelect(seasonSelect.value, selected?.id);
      if (selected) selectLeagueSeason(selected);
    });

    leagueSelect.addEventListener("change", () => {
      const selected = leagueSeasons.find(item => item.id === Number(leagueSelect.value));
      if (selected) selectLeagueSeason(selected);
    });

    selectLeagueSeason(defaultCombination);
  } catch (error) {
    seasonSelect.replaceChildren(new Option("Unable to load seasons", ""));
    leagueSelect.replaceChildren(new Option("Unable to load leagues", ""));
    seasonSelect.disabled = true;
    leagueSelect.disabled = true;
    showLeagueMessage("Could not load the league hub. Please try again later.", "error");
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", loadLeagueHub);

