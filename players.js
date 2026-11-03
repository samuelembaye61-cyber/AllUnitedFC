// ─── CONFIG ───────────────────────────────────────────────
const API = window.location.protocol === "file:"
  ? "http://127.0.0.1:8001/api"
  : "/api";

// ─── ON PAGE LOAD ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadPlayers();
  loadHomepageLeaguePreview();
});

// ─── PLAYERS ──────────────────────────────────────────────
const POSITION_GROUPS = [
  { value: "goalkeeper", label: "Goalkeeper" },
  { value: "defender", label: "Defender" },
  { value: "midfielder", label: "Midfielder" },
  { value: "forward", label: "Forward / Striker" }
];
function createCountryFlag(player) {
  if (!/^[a-z]{2}$/i.test(player.country_code || "")) return null;

  const flag = document.createElement("img");
  flag.className = "player-flag";
  flag.src = `https://flagcdn.com/${player.country_code.toLowerCase()}.svg`;
  flag.alt = `${player.nationality || player.country_code} flag`;
  flag.loading = "lazy";
  flag.decoding = "async";
  flag.referrerPolicy = "no-referrer";
  flag.addEventListener("error", () => {
    const fallback = document.createElement("span");
    fallback.className = "player-flag-code";
    fallback.textContent = player.country_code.toUpperCase();
    fallback.setAttribute("aria-label", `${player.nationality || "Country"} flag unavailable`);
    flag.replaceWith(fallback);
  }, { once: true });
  return flag;
}

function createPlayerCard(player) {
  const card = document.createElement("article");
  card.className = "player-card";
  card.dataset.positionGroup = player.position_group || "unassigned";
  card.dataset.playerId = player.id;

  const number = document.createElement("span");
  number.className = "player-num";
  number.textContent = `#${player.number}`;

  const photoLine = document.createElement("div");
  photoLine.className = "player-photo-line";
  const avatar = document.createElement("div");
  avatar.className = "player-avatar";
  const photo = document.createElement("img");
  photo.src = player.photo || "images/PHOTO.jpg";
  photo.alt = `${player.name} portrait`;
  photo.loading = "lazy";
  avatar.append(photo);
  photoLine.append(avatar);

  const flag = createCountryFlag(player);
  if (flag) photoLine.append(flag);

  const heading = document.createElement("h3");
  const nameButton = document.createElement("button");
  nameButton.className = "player-name-link";
  nameButton.type = "button";
  nameButton.textContent = player.name;
  nameButton.setAttribute("aria-label", `Read ${player.name}'s profile`);
  nameButton.addEventListener("click", () => openPlayerProfile(player, nameButton));
  heading.append(nameButton);

  const position = document.createElement("span");
  position.className = "player-pos";
  position.textContent = player.position || "Position to confirm";

  const bio = document.createElement("p");
  bio.className = "player-card-bio";
  bio.textContent = player.bio || "Bio not added yet.";

  card.append(number, photoLine, heading, position, bio);
  return card;
}

function buildPlayerProfile(player) {
  const profile = document.createElement("article");
  profile.className = "player-profile-card";

  const header = document.createElement("div");
  header.className = "player-profile-header";
  const media = document.createElement("div");
  media.className = "player-profile-media";

  const photo = document.createElement("img");
  photo.className = "player-profile-photo";
  photo.src = player.photo || "images/PHOTO.jpg";
  photo.alt = `${player.name} portrait`;

  const flagRow = document.createElement("div");
  flagRow.className = "player-profile-flag-row";
  const flag = createCountryFlag(player);
  if (flag) flagRow.append(flag);

  const number = document.createElement("div");
  number.className = "player-profile-number";
  number.textContent = `#${player.number}`;
  media.append(photo, number, flagRow);

  const details = document.createElement("div");
  details.className = "player-profile-details";
  const heading = document.createElement("h2");
  heading.textContent = player.name;
  heading.id = "player-profile-title";
  heading.className = "player-profile-name";

  const position = document.createElement("p");
  position.className = "player-profile-position";
  position.textContent = player.position || "Position to confirm";

  const nationality = document.createElement("p");
  nationality.className = "player-profile-nationality";
  nationality.textContent = player.nationality || "Nationality not added yet.";

  const bio = document.createElement("p");
  bio.className = "player-profile-bio";
  bio.textContent = player.bio || "Player bio or quote will appear here once confirmed.";

  details.append(heading, position, nationality);
  header.append(media, details);
  profile.append(header, bio);

  if (player.bio) {
    const expandButton = document.createElement("button");
    expandButton.className = "player-profile-expand";
    expandButton.type = "button";
    expandButton.textContent = "View full bio";
    expandButton.setAttribute("aria-expanded", "false");
    expandButton.addEventListener("click", () => {
      const expanded = bio.classList.toggle("is-expanded");
      expandButton.textContent = expanded ? "Show less" : "View full bio";
      expandButton.setAttribute("aria-expanded", String(expanded));
    });
    profile.append(expandButton);
  }

  return profile;
}

