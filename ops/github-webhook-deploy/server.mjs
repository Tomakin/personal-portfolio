import { createServer } from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || 4020);
const GITHUB_WEBHOOK_SECRET = required("GITHUB_WEBHOOK_SECRET");
const APP_DIR = required("APP_DIR");
const DEPLOY_SCRIPT = required("DEPLOY_SCRIPT");
const REPO_FULL_NAME = process.env.REPO_FULL_NAME || "Tomakin/personal-portfolio";
const BRANCH_REF = process.env.BRANCH_REF || "refs/heads/main";

let activeDeploy = null;
let runCounter = 0;
let lastRun = null;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: true,
        service: "github-webhook-deploy",
        busy: Boolean(activeDeploy),
        lastRun,
      });
    }

    if (req.method === "POST" && url.pathname === "/webhooks/github") {
      return handleWebhook(req, res);
    }

    return json(res, 404, { error: "not_found" });
  } catch (error) {
    console.error("[webhook] unhandled error", error);
    return json(res, 500, { error: "internal_error" });
  }
});

server.listen(PORT, () => {
  console.log(`[webhook] listening on :${PORT}`);
});

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[webhook] Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function handleWebhook(req, res) {
  const rawBody = await readBody(req, 1024 * 1024);
  const signature = req.headers["x-hub-signature-256"];
  if (!verifySignature(signature, rawBody, GITHUB_WEBHOOK_SECRET)) {
    return json(res, 401, { error: "invalid_signature" });
  }

  const event = String(req.headers["x-github-event"] || "");
  const deliveryId = String(req.headers["x-github-delivery"] || "");
  if (event !== "push") {
    return json(res, 202, { ignored: true, reason: "unsupported_event", event });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  const repoName = payload?.repository?.full_name;
  const ref = payload?.ref;
  if (repoName !== REPO_FULL_NAME || ref !== BRANCH_REF) {
    return json(res, 202, {
      ignored: true,
      reason: "repo_or_branch_mismatch",
      repoName,
      ref,
    });
  }

  if (activeDeploy) {
    return json(res, 409, {
      error: "deploy_in_progress",
      activeRunId: activeDeploy.id,
    });
  }

  const runId = ++runCounter;
  const startedAt = new Date().toISOString();
  activeDeploy = { id: runId, startedAt };
  lastRun = {
    id: runId,
    status: "running",
    startedAt,
    deliveryId,
    repoName,
    ref,
  };

  console.log(`[webhook] starting deploy run=${runId} delivery=${deliveryId}`);
  const child = spawn("/usr/bin/env", ["bash", DEPLOY_SCRIPT], {
    cwd: APP_DIR,
    env: {
      ...process.env,
      GITHUB_WEBHOOK_DELIVERY: deliveryId,
      WEBHOOK_RUN_ID: String(runId),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[deploy:${runId}] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[deploy:${runId}] ${chunk}`);
  });

  child.on("close", (code, signal) => {
    const finishedAt = new Date().toISOString();
    const status = code === 0 ? "success" : "failed";
    console.log(
      `[webhook] deploy run=${runId} status=${status} code=${code} signal=${signal || ""}`
    );
    lastRun = {
      ...lastRun,
      status,
      finishedAt,
      exitCode: code,
      signal,
    };
    activeDeploy = null;
  });

  child.on("error", (error) => {
    const finishedAt = new Date().toISOString();
    console.error(`[webhook] deploy run=${runId} failed to start`, error);
    lastRun = {
      ...lastRun,
      status: "failed_to_start",
      finishedAt,
      error: error.message,
    };
    activeDeploy = null;
  });

  return json(res, 202, {
    accepted: true,
    runId,
    deliveryId,
  });
}

function verifySignature(signatureHeader, body, secret) {
  if (!signatureHeader || typeof signatureHeader !== "string") return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

async function readBody(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error("payload_too_large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
