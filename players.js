// ─── CONFIG ───────────────────────────────────────────────
const API = "http://127.0.0.1:8001/api";

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
const matches = [
  { date: "2026-09-06T15:45:00", home_team: "All United FC", away_team: "Kabsah FC", location: "Merrick-Moore Park · Field 1" },
  { date: "2026-09-13T15:45:00", home_team: "Inter FC", away_team: "All United FC", location: "Merrick-Moore Park · Field 1" },
  { date: "2026-09-20T15:45:00", home_team: "All United FC", away_team: "Golden Falcon International", location: "Merrick-Moore Park · Field 2" },
  { date: "2026-09-27T15:45:00", home_team: "Kabsah FC", away_team: "All United FC", location: "Merrick-Moore Park · Field 1" },
  { date: "2026-10-04T15:45:00", home_team: "All United FC", away_team: "Inter FC", location: "Merrick-Moore Park · Field 1" },
  { date: "2026-10-11T15:45:00", home_team: "Golden Falcon International", away_team: "All United FC", location: "Merrick-Moore Park · Field 2" }
];

async function loadMatches() {
  const results  = document.getElementById("results-list");
  const upcoming = document.getElementById("upcoming-list");
  try {
    const response = await fetch(`${API}/matches/`);
    if (!response.ok) throw new Error("Matches request failed");
    const data = await response.json();
    const today = new Date();

    const past = data.filter(match => new Date(match.date) < today);
    const future = data.filter(match => new Date(match.date) >= today);

    results.innerHTML = past.length ? past.map(match => matchCard(match)).join("") : "<p class=\"loading\">No results yet.</p>";
    upcoming.innerHTML = future.length ? future.map(match => matchCard(match, true)).join("") : "<p class=\"loading\">No upcoming matches.</p>";
  } catch (error) {
    results.innerHTML = "<p class=\"loading\">Could not connect to the match service.</p>";
    upcoming.innerHTML = "";
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

  if (!payload.name || !payload.email || !payload.position) {
    feedback.style.color = "red";
    feedback.textContent = "Please fill in name, email and position.";
    return;
  }

  try {
    const response = await fetch(`${API}/prospects/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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