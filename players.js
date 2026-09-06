// ─── CONFIG ───────────────────────────────────────────────
const API = window.location.protocol === "file:"
  ? "http://127.0.0.1:8001/api"
  : window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "/api"
    : "https://api.allunitedfc.com/api";

// ─── ON PAGE LOAD ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadPlayers();
  loadMatches();
});

// ─── PLAYERS ──────────────────────────────────────────────
async function loadPlayers() {
  const grid = document.getElementById("roster-grid");
  try {
    const response = await fetch(`${API}/players/`);
    if (!response.ok) throw new Error("Players request failed");
    const data = await response.json();
    grid.innerHTML = data.length ? data.map(player => `
      <div class="player-card">
        <span class="player-num">#${player.number}</span>
        <div class="player-avatar">
          <img src="${player.photo || 'images/PHOTO.jpg'}" alt="${player.name}" />
        </div>
        <h3>${player.name}</h3>
        <div class="player-pos">${player.position || "Player"}</div>
      </div>
    `).join("") : "<p class=\"loading\">No players added yet.</p>";
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
  } catch (error) {
    results.innerHTML = "<p class=\"loading\">Could not connect to the match service.</p>";
    upcoming.innerHTML = "";
    all.innerHTML = "";
    points.innerHTML = "<p class=\"loading\">Could not load the points table.</p>";
    console.error(error);
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
  });
}

function renderPointsTable(table) {
  if (!table.length) return "<p class=\"loading\">No completed matches yet.</p>";
  return `
    <div class="points-table-wrap">
      <table class="points-table">
        <thead>
          <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
        </thead>
        <tbody>
          ${table.map((team, index) => `
            <tr>
              <td>${index + 1}</td>
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

  if (!payload.name || !payload.email || !payload.position) {
    feedback.style.color = "red";
    feedback.textContent = "Please fill in name, email and position.";
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