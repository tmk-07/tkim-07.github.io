const STATE_COOKIE = "decap_oauth_state";

function randomHex(bytes) {
	const values = new Uint8Array(bytes);
	crypto.getRandomValues(values);
	return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function readCookie(request, name) {
	const cookieHeader = request.headers.get("Cookie") || "";
	for (const item of cookieHeader.split(";")) {
		const [key, ...value] = item.trim().split("=");
		if (key === name) return decodeURIComponent(value.join("="));
	}
	return "";
}

function callbackPage(status, payload, env) {
	const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
	const safeMessage = JSON.stringify(message).replaceAll("<", "\\u003c");
	const safeOrigin = JSON.stringify(env.ALLOWED_ORIGIN).replaceAll("<", "\\u003c");

	return new Response(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Authorizing portfolio editor</title></head>
<body>
<p>Authorizing the portfolio editor…</p>
<script>
const targetOrigin = ${safeOrigin};
const finish = () => {
	window.opener.postMessage(${safeMessage}, targetOrigin);
	window.removeEventListener("message", finish);
};
window.addEventListener("message", finish);
if (window.opener) window.opener.postMessage("authorizing:github", targetOrigin);
</script>
</body>
</html>`, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			"Referrer-Policy": "no-referrer",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

function authRedirect(request, url, env) {
	if (url.searchParams.get("provider") !== "github") {
		return new Response("Invalid OAuth provider", { status: 400 });
	}

	const siteId = url.searchParams.get("site_id");
	if (siteId && siteId !== env.ALLOWED_SITE_DOMAIN) {
		return new Response("Invalid CMS site", { status: 403 });
	}

	if (!env.GITHUB_OAUTH_ID) {
		return new Response("GitHub OAuth is not configured", { status: 503 });
	}

	const state = randomHex(16);
	const redirectUri = `${url.origin}/callback?provider=github`;
	const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
	authorizeUrl.searchParams.set("client_id", env.GITHUB_OAUTH_ID);
	authorizeUrl.searchParams.set("redirect_uri", redirectUri);
	authorizeUrl.searchParams.set("scope", env.GITHUB_REPO_PRIVATE === "1" ? "repo,user" : "public_repo,user");
	authorizeUrl.searchParams.set("state", state);

	return new Response(null, {
		status: 302,
		headers: {
			Location: authorizeUrl.toString(),
			"Cache-Control": "no-store",
			"Set-Cookie": `${STATE_COOKIE}=${state}; Path=/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
		},
	});
}

async function authCallback(request, url, env) {
	if (url.searchParams.get("provider") !== "github") {
		return new Response("Invalid OAuth provider", { status: 400 });
	}

	const state = url.searchParams.get("state") || "";
	const expectedState = readCookie(request, STATE_COOKIE);
	if (!state || !expectedState || state !== expectedState) {
		return callbackPage("error", { error: "Invalid or expired OAuth state" }, env);
	}

	const code = url.searchParams.get("code");
	if (!code) {
		return callbackPage("error", { error: url.searchParams.get("error_description") || "GitHub did not return an authorization code" }, env);
	}

	try {
		const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: { Accept: "application/json", "Content-Type": "application/json" },
			body: JSON.stringify({
				client_id: env.GITHUB_OAUTH_ID,
				client_secret: env.GITHUB_OAUTH_SECRET,
				code,
				redirect_uri: `${url.origin}/callback?provider=github`,
			}),
		});
		const tokenData = await tokenResponse.json();
		if (!tokenResponse.ok || !tokenData.access_token) {
			throw new Error(tokenData.error_description || tokenData.error || "GitHub token exchange failed");
		}
		return callbackPage("success", { token: tokenData.access_token }, env);
	} catch (error) {
		return callbackPage("error", { error: error instanceof Error ? error.message : "OAuth callback failed" }, env);
	}
}

const ANALYTICS_EVENTS = new Set([
	"page_view",
	"project_open",
	"link_click",
	"button_click",
	"section_click",
	"detail_tab",
	"experience_toggle",
]);

function allowedAnalyticsOrigin(request, env) {
	const origin = request.headers.get("Origin") || "";
	const allowed = new Set([env.ALLOWED_ORIGIN, "http://localhost:4173", "http://127.0.0.1:4173"]);
	return allowed.has(origin) ? origin : "";
}

function corsHeaders(request, env) {
	const origin = allowedAnalyticsOrigin(request, env);
	return {
		...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
		"Access-Control-Allow-Headers": "Authorization, Content-Type",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Max-Age": "86400",
		"Cache-Control": "no-store",
		Vary: "Origin",
	};
}

function jsonResponse(payload, status, request, env) {
	return Response.json(payload, { status, headers: corsHeaders(request, env) });
}

function cleanText(value, maxLength = 120) {
	return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function deviceFromRequest(request) {
	const userAgent = request.headers.get("User-Agent") || "";
	if (/bot|crawler|spider|preview|facebookexternalhit|slurp/i.test(userAgent)) return "Bot";
	if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "Tablet";
	if (/mobile|iphone|ipod|android/i.test(userAgent)) return "Mobile";
	return "Desktop";
}

function bytesToBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function stringToBase64Url(value) {
	return bytesToBase64Url(new TextEncoder().encode(value));
}

async function hmac(value, secret) {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function constantTimeEqual(left, right) {
	const a = String(left);
	const b = String(right);
	let result = a.length ^ b.length;
	const length = Math.max(a.length, b.length);
	for (let index = 0; index < length; index += 1) {
		result |= (a.charCodeAt(index % Math.max(1, a.length)) || 0) ^ (b.charCodeAt(index % Math.max(1, b.length)) || 0);
	}
	return result === 0;
}

async function createAnalyticsToken(env) {
	const payload = stringToBase64Url(JSON.stringify({
		exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60),
		nonce: randomHex(12),
	}));
	return `${payload}.${await hmac(payload, env.ANALYTICS_SESSION_SECRET)}`;
}

async function verifyAnalyticsToken(request, env) {
	const authorization = request.headers.get("Authorization") || "";
	if (!authorization.startsWith("Bearer ") || !env.ANALYTICS_SESSION_SECRET) return false;
	const token = authorization.slice(7);
	const [payload, signature, extra] = token.split(".");
	if (!payload || !signature || extra) return false;
	const expected = await hmac(payload, env.ANALYTICS_SESSION_SECRET);
	if (!constantTimeEqual(signature, expected)) return false;
	try {
		const unpadded = payload.replaceAll("-", "+").replaceAll("_", "/");
		const base64 = unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, "=");
		const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))));
		return Number(decoded.exp) > Math.floor(Date.now() / 1000);
	} catch {
		return false;
	}
}

async function visitorHash(request, env) {
	const ip = request.headers.get("CF-Connecting-IP") || "local";
	return hmac(ip, env.ANALYTICS_SESSION_SECRET);
}

async function analyticsLogin(request, env) {
	if (!allowedAnalyticsOrigin(request, env)) return jsonResponse({ error: "Invalid origin" }, 403, request, env);
	if (!env.ANALYTICS_PIN || !env.ANALYTICS_SESSION_SECRET || !env.ANALYTICS_DB) {
		return jsonResponse({ error: "Analytics is not configured" }, 503, request, env);
	}

	const hash = await visitorHash(request, env);
	const attempt = await env.ANALYTICS_DB.prepare(
		"SELECT failures, window_started FROM login_attempts WHERE visitor_hash = ?",
	).bind(hash).first();
	if (attempt) {
		const windowAge = Date.now() - new Date(`${attempt.window_started.replace(" ", "T")}Z`).getTime();
		if (windowAge < 15 * 60 * 1000 && Number(attempt.failures) >= 5) {
			return jsonResponse({ error: "Too many attempts" }, 429, request, env);
		}
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid request" }, 400, request, env);
	}
	const pin = String(body.pin || "");
	if (!/^\d{4}$/.test(pin) || !constantTimeEqual(pin, env.ANALYTICS_PIN)) {
		await env.ANALYTICS_DB.prepare(`
			INSERT INTO login_attempts (visitor_hash, failures, window_started)
			VALUES (?, 1, datetime('now'))
			ON CONFLICT(visitor_hash) DO UPDATE SET
				failures = CASE WHEN window_started < datetime('now', '-15 minutes') THEN 1 ELSE failures + 1 END,
				window_started = CASE WHEN window_started < datetime('now', '-15 minutes') THEN datetime('now') ELSE window_started END
		`).bind(hash).run();
		return jsonResponse({ error: "Incorrect PIN" }, 401, request, env);
	}

	await env.ANALYTICS_DB.prepare("DELETE FROM login_attempts WHERE visitor_hash = ?").bind(hash).run();
	return jsonResponse({ token: await createAnalyticsToken(env), expiresIn: 28800 }, 200, request, env);
}

async function recordAnalyticsEvent(request, env) {
	if (!allowedAnalyticsOrigin(request, env)) return jsonResponse({ error: "Invalid origin" }, 403, request, env);
	if (!env.ANALYTICS_DB) return jsonResponse({ error: "Analytics is not configured" }, 503, request, env);

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid request" }, 400, request, env);
	}

	const sessionId = cleanText(body.sessionId, 64);
	const eventName = cleanText(body.eventName, 40);
	if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !ANALYTICS_EVENTS.has(eventName)) {
		return jsonResponse({ error: "Invalid event" }, 400, request, env);
	}

	const cf = request.cf || {};
	const referrer = cleanText(body.referrer || "Direct", 160);
	const device = deviceFromRequest(request);
	const country = cleanText(cf.country, 80);
	const region = cleanText(cf.region, 100);
	const city = cleanText(cf.city, 100);

	await env.ANALYTICS_DB.batch([
		env.ANALYTICS_DB.prepare(`
			INSERT INTO sessions (session_id, referrer, device, country, region, city)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(session_id) DO UPDATE SET
				last_seen = datetime('now'), device = excluded.device
		`).bind(sessionId, referrer, device, country, region, city),
		env.ANALYTICS_DB.prepare(
			"INSERT INTO events (session_id, event_name, target, page) VALUES (?, ?, ?, ?)",
		).bind(sessionId, eventName, cleanText(body.target), cleanText(body.page || "/", 160)),
	]);

	return jsonResponse({ ok: true }, 202, request, env);
}