function renderPlayerSpotlight(players) {
  const spotlight = document.getElementById("player-spotlight");
  const content = document.getElementById("player-spotlight-content");
  if (!spotlight || !content) return;

  const player = players.find(item => item.is_spotlight)
    || players.find(item => item.bio && item.photo)
    || players.find(item => item.bio)
    || players[0];
  if (!player) {
    spotlight.hidden = true;
    return;
  }

  const card = document.createElement("article");
  card.className = "player-spotlight-card";

  const photo = document.createElement("img");
  photo.className = "player-spotlight-photo";
  photo.src = player.photo || "images/PHOTO.jpg";
  photo.alt = `${player.name} portrait`;
  photo.loading = "lazy";

  const flag = createCountryFlag(player);
  const name = document.createElement("button");
  name.className = "player-spotlight-name";
  name.type = "button";
  name.textContent = player.name;
  name.addEventListener("click", () => openPlayerProfile(player, name));

  const position = document.createElement("p");
  position.className = "player-spotlight-position";
  position.textContent = player.position || "Position to confirm";

  const bio = document.createElement("p");
  bio.className = "player-spotlight-bio";
  bio.textContent = player.bio || "Bio not added yet.";

  const profileButton = document.createElement("button");
  profileButton.className = "player-spotlight-link";
  profileButton.type = "button";
  profileButton.textContent = "Read full profile";
  profileButton.addEventListener("click", () => openPlayerProfile(player, profileButton));

  const details = document.createElement("div");
  details.className = "player-spotlight-details";
  const identity = document.createElement("div");
  identity.className = "player-spotlight-identity";
  identity.append(name);
  if (flag) identity.prepend(flag);
  details.append(identity, position, bio, profileButton);
  card.append(photo, details);
  content.replaceChildren(card);
  spotlight.hidden = false;
}

function openPlayerProfile(player, trigger) {
  const dialog = document.getElementById("player-profile-dialog");
  const content = document.getElementById("player-profile-content");
  if (!dialog || !content) return;

  content.replaceChildren();
  content.append(buildPlayerProfile(player));

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  document.getElementById("player-profile-close")?.focus();
  dialog.returnFocusTarget = trigger;
}

function setupPlayerProfiles() {
  const dialog = document.getElementById("player-profile-dialog");
  const closeButton = document.getElementById("player-profile-close");
  if (!dialog || !closeButton) return;

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.returnFocusTarget?.focus());
}

function setupPlayerFilters(players) {
  const grid = document.getElementById("roster-grid");
  const filterBar = document.getElementById("roster-filters");
  const count = document.getElementById("roster-filter-count");
  const expandButton = document.getElementById("roster-expand-button");
  if (!grid || !filterBar) return;

  const filters = [
    { value: "all", label: "All players" },
    ...POSITION_GROUPS.map(group => ({ value: group.value, label: `${group.label}s` }))
  ];
  const buttons = filters.map((filter, index) => {
    const button = document.createElement("button");
    button.className = "news-filter-pill";
    button.type = "button";
    button.dataset.positionFilter = filter.value;
    button.setAttribute("aria-pressed", String(index === 0));
    button.textContent = filter.label;
    filterBar.insertBefore(button, count || null);
    return button;
  });

  const cards = [...grid.querySelectorAll(".player-card")];
  let activeFilter = "all";
  let expanded = false;
  const applyFilter = value => {
    activeFilter = value;
    const matchingCards = cards.filter(card => value === "all" || card.dataset.positionGroup === value);
    const visibleLimit = expanded ? matchingCards.length : 4;
    const visibleCards = new Set(matchingCards.slice(0, visibleLimit));
    cards.forEach(card => {
      card.hidden = !visibleCards.has(card);
    });

    if (count) count.textContent = `${matchingCards.length} ${matchingCards.length === 1 ? "player" : "players"}`;
    if (expandButton) {
      const hasHiddenMatches = matchingCards.length > 4;
      expandButton.hidden = !hasHiddenMatches;
      expandButton.textContent = expanded ? "Show fewer" : `Show all ${matchingCards.length} players`;
      expandButton.setAttribute("aria-expanded", String(expanded));
    }
  };

  buttons.forEach(button => button.addEventListener("click", () => {
    buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    expanded = false;
    applyFilter(button.dataset.positionFilter);
  }));

  if (expandButton) {
    expandButton.addEventListener("click", () => {
      expanded = !expanded;
      applyFilter(activeFilter);
    });
  }

  applyFilter("all");
}

async function loadPlayers() {
  const grid = document.getElementById("roster-grid");
  if (!grid) return;

  setupPlayerProfiles();
  try {
    const response = await fetch(`${API}/players/`);
    if (!response.ok) throw new Error("Players request failed");
    const data = await response.json();
    grid.replaceChildren();
    if (data.length) {
      data.forEach(player => grid.append(createPlayerCard(player)));
      setupPlayerFilters(data);
      renderPlayerSpotlight(data);
    } else {
      grid.innerHTML = "<p class=\"loading\">No players added yet.</p>";
    }
  } catch (error) {
    grid.innerHTML = "<p class=\"loading\">Could not connect to the player service.</p>";
    console.error(error);
  }
}
// ─── MATCHES ──────────────────────────────────────────────


async function loadMatches() {
  const results  = document.getElementById("results-list");
  const upcoming = document.getElementById("upcoming-list");
  const all      = document.getElementById("all-list");
  const points   = document.getElementById("points-list");

  try {
    const response = await fetch(`${API}/matches/`);
    if (!response.ok) throw new Error("Matches request failed");
    const data = await response.json();
    const today = new Date();

    const completed = data.filter(match => Number.isInteger(match.home_score) && Number.isInteger(match.away_score));
    const past = completed.filter(match => new Date(match.date) < today);
    const future = data.filter(match => !completed.includes(match) || new Date(match.date) >= today);

    results.innerHTML = past.length ? past.map(match => matchCard(match)).join("") : "<p class=\"loading\">No results yet.</p>";
    upcoming.innerHTML = future.length ? future.map(match => matchCard(match, true)).join("") : "<p class=\"loading\">No upcoming matches.</p>";
    all.innerHTML = data.length ? data.map(match => matchCard(match, !completed.includes(match))).join("") : "<p class=\"loading\">No matches yet.</p>";
    points.innerHTML = renderPointsTable(getPointsTable(completed));
    if (typeof loadLeagueBadge === "function") loadLeagueBadge();
  } catch (error) {
    results.innerHTML = "<p class=\"loading\">Could not connect to the match service.</p>";
    upcoming.innerHTML = "";
    all.innerHTML = "";
    points.innerHTML = "<p class=\"loading\">Could not load the points table.</p>";
    console.error(error);
  }
}

function leagueSeasonUrl(leagueSeasonId) {
  return `league.html?league_season=${encodeURIComponent(leagueSeasonId)}`;
}

function homepageMatchCard(match, leagueSeason, kind) {
  const card = document.createElement("a");
  card.className = `home-preview-match-card is-${kind}`;
  card.href = leagueSeasonUrl(leagueSeason.id);
  card.setAttribute("aria-label", `${kind === "upcoming" ? "Upcoming fixture" : "Completed result"}: ${match.home_team} versus ${match.away_team}, ${leagueSeason.league.name}, ${leagueSeason.season.name}`);

  const league = document.createElement("p");
  league.className = "home-preview-league";
  league.textContent = leagueSeason.league.name;

  const status = document.createElement("p");
  status.className = "home-preview-status";
  status.textContent = kind === "upcoming" ? "Upcoming fixture" : "Final result";

  const matchup = document.createElement("div");
  matchup.className = "home-preview-matchup";
  const home = document.createElement("span");
  home.textContent = match.home_team;
  const score = document.createElement("strong");
  score.textContent = kind === "upcoming" ? "vs." : `${match.home_score} - ${match.away_score}`;
  const away = document.createElement("span");
  away.textContent = match.away_team;
  matchup.append(home, score, away);

  const dateValue = kind === "upcoming" ? match.date : match.completed_at || match.date;
  const matchDate = new Date(dateValue);
  const dateText = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(matchDate);
  const details = document.createElement("p");
  details.className = "home-preview-details";
  const kickoff = kind === "upcoming"
    ? ` · ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(matchDate)}`
    : "";
  details.textContent = `${dateText}${kickoff} · ${match.location}`;

  card.append(league, status, matchup, details);
  return card;
}

