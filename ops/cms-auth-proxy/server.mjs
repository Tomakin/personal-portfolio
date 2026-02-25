import { createServer } from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 4010);
const GITHUB_CLIENT_ID = required("GITHUB_CLIENT_ID");
const GITHUB_CLIENT_SECRET = required("GITHUB_CLIENT_SECRET");
const OAUTH_REDIRECT_URI = required("OAUTH_REDIRECT_URI");
const ALLOWED_ORIGIN = required("ALLOWED_ORIGIN");
const GITHUB_SCOPE = process.env.GITHUB_SCOPE || "public_repo user:email";
const STATE_TTL_MS = 10 * 60 * 1000;

const states = new Map();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [state, createdAt] of states.entries()) {
    if (now - createdAt > STATE_TTL_MS) states.delete(state);
  }
}, 60_000);
cleanupTimer.unref();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, service: "cms-auth-proxy" });
    }

    if (req.method === "GET" && url.pathname === "/auth") {
      return handleAuth(req, res);
    }

    if (req.method === "GET" && url.pathname === "/callback") {
      return handleCallback(req, res, url);
    }

    return json(res, 404, { error: "not_found" });
  } catch (error) {
    console.error("[cms-auth-proxy] unhandled error", error);
    return json(res, 500, { error: "internal_error" });
  }
});

server.listen(PORT, () => {
  console.log(`[cms-auth-proxy] listening on :${PORT}`);
});

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[cms-auth-proxy] Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

function handleAuth(_req, res) {
  const state = crypto.randomBytes(24).toString("hex");
  states.set(state, Date.now());

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", OAUTH_REDIRECT_URI);
  authorizeUrl.searchParams.set("scope", GITHUB_SCOPE);
  authorizeUrl.searchParams.set("state", state);

  res.statusCode = 302;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", authorizeUrl.toString());
  res.end();
}

async function handleCallback(_req, res, url) {
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return callbackHtml(res, {
      ok: false,
      message: `GitHub OAuth error: ${error}${errorDescription ? ` (${errorDescription})` : ""}`,
    });
  }

  if (!code || !state) {
    return callbackHtml(res, { ok: false, message: "Missing OAuth code/state." });
  }

  const createdAt = states.get(state);
  states.delete(state);
  if (!createdAt || Date.now() - createdAt > STATE_TTL_MS) {
    return callbackHtml(res, { ok: false, message: "Invalid or expired OAuth state." });
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "cms-auth-proxy",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: OAUTH_REDIRECT_URI,
      state,
    }),
  });

  const tokenPayload = await safeJson(tokenResponse);
  if (!tokenResponse.ok) {
    return callbackHtml(res, {
      ok: false,
      message: `GitHub token exchange failed (${tokenResponse.status}).`,
      details: tokenPayload,
    });
  }

  if (!tokenPayload.access_token) {
    return callbackHtml(res, {
      ok: false,
      message: "GitHub token response did not include access_token.",
      details: tokenPayload,
    });
  }

  return callbackHtml(res, {
    ok: true,
    token: tokenPayload.access_token,
    provider: "github",
  });
}

async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function callbackHtml(res, payload) {
  res.statusCode = payload.ok ? 200 : 400;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(renderCallbackPage(payload));
}

function renderCallbackPage(payload) {
  const serializedPayload = JSON.stringify(payload);
  const allowedOrigin = JSON.stringify(ALLOWED_ORIGIN);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CMS Authentication</title>
</head>
<body>
  <p id="status">Completing authentication...</p>
  <script>
    (function () {
      var allowedOrigin = ${allowedOrigin};
      var payload = ${serializedPayload};
      var statusEl = document.getElementById("status");

      function setStatus(message) {
        if (statusEl) statusEl.textContent = message;
      }

      function closeSoon() {
        setTimeout(function () {
          try { window.close(); } catch (e) {}
        }, 250);
      }

      function sendResult(origin) {
        if (!window.opener) {
          setStatus("No opener window found.");
          return;
        }

        if (!payload.ok) {
          var errorMessage = payload.message || "Authentication failed";
          window.opener.postMessage(
            "authorization:github:error:" + JSON.stringify({ error: errorMessage }),
            origin
          );
          setStatus(errorMessage);
          closeSoon();
          return;
        }

        window.opener.postMessage(
          "authorization:github:success:" + JSON.stringify({
            token: payload.token,
            provider: payload.provider || "github"
          }),
          origin
        );
        setStatus("Authentication complete. You can close this window.");
        closeSoon();
      }

      window.addEventListener("message", function (event) {
        if (event.origin !== allowedOrigin) {
          setStatus("Blocked unexpected origin: " + event.origin);
          return;
        }
        if (window.__cmsHandshakeDone) return;
        window.__cmsHandshakeDone = true;
        if (window.__cmsHandshakeInterval) {
          clearInterval(window.__cmsHandshakeInterval);
          window.__cmsHandshakeInterval = null;
        }
        sendResult(event.origin);
      });

      if (!window.opener) {
        setStatus("Authentication popup has no opener.");
        return;
      }

      // Decap CMS sometimes misses a one-shot handshake due to popup timing.
      // Re-send until the opener responds.
      function sendHandshake() {
        try {
          window.opener.postMessage("authorizing:github", "*");
        } catch (e) {}
      }

      sendHandshake();
      window.__cmsHandshakeInterval = setInterval(sendHandshake, 300);

      setTimeout(function () {
        if (payload.ok && !window.__cmsHandshakeDone) {
          setStatus("Waiting for CMS window handshake...");
        }
      }, 1000);

      // Last-resort fallback: some browser/privacy modes block the handshake reply.
      // Try sending the success payload directly to the expected origin.
      setTimeout(function () {
        if (!window.__cmsHandshakeDone && payload.ok) {
          setStatus("Handshake timeout, trying direct delivery...");
          sendResult(allowedOrigin);
        }
      }, 4000);
    })();
  </script>
</body>
</html>`;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
