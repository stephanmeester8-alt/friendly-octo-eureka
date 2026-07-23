#!/usr/bin/env node
/**
 * End-to-end workflow test for the Local Workspace Cockpit.
 *
 * Prerequisites: npm run build
 * Usage: node scripts/e2e-workflow.mjs
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COCKPIT_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(COCKPIT_ROOT, "../workspace");
const COCKPIT_URL = process.env.COCKPIT_URL ?? "http://127.0.0.1:3000";
const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://127.0.0.1:18789";
const CLI_ARTIFACT = path.join(
  WORKSPACE_ROOT,
  "projects",
  "demo-project",
  "src",
  "cli_tool.py",
);

const children = [];

function log(step, message) {
  console.log(`[e2e] ${step} ${message}`);
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

function fail(message) {
  console.error(`  ✗ ${message}`);
  process.exitCode = 1;
}

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: COCKPIT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...options.env },
  });
  children.push(child);
  return child;
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForJson(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for JSON at ${url}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamSseUntil(predicate, timeoutMs = 15_000) {
  const events = [];
  const controller = new AbortController();
  const startedAt = Date.now();

  const readerTask = (async () => {
    const response = await fetch(`${COCKPIT_URL}/api/events`, {
      signal: controller.signal,
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (Date.now() - startedAt < timeoutMs) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk
          .split("\n")
          .find((entry) => entry.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6));
        events.push(event);
        if (predicate(event, events)) {
          controller.abort();
          return;
        }
      }
    }
  })();

  await readerTask.catch(() => undefined);
  return events;
}

async function removeArtifactIfPresent() {
  try {
    await fs.unlink(CLI_ARTIFACT);
  } catch {
    // ignore missing file
  }
}

async function main() {
  await removeArtifactIfPresent();
  try {
    await fs.unlink(
      path.join(WORKSPACE_ROOT, "projects", "demo-project", "docs", "CLI_SPEC.md"),
    );
  } catch {
    // ignore missing file
  }

  log("1/7", "Starting mock OpenClaw gateway…");
  spawnProcess("node", ["scripts/mock-openclaw-gateway.mjs"], {
    env: { WORKSPACE_ROOT },
  });
  await waitForJson(`${GATEWAY_URL}/health`);
  pass(`Mock gateway reachable at ${GATEWAY_URL}`);

  log("2/7", "Starting cockpit (next start)…");
  spawnProcess("npm", ["run", "start"], {
    env: {
      WORKSPACE_ROOT,
      AGENT_GATEWAY_URL: GATEWAY_URL,
      PORT: "3000",
    },
  });
  await waitForUrl(COCKPIT_URL);
  pass(`Cockpit reachable at ${COCKPIT_URL}`);

  log("3/7", "Triggering agent run and waiting for HITL approval…");
  const runStartedAt = Date.now();
  const ssePromise = streamSseUntil((event, collected) => {
    const fresh = collected.filter(
      (entry) => Date.parse(entry.timestamp) >= runStartedAt - 1000,
    );
    const hasApproval = fresh.some(
      (entry) => entry.type === "APPROVAL_REQUEST",
    );
    const hasWaiting = fresh.some(
      (entry) =>
        entry.type === "EXECUTION_STATUS" &&
        entry.payload?.status === "WAITING_APPROVAL",
    );
    return hasApproval && hasWaiting;
  }, 20_000);

  const agentResponse = await fetch(`${COCKPIT_URL}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectSlug: "demo-project",
      prompt:
        "Build a Python CLI tool in src/ and write the specification in docs/.",
    }),
  });

  if (!agentResponse.ok) {
    fail(`POST /api/agent failed: ${agentResponse.status}`);
    return;
  }

  const agentBody = await agentResponse.json();
  pass(`Agent run accepted (taskId=${agentBody.taskId})`);

  const events = await ssePromise;
  const freshEvents = events.filter(
    (event) => Date.parse(event.timestamp) >= runStartedAt - 1000,
  );

  const hasThought = freshEvents.some((event) => event.type === "THOUGHT");
  const approval = [...freshEvents]
    .reverse()
    .find(
      (event) =>
        event.type === "APPROVAL_REQUEST" &&
        event.payload?.proxyHeld === true &&
        event.payload?.toolName === "terminal_exec",
    ) ??
    [...freshEvents]
      .reverse()
      .find(
        (event) =>
          event.type === "APPROVAL_REQUEST" &&
          (event.payload?.runId === agentBody.taskId ||
            event.payload?.toolName === "terminal_exec"),
      );
  const waiting = freshEvents.some(
    (event) =>
      event.type === "EXECUTION_STATUS" &&
      event.payload?.status === "WAITING_APPROVAL",
  );

  if (hasThought) pass("SSE received THOUGHT event");
  else fail("Missing THOUGHT event in SSE stream");

  if (!approval) {
    fail("Missing APPROVAL_REQUEST for high-risk terminal_exec");
  } else if (approval.payload?.proxyHeld) {
    pass(
      `SSE received proxy-held APPROVAL_REQUEST (${approval.payload.toolName})`,
    );
  } else {
    fail("Expected proxy-held APPROVAL_REQUEST (proxyHeld=true)");
  }

  if (waiting) pass("Execution status transitioned to WAITING_APPROVAL");
  else fail("Missing WAITING_APPROVAL execution status");

  log("4/7", "Verifying proxy hard-halt before approval…");
  const proxyStateResponse = await fetch(`${GATEWAY_URL}/proxy/state`);
  if (!proxyStateResponse.ok) {
    const body = await proxyStateResponse.text();
    fail(`GET /proxy/state failed: ${proxyStateResponse.status} (${body})`);
  } else {
    const proxyState = await proxyStateResponse.json();
    if (proxyState.suspended?.length > 0) {
      pass("Mock gateway reports suspended execution while awaiting approval");
    } else {
      fail("Expected suspended execution in mock gateway proxy state");
    }
  }

  let artifactExistsBeforeApproval = false;
  try {
    await fs.access(CLI_ARTIFACT);
    artifactExistsBeforeApproval = true;
  } catch {
    artifactExistsBeforeApproval = false;
  }

  if (!artifactExistsBeforeApproval) {
    pass("Artifact file absent while execution is proxy-held");
  } else {
    fail("cli_tool.py was created before operator approval");
  }

  const preApprovalFileWrite = freshEvents.some(
    (event) => event.type === "FILE_WRITE",
  );
  if (!preApprovalFileWrite) {
    pass("No FILE_WRITE events emitted before approval");
  } else {
    fail("FILE_WRITE leaked before approval — proxy did not hard-halt");
  }

  log("5/7", "Approving HITL request via /api/approval…");
  if (!approval) {
    fail("Cannot approve — no pending approval request");
    return;
  }

  const approveResponse = await fetch(`${COCKPIT_URL}/api/approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: approval.payload.requestId,
      decision: "APPROVE",
      projectSlug: "demo-project",
    }),
  });

  if (!approveResponse.ok) {
    const errorBody = await approveResponse.json().catch(() => ({}));
    fail(
      `POST /api/approval failed: ${approveResponse.status} (${errorBody.error ?? "unknown"})`,
    );
    return;
  }

  const approveBody = await approveResponse.json();
  pass(`Approval resolved with status ${approveBody.executionStatus}`);

  log("6/7", "Waiting for file artifacts and explorer API…");
  await delay(1500);

  const filesResponse = await fetch(`${COCKPIT_URL}/api/files`);
  const filesBody = await filesResponse.json();
  const demoProject = filesBody.projects?.find(
    (project) => project.path === "demo-project",
  );

  const treeText = JSON.stringify(demoProject ?? {});
  const hasCli = treeText.includes("cli_tool.py");
  const hasSpec = treeText.includes("CLI_SPEC.md");

  if (hasCli) pass("ProjectExplorer tree includes src/cli_tool.py");
  else fail("Missing src/cli_tool.py in /api/files tree");

  if (hasSpec) pass("ProjectExplorer tree includes docs/CLI_SPEC.md");
  else fail("Missing docs/CLI_SPEC.md in /api/files tree");

  const cliFile = await fetch(
    `${COCKPIT_URL}/api/files?path=${encodeURIComponent("demo-project/src/cli_tool.py")}`,
  );
  if (cliFile.ok) {
    const content = await cliFile.json();
    if (content.content?.includes("greet")) {
      pass("Monaco/API can read generated cli_tool.py content");
    } else {
      fail("cli_tool.py content unexpected");
    }
  } else {
    fail("Failed to read cli_tool.py via /api/files");
  }

  log("7/7", "Collecting post-approval SSE events…");
  const tailEvents = await streamSseUntil(
    (event) =>
      event.type === "FILE_WRITE" &&
      Date.parse(event.timestamp) >= runStartedAt - 1000,
    8_000,
  );

  const allEvents = [...tailEvents, ...freshEvents];
  const hasFileWrite = allEvents.some((event) => event.type === "FILE_WRITE");
  const hasRunning = allEvents.some(
    (event) =>
      event.type === "EXECUTION_STATUS" && event.payload?.status === "RUNNING",
  );

  if (hasFileWrite) pass("SSE received FILE_WRITE after approval");
  else fail("Missing FILE_WRITE event after approval");

  if (hasRunning) pass("Execution status returned to RUNNING");
  else fail("Missing RUNNING execution status after approval");

  console.log("\n[e2e] Workflow summary");
  console.log(`  Events captured: ${allEvents.length}`);
  console.log(
    `  Event types: ${[...new Set(allEvents.map((event) => event.type))].join(", ")}`,
  );

  if (process.exitCode === 0 || process.exitCode === undefined) {
    process.exitCode = 0;
    console.log("\n[e2e] PASS — full workflow validated (proxy hard-halt confirmed)");
  } else {
    console.log("\n[e2e] FAIL — see errors above");
  }
}

function shutdown() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(1);
});

process.on("exit", shutdown);

main().catch((error) => {
  console.error("[e2e] Fatal error:", error);
  process.exitCode = 1;
});