async function loadHomepageLeaguePreview() {
  const preview = document.getElementById("home-match-preview");
  const viewLeagueLink = document.getElementById("home-match-link");
  if (!preview || !viewLeagueLink) return;

  try {
    const leagueResponse = await fetch(`${API}/league-seasons/`);
    if (!leagueResponse.ok) throw new Error("League seasons request failed");
    const combinations = await leagueResponse.json();
    const defaultLeagueSeason = combinations.find(item => item.is_default);
    if (!defaultLeagueSeason) {
      preview.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "home-preview-empty";
      empty.textContent = "No default league season has been selected yet.";
      preview.append(empty);
      viewLeagueLink.href = "league.html";
      return;
    }

    const leagueUrl = leagueSeasonUrl(defaultLeagueSeason.id);
    viewLeagueLink.href = leagueUrl;
    const matchesResponse = await fetch(`${API}/matches/?league_season=${encodeURIComponent(defaultLeagueSeason.id)}`);
    if (!matchesResponse.ok) throw new Error("Default league matches request failed");
    const matches = await matchesResponse.json();

    const hasFinalScore = match => Number.isInteger(match.home_score) && Number.isInteger(match.away_score);
    const now = Date.now();
    const upcoming = matches
      .filter(match => !hasFinalScore(match) && Date.parse(match.date) >= now)
      .sort((first, second) => Date.parse(first.date) - Date.parse(second.date));
    const completed = matches
      .filter(hasFinalScore)
      .sort((first, second) => Date.parse(second.completed_at || second.date) - Date.parse(first.completed_at || first.date));
    const previewMatches = [
      ...upcoming.slice(0, 3).map(match => ({ match, kind: "upcoming" })),
      ...completed.slice(0, Math.max(0, 3 - Math.min(3, upcoming.length))).map(match => ({ match, kind: "result" })),
    ];

    preview.replaceChildren();
    if (!previewMatches.length) {
      const empty = document.createElement("p");
      empty.className = "home-preview-empty";
      empty.textContent = `No matches have been added to ${defaultLeagueSeason.league.name} · ${defaultLeagueSeason.season.name} yet.`;
      preview.append(empty);
      return;
    }

    previewMatches.forEach(({ match, kind }) => {
      preview.append(homepageMatchCard(match, defaultLeagueSeason, kind));
    });
  } catch (error) {
    preview.replaceChildren();
    const message = document.createElement("p");
    message.className = "home-preview-empty is-error";
    message.textContent = "League matches could not be loaded.";
    preview.append(message);
    viewLeagueLink.href = "league.html";
    console.error(error);
  }
}

