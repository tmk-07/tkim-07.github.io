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

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === "/auth") return authRedirect(request, url, env);
		if (url.pathname === "/callback") return authCallback(request, url, env);
		return new Response("Portfolio CMS OAuth proxy is running.", {
			headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
		});
	},
};