async function analyticsData(request, url, env) {
	if (!allowedAnalyticsOrigin(request, env)) return jsonResponse({ error: "Invalid origin" }, 403, request, env);
	if (!await verifyAnalyticsToken(request, env)) return jsonResponse({ error: "Unauthorized" }, 401, request, env);
	if (!env.ANALYTICS_DB) return jsonResponse({ error: "Analytics is not configured" }, 503, request, env);

	const requestedDays = Number(url.searchParams.get("days"));
	const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
	const since = `-${days} days`;

	const [summaryResult, dailyResult, clicksResult, referrerResult, deviceResult, locationResult, sessionsResult] = await env.ANALYTICS_DB.batch([
		env.ANALYTICS_DB.prepare(`
			SELECT
				(SELECT COUNT(*) FROM sessions WHERE first_seen >= datetime('now', ?)) AS sessions,
				COUNT(*) AS events,
				SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
				SUM(CASE WHEN event_name != 'page_view' THEN 1 ELSE 0 END) AS clicks
			FROM events WHERE created_at >= datetime('now', ?)
		`).bind(since, since),
		env.ANALYTICS_DB.prepare(`
			SELECT date(first_seen) AS day, COUNT(*) AS count
			FROM sessions WHERE first_seen >= datetime('now', ?)
			GROUP BY date(first_seen) ORDER BY day
		`).bind(since),
		env.ANALYTICS_DB.prepare(`
			SELECT target, COUNT(*) AS count FROM events
			WHERE created_at >= datetime('now', ?) AND event_name != 'page_view'
			GROUP BY target ORDER BY count DESC LIMIT 8
		`).bind(since),
		env.ANALYTICS_DB.prepare(`
			SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, COUNT(*) AS count
			FROM sessions WHERE first_seen >= datetime('now', ?)
			GROUP BY referrer ORDER BY count DESC LIMIT 8
		`).bind(since),
		env.ANALYTICS_DB.prepare(`
			SELECT device, COUNT(*) AS count FROM sessions
			WHERE first_seen >= datetime('now', ?)
			GROUP BY device ORDER BY count DESC
		`).bind(since),
		env.ANALYTICS_DB.prepare(`
			SELECT city, region, country, COUNT(*) AS count FROM sessions
			WHERE first_seen >= datetime('now', ?)
			GROUP BY city, region, country ORDER BY count DESC LIMIT 8
		`).bind(since),
		env.ANALYTICS_DB.prepare(`
			SELECT * FROM sessions WHERE first_seen >= datetime('now', ?)
			ORDER BY last_seen DESC LIMIT 100
		`).bind(since),
	]);

	const sessions = sessionsResult.results || [];
	let events = [];
	if (sessions.length) {
		const placeholders = sessions.map(() => "?").join(",");
		const eventResult = await env.ANALYTICS_DB.prepare(`
			SELECT session_id, event_name, target, page, created_at FROM events
			WHERE session_id IN (${placeholders}) ORDER BY created_at ASC
		`).bind(...sessions.map((session) => session.session_id)).all();
		events = eventResult.results || [];
	}

	const eventsBySession = new Map();
	for (const event of events) {
		if (!eventsBySession.has(event.session_id)) eventsBySession.set(event.session_id, []);
		eventsBySession.get(event.session_id).push(event);
	}
	const summary = summaryResult.results?.[0] || {};

	return jsonResponse({
		days,
		summary: {
			sessions: Number(summary.sessions || 0),
			events: Number(summary.events || 0),
			pageViews: Number(summary.page_views || 0),
			clicks: Number(summary.clicks || 0),
		},
		dailySessions: dailyResult.results || [],
		topClicks: clicksResult.results || [],
		referrers: referrerResult.results || [],
		devices: deviceResult.results || [],
		locations: (locationResult.results || []).map((row) => ({
			location: [row.city, row.region, row.country].filter(Boolean).join(", ") || "Unknown",
			count: row.count,
		})),
		sessions: sessions.map((session) => ({ ...session, events: eventsBySession.get(session.session_id) || [] })),
	}, 200, request, env);
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (request.method === "OPTIONS" && url.pathname.startsWith("/analytics/")) {
			return new Response(null, { status: 204, headers: corsHeaders(request, env) });
		}
		if (url.pathname === "/auth") return authRedirect(request, url, env);
		if (url.pathname === "/callback") return authCallback(request, url, env);
		if (url.pathname === "/analytics/login" && request.method === "POST") return analyticsLogin(request, env);
		if (url.pathname === "/analytics/event" && request.method === "POST") return recordAnalyticsEvent(request, env);
		if (url.pathname === "/analytics/data" && request.method === "GET") return analyticsData(request, url, env);
		return new Response("Portfolio CMS OAuth proxy is running.", {
			headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
		});
	},
	async scheduled(_event, env, context) {
		context.waitUntil(env.ANALYTICS_DB.batch([
			env.ANALYTICS_DB.prepare("DELETE FROM events WHERE created_at < datetime('now', '-90 days')"),
			env.ANALYTICS_DB.prepare("DELETE FROM sessions WHERE last_seen < datetime('now', '-90 days')"),
			env.ANALYTICS_DB.prepare("DELETE FROM login_attempts WHERE window_started < datetime('now', '-1 day')"),
		]));
	},
};
