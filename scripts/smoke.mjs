#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 12000);

const checks = [];

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function check(name, fn) {
  const started = Date.now();
  try {
    await fn();
    checks.push({ name, ok: true, ms: Date.now() - started });
  } catch (error) {
    checks.push({
      name,
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function assertOk(res, label) {
  if (!res.ok) {
    throw new Error(`${label} failed with ${res.status}`);
  }
}

function printSummaryAndExit() {
  console.log(`Smoke base URL: ${baseUrl}`);
  let hasFailure = false;
  for (const c of checks) {
    if (c.ok) {
      console.log(`PASS ${c.name} (${c.ms}ms)`);
    } else {
      hasFailure = true;
      console.error(`FAIL ${c.name} (${c.ms}ms): ${c.error}`);
    }
  }
  if (hasFailure) process.exit(1);
}

let userId = null;

await check("GET /health", async () => {
  const res = await fetchWithTimeout(`${baseUrl}/health`);
  assertOk(res, "health");
});

await check("POST /api/demo/setup", async () => {
  const res = await fetchWithTimeout(`${baseUrl}/api/demo/setup`, { method: "POST" });
  assertOk(res, "demo/setup");
  const json = await res.json();
  if (!json?.success || !json?.data?.userId) {
    throw new Error("demo/setup returned no userId");
  }
  userId = json.data.userId;
});

await check("GET /api/demo/status", async () => {
  const res = await fetchWithTimeout(`${baseUrl}/api/demo/status`);
  assertOk(res, "demo/status");
  const json = await res.json();
  if (!json?.success) throw new Error("demo/status success=false");
});

await check("GET /api/bills", async () => {
  if (!userId) throw new Error("missing demo userId");
  const res = await fetchWithTimeout(`${baseUrl}/api/bills`, {
    headers: { "x-user-id": userId },
  });
  assertOk(res, "bills");
  const json = await res.json();
  if (!json?.success || !Array.isArray(json?.data)) {
    throw new Error("bills response shape invalid");
  }
});

await check("GET /api/negotiations", async () => {
  if (!userId) throw new Error("missing demo userId");
  const res = await fetchWithTimeout(`${baseUrl}/api/negotiations`, {
    headers: { "x-user-id": userId },
  });
  assertOk(res, "negotiations");
  const json = await res.json();
  if (!json?.success || !Array.isArray(json?.data)) {
    throw new Error("negotiations response shape invalid");
  }
});

printSummaryAndExit();