function renderLatestMatches(matches) {
  const list = document.getElementById("latest-matches-list");
  if (!list) return;

  const latestMatches = [...matches]
    .filter(match => Number.isFinite(Date.parse(match.date)))
    .sort((first, second) => Date.parse(second.date) - Date.parse(first.date))
    .slice(0, 3);

  if (!latestMatches.length) {
    list.innerHTML = "<p class=\"loading\">No matches scheduled yet.</p>";
    return;
  }

  list.innerHTML = latestMatches.map(match => {
    const hasFinalScore = Number.isInteger(match.home_score) && Number.isInteger(match.away_score);
    const date = new Date(match.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `
      <article class="latest-match-card">
        <p class="latest-match-status">${hasFinalScore ? "Final" : "Scheduled"}</p>
        <h3>${match.home_team} <span>vs.</span> ${match.away_team}</h3>
        <p class="latest-match-meta">${date} · ${match.location}</p>
        <p class="latest-match-score">${hasFinalScore ? `${match.home_score} - ${match.away_score}` : "Upcoming"}</p>
      </article>
    `;
  }).join("");
}

function selectHomepageMatch(matches, now = new Date()) {
  const hasFinalScore = match => Number.isInteger(match.home_score) && Number.isInteger(match.away_score);
  const currentTime = now.getTime();
  const recentResult = matches
    .filter(match => {
      if (!hasFinalScore(match) || !match.completed_at) return false;
      const completedTime = Date.parse(match.completed_at);
      return Number.isFinite(completedTime) && completedTime <= currentTime && currentTime - completedTime <= 24 * 60 * 60 * 1000;
    })
    .sort((first, second) => Date.parse(second.completed_at) - Date.parse(first.completed_at))[0];

  if (recentResult) return { match: recentResult, kind: "result" };

  const upcoming = matches
    .filter(match => {
      const matchTime = Date.parse(match.date);
      return !hasFinalScore(match) && Number.isFinite(matchTime) && matchTime >= currentTime;
    })
    .sort((first, second) => Date.parse(first.date) - Date.parse(second.date));
  const within48Hours = upcoming.find(match => Date.parse(match.date) - currentTime <= 48 * 60 * 60 * 1000);

  if (within48Hours) return { match: within48Hours, kind: "upcoming" };
  if (upcoming.length) return { match: upcoming[0], kind: "upcoming" };

  const latestResult = matches
    .filter(hasFinalScore)
    .sort((first, second) => {
      const firstTime = Date.parse(first.completed_at || first.date);
      const secondTime = Date.parse(second.completed_at || second.date);
      return secondTime - firstTime;
    })[0];

  return latestResult ? { match: latestResult, kind: "result" } : null;
}

function renderHomeMatchCard(matches) {
  const card = document.getElementById("home-match-card");
  if (!card) return;

  const selection = selectHomepageMatch(matches);
  const heading = document.getElementById("home-match-heading");
  const matchDate = document.getElementById("home-match-date");
  const link = document.getElementById("home-match-link");
  card.replaceChildren();
  if (!selection) {
    const empty = document.createElement("p");
    empty.className = "home-match-empty";
    empty.textContent = "No matches are scheduled yet.";
    card.append(empty);
    if (heading) heading.textContent = "No fixture scheduled";
    if (matchDate) matchDate.textContent = "";
  } else {
    const { match, kind } = selection;
    if (heading) heading.textContent = kind === "result" ? "Latest result" : "Next match";

    const dateTime = kind === "result" ? match.completed_at || match.date : match.date;
    if (matchDate) {
      matchDate.dateTime = dateTime;
      matchDate.textContent = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/New_York",
      }).format(new Date(dateTime));
    }

    const matchup = document.createElement("div");
    matchup.className = "home-match-matchup";
    const homeTeam = document.createElement("span");
    homeTeam.className = "home-match-team";
    homeTeam.textContent = match.home_team;
    const separator = document.createElement("strong");
    separator.className = "home-match-score";
    separator.textContent = kind === "result" ? `${match.home_score} : ${match.away_score}` : "vs.";
    const awayTeam = document.createElement("span");
    awayTeam.className = "home-match-team";
    awayTeam.textContent = match.away_team;
    matchup.append(homeTeam, separator, awayTeam);
    card.append(matchup);

    if (kind === "upcoming") {
      const details = document.createElement("p");
      details.className = "home-match-detail";
      details.textContent = `${new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
        timeZoneName: "short",
      }).format(new Date(match.date))} · ${match.location}`;
      card.append(details);
    }

    if (link) link.textContent = kind === "result" ? "All results ↗" : "Match centre ↗";
  }
}

