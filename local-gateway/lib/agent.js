import { randomUUID } from "node:crypto";

import { writeProjectFile } from "./filesystem.js";
import { publishEvent } from "./events.js";

/** @type {Map<string, import('./types.js').PendingApproval>} */
const pendingApprovals = new Map();

/** @type {Map<string, import('./types.js').AgentRun>} */
const activeRuns = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} slug
 * @param {{ prompt?: string, agentName?: string, taskType?: string }} body
 */
export async function startAgentRun(slug, body = {}) {
  const runId = randomUUID();
  const prompt = String(body.prompt ?? "").trim() || "No prompt provided";
  const agentName = String(body.agentName ?? "Local Agent");

  const run = {
    runId,
    projectSlug: slug,
    prompt,
    agentName,
    status: "RUNNING",
    createdAt: new Date().toISOString(),
  };

  activeRuns.set(runId, run);

  publishEvent({
    agentName: "System",
    type: "EXECUTION_STATUS",
    payload: { status: "RUNNING", runId, projectSlug: slug },
  });

  publishEvent({
    agentName,
    type: "THOUGHT",
    payload: {
      message: `Starting local agent run for ${slug}`,
      runId,
      prompt,
    },
  });

  void executeRun(run).catch((error) => {
    const message = error instanceof Error ? error.message : "Agent run failed";
    publishEvent({
      agentName: "System",
      type: "ERROR",
      payload: { message, runId, projectSlug: slug },
    });
    publishEvent({
      agentName: "System",
      type: "EXECUTION_STATUS",
      payload: { status: "FAILED", runId, projectSlug: slug },
    });
    run.status = "FAILED";
  });

  return {
    taskId: runId,
    runId,
    status: "RUNNING",
    model: "local/dummy-agent",
    taskType: body.taskType ?? "code",
  };
}

/**
 * @param {import('./types.js').AgentRun} run
 */
async function executeRun(run) {
  await sleep(400);

  publishEvent({
    agentName: run.agentName,
    type: "THOUGHT",
    payload: {
      message: "Planning file changes for the requested task…",
      runId: run.runId,
    },
  });

  await sleep(500);

  const toolName = "terminal_exec";
  publishEvent({
    agentName: run.agentName,
    type: "TOOL_CALL",
    payload: {
      tool: toolName,
      phase: "start",
      input: { command: `echo "Running for: ${run.prompt.slice(0, 80)}"` },
      runId: run.runId,
      sessionKey: `cockpit:project:${run.projectSlug}`,
    },
  });

  const requestId = randomUUID();
  const approval = {
    requestId,
    runId: run.runId,
    projectSlug: run.projectSlug,
    toolName,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  pendingApprovals.set(requestId, approval);
  run.status = "WAITING_APPROVAL";

  publishEvent({
    agentName: "HITL Guard",
    type: "APPROVAL_REQUEST",
    payload: {
      requestId,
      toolName,
      description: `Approve terminal command for project ${run.projectSlug}?`,
      riskLevel: "high",
      projectSlug: run.projectSlug,
      runId: run.runId,
      source: "gateway",
      arguments: { command: "local-agent bootstrap" },
    },
  });

  publishEvent({
    agentName: "System",
    type: "EXECUTION_STATUS",
    payload: {
      status: "WAITING_APPROVAL",
      runId: run.runId,
      projectSlug: run.projectSlug,
    },
  });
}

/**
 * @param {string} approvalId
 * @param {{ decision?: string, projectSlug?: string }} body
 */
export async function resolveApproval(approvalId, body = {}) {
  const approval = pendingApprovals.get(approvalId);
  if (!approval) {
    const error = new Error(`Approval not found: ${approvalId}`);
    error.statusCode = 404;
    throw error;
  }

  if (approval.status !== "PENDING") {
    const error = new Error(`Approval is not pending: ${approvalId}`);
    error.statusCode = 409;
    throw error;
  }

  if (body.projectSlug && body.projectSlug !== approval.projectSlug) {
    const error = new Error("Project slug mismatch for approval");
    error.statusCode = 403;
    throw error;
  }

  const decision = String(body.decision ?? "").toUpperCase();
  const approved = decision === "APPROVE" || decision === "APPROVED" || decision === "TRUE";

  approval.status = approved ? "APPROVED" : "REJECTED";
  approval.resolvedAt = new Date().toISOString();

  const run = activeRuns.get(approval.runId);
  if (!run) {
    const error = new Error(`Run not found for approval: ${approvalId}`);
    error.statusCode = 404;
    throw error;
  }

  if (!approved) {
    run.status = "FAILED";
    publishEvent({
      agentName: "System",
      type: "ERROR",
      payload: {
        message: "Execution rejected by operator",
        runId: run.runId,
        requestId: approvalId,
      },
    });
    publishEvent({
      agentName: "System",
      type: "EXECUTION_STATUS",
      payload: {
        status: "FAILED",
        runId: run.runId,
        projectSlug: run.projectSlug,
      },
    });

    return {
      ok: true,
      requestId: approvalId,
      decision: "REJECT",
      executionStatus: "FAILED",
    };
  }

  run.status = "RUNNING";
  publishEvent({
    agentName: "System",
    type: "EXECUTION_STATUS",
    payload: {
      status: "RUNNING",
      runId: run.runId,
      projectSlug: run.projectSlug,
    },
  });

  const outputPath = "src/agent-output.txt";
  const content = [
    "# Generated by local gateway agent",
    "",
    `Project: ${run.projectSlug}`,
    `Prompt: ${run.prompt}`,
    `Run ID: ${run.runId}`,
    `Approved at: ${approval.resolvedAt}`,
    "",
  ].join("\n");

  const writeResult = await writeProjectFile(run.projectSlug, outputPath, content, true);

  publishEvent({
    agentName: run.agentName,
    type: "FILE_WRITE",
    payload: {
      tool: "file_write",
      phase: "result",
      path: `${run.projectSlug}/${outputPath}`,
      input: { path: outputPath },
      output: { bytesWritten: writeResult.bytesWritten },
      runId: run.runId,
      sessionKey: `cockpit:project:${run.projectSlug}`,
    },
  });

  run.status = "COMPLETED";
  publishEvent({
    agentName: "System",
    type: "EXECUTION_STATUS",
    payload: {
      status: "COMPLETED",
      runId: run.runId,
      projectSlug: run.projectSlug,
    },
  });

  return {
    ok: true,
    requestId: approvalId,
    decision: "APPROVE",
    executionStatus: "COMPLETED",
  };
}

export function getPendingApprovals() {
  return [...pendingApprovals.values()].filter((item) => item.status === "PENDING");
}
