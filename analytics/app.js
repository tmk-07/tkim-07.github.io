const apiBase = "https://timothy-portfolio-cms-auth.tmkm.workers.dev";
const tokenKey = "portfolio_analytics_token";

const loginView = document.querySelector("#loginView");
const dashboardView = document.querySelector("#dashboardView");
const loginForm = document.querySelector("#loginForm");
const loginStatus = document.querySelector("#loginStatus");
const dashboardStatus = document.querySelector("#dashboardStatus");
const periodSelect = document.querySelector("#period");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(`${value.replace(" ", "T")}Z`));
}

function formatEventTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
    .format(new Date(`${value.replace(" ", "T")}Z`));
}

function showLogin(message = "") {
  sessionStorage.removeItem(tokenKey);
  loginView.hidden = false;
  dashboardView.hidden = true;
  loginStatus.textContent = message;
  document.querySelector("#pin").focus();
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
}

async function api(path, options = {}) {
  const token = sessionStorage.getItem(tokenKey);
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function rankingRows(rows, labelKey = "label") {
  if (!rows.length) return '<p class="ranking-empty">No activity yet.</p>';
  const max = Math.max(...rows.map((row) => Number(row.count)));
  return rows.map((row) => `
    <div class="ranking-row">
      <span class="ranking-label" title="${escapeHtml(row[labelKey] || "Unknown")}">${escapeHtml(row[labelKey] || "Unknown")}</span>
      <span class="ranking-value">${Number(row.count).toLocaleString()}</span>
      <span class="ranking-track"><i style="--width:${Math.max(4, Number(row.count) / max * 100)}%"></i></span>
    </div>`).join("");
}

function renderDaily(rows, days) {
  const values = new Map(rows.map((row) => [row.day, Number(row.count)]));
  const dates = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    dates.push(date);
  }
  const max = Math.max(1, ...dates.map((date) => values.get(date.toISOString().slice(0, 10)) || 0));
  document.querySelector("#dailyChart").innerHTML = dates.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const count = values.get(key) || 0;
    const label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
    return `<div class="day-bar" style="--height:${Math.max(2, count / max * 100)}%"><span>${escapeHtml(label)} · ${count}</span></div>`;
  }).join("");
}

function renderSessions(sessions) {
  document.querySelector("#sessionCount").textContent = `${sessions.length} most recent`;
  if (!sessions.length) {
    document.querySelector("#sessionList").innerHTML = '<p class="ranking-empty">No sessions yet.</p>';
    return;
  }

  document.querySelector("#sessionList").innerHTML = sessions.map((session) => {
    const location = [session.city, session.region, session.country].filter(Boolean).join(", ") || "Unknown location";
    const events = session.events || [];
    return `
      <details class="session">
        <summary>
          <span>
            <span class="session-title"><strong>Session ${escapeHtml(session.session_id.slice(0, 8))}</strong></span>
            <span class="session-meta">${escapeHtml(location)} · ${escapeHtml(session.device)} · ${escapeHtml(session.referrer || "Direct")}</span>
          </span>
          <span class="session-time">${escapeHtml(formatTime(session.last_seen))}<br>${events.length} events</span>
        </summary>
        <div class="session-details">
          <div class="session-facts">
            <span>${escapeHtml(session.device)}</span><span>${escapeHtml(location)}</span><span>${escapeHtml(session.referrer || "Direct")}</span>
          </div>
          <div class="event-list">
            ${events.map((event) => `
              <div class="event">
                <time>${escapeHtml(formatEventTime(event.created_at))}</time>
                <span class="event-name">${escapeHtml(event.event_name.replaceAll("_", " "))}</span>
                <span class="event-target">${escapeHtml(event.target || event.page)}</span>
              </div>`).join("")}
          </div>
        </div>
      </details>`;
  }).join("");
}

function renderDashboard(data) {
  const metrics = [
    ["Sessions", data.summary.sessions],
    ["Page views", data.summary.pageViews],
    ["Tracked clicks", data.summary.clicks],
    ["Events", data.summary.events],
  ];
  document.querySelector("#metricGrid").innerHTML = metrics.map(([label, value]) => `
    <article class="metric-card"><span>${label}</span><strong>${Number(value).toLocaleString()}</strong></article>`).join("");
  renderDaily(data.dailySessions, data.days);
  document.querySelector("#topClicks").innerHTML = rankingRows(data.topClicks, "target");
  document.querySelector("#referrers").innerHTML = rankingRows(data.referrers, "referrer");
  document.querySelector("#devices").innerHTML = rankingRows(data.devices, "device");
  document.querySelector("#locations").innerHTML = rankingRows(data.locations, "location");
  renderSessions(data.sessions);
}

async function loadDashboard() {
  showDashboard();
  dashboardStatus.textContent = "Loading activity…";
  try {
    const data = await api(`/analytics/data?days=${periodSelect.value}`);
    renderDashboard(data);
    dashboardStatus.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  } catch (error) {
    if (error.status === 401) {
      showLogin("Your login expired. Enter the PIN again.");
      return;
    }
    dashboardStatus.textContent = error.message;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = new FormData(loginForm).get("pin");
  loginStatus.textContent = "Checking…";
  try {
    const result = await api("/analytics/login", { method: "POST", body: JSON.stringify({ pin }) });
    sessionStorage.setItem(tokenKey, result.token);
    loginForm.reset();
    await loadDashboard();
  } catch (error) {
    loginStatus.textContent = error.status === 429 ? "Too many attempts. Try again in 15 minutes." : "Incorrect PIN.";
    document.querySelector("#pin").select();
  }
});

periodSelect.addEventListener("change", loadDashboard);
document.querySelector("#refreshButton").addEventListener("click", loadDashboard);
document.querySelector("#logoutButton").addEventListener("click", () => showLogin("Logged out."));

if (sessionStorage.getItem(tokenKey)) loadDashboard();