function matchCard(m, upcoming = false) {
  const date = new Date(m.date).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
  const outcome = upcoming ? "" : getOutcome(m);
  const score   = upcoming
    ? `<div class="match-score upcoming">Upcoming</div>`
    : `<div class="match-score">${m.home_score} – ${m.away_score}</div>`;
  return `
    <div class="match-card ${outcome}">
      <div class="match-info">
        <div class="match-teams">${m.home_team} vs. ${m.away_team}</div>
        <div class="match-meta">📅 ${date} · ${m.location}</div>
      </div>
      ${score}
    </div>`;
}
function getPointsTable(matches) {
  const table = {};
  matches.forEach(m => {
    const homeScore = Number(m.home_score);
    const awayScore = Number(m.away_score);

    if (!table[m.home_team]) {
      table[m.home_team] = { team: m.home_team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    }
    if (!table[m.away_team]) {
      table[m.away_team] = { team: m.away_team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    }

    const home = table[m.home_team];
    const away = table[m.away_team];
    home.played++;
    away.played++;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (homeScore < awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      home.points++;
      away.drawn++;
      away.points++;
    }
  });

  return Object.values(table).sort((a, b) => {
    const goalDifference = (team) => team.goalsFor - team.goalsAgainst;
    return b.points - a.points || goalDifference(b) - goalDifference(a) || b.goalsFor - a.goalsFor;
  }).filter(team => team.team.trim().toLowerCase() === "all united fc");
}

function renderPointsTable(table) {
  return `
    <div class="club-standings-widget">
      <div class="club-standings-heading">
        <div>
          <div class="section-label">Club record</div>
          <h3>All United FC</h3>
        </div>
        <a class="official-standings-link" href="https://register.allnations.soccer/schedules/47151?view=standings" target="_blank" rel="noopener noreferrer">
          Official league standings <span aria-hidden="true">↗</span>
        </a>
      </div>
      ${table.length ? `
        <div class="points-table-wrap">
          <table class="points-table club-record-table">
            <thead>
              <tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
            </thead>
            <tbody>
              ${table.map(team => `
                <tr>
                  <th scope="row">${team.team}</th>
                  <td>${team.played}</td>
                  <td>${team.won}</td>
                  <td>${team.drawn}</td>
                  <td>${team.lost}</td>
                  <td>${team.goalsFor - team.goalsAgainst}</td>
                  <td><strong>${team.points}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : '<p class="loading">No completed All United FC matches are recorded yet.</p>'}
    </div>
  `;
}
function getOutcome(m) {
  const auHome = m.home_team.toLowerCase().includes("all united");
  const au  = auHome ? m.home_score : m.away_score;
  const opp = auHome ? m.away_score : m.home_score;
  return au > opp ? "win" : au < opp ? "loss" : "draw";
}

// ─── TABS ─────────────────────────────────────────────────
function switchTab(tab, el) {
  document.getElementById("results-list").style.display  = tab === "results"  ? "block" : "none";
  document.getElementById("upcoming-list").style.display = tab === "upcoming" ? "block" : "none";
  document.getElementById("all-list").style.display = tab === "all" ? "block" : "none";
  document.getElementById("points-list").style.display = tab === "points" ? "block" : "none";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
}

// ─── PROSPECT FORM ────────────────────────────────────────
function isValidProspectPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

async function submitProspect() {
  const feedback = document.getElementById("form-feedback");

  const payload = {
    name:     document.getElementById("prospect-name").value.trim(),
    email:    document.getElementById("prospect-email").value.trim(),
    phone:    document.getElementById("prospect-phone").value.trim(),
    position: document.getElementById("prospect-position").value,
    message:  document.getElementById("prospect-message").value.trim(),
  };

  const emailInput = document.getElementById("prospect-email");

  if (!payload.name || !payload.email || !payload.phone || !payload.position) {
    feedback.style.color = "red";
    feedback.textContent = "Please fill in name, email, phone and position.";
    return;
  }

  if (!isValidProspectPhone(payload.phone)) {
    feedback.style.color = "red";
    feedback.textContent = "Enter exactly 10 digits, numbers only.";
    document.getElementById("prospect-phone").focus();
    return;
  }

  if (!emailInput.checkValidity()) {
    feedback.style.color = "red";
    feedback.textContent = "Please enter a valid email address.";
    emailInput.focus();
    return;
  }

  try {
    const csrfResponse = await fetch(`${API}/csrf/`);
    const { csrfToken } = await csrfResponse.json();
    const response = await fetch(`${API}/prospects/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Signup failed");
    feedback.style.color = "green";
    feedback.textContent = "Thanks! Your interest was submitted.";
    clearForm();
  } catch (error) {
    feedback.style.color = "red";
    feedback.textContent = "Could not submit your interest. Please try again.";
    console.error(error);
  }
}

function clearForm() {
  ["prospect-name","prospect-email","prospect-phone","prospect-message"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("prospect-position").value = "";
}