import type {
  AgentEvent,
  ApprovalDecision,
  ExecutionStatus,
  ToolRiskLevel,
} from "@/types/cockpit";

export type ApprovalSource = "cockpit" | "gateway";
export type PendingApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PendingApproval {
  requestId: string;
  projectSlug: string;
  toolName: string;
  normalizedTool: string;
  riskLevel: ToolRiskLevel;
  status: PendingApprovalStatus;
  description: string;
  runId?: string;
  sessionKey?: string;
  toolInput?: unknown;
  createdAt: string;
  source: ApprovalSource;
  gatewayKind?: string;
  heldEvent?: AgentEvent;
}

export interface ApprovalResolution {
  requestId: string;
  decision: ApprovalDecision;
  executionStatus: ExecutionStatus;
  releasedEvent?: AgentEvent;
}

declare global {
  var __cockpitApprovalQueue: Map<string, PendingApproval> | undefined;
  var __cockpitApprovedToolKeys: Set<string> | undefined;
}

function getQueue(): Map<string, PendingApproval> {
  if (!globalThis.__cockpitApprovalQueue) {
    globalThis.__cockpitApprovalQueue = new Map();
  }
  return globalThis.__cockpitApprovalQueue;
}

function getApprovedKeys(): Set<string> {
  if (!globalThis.__cockpitApprovedToolKeys) {
    globalThis.__cockpitApprovedToolKeys = new Set();
  }
  return globalThis.__cockpitApprovedToolKeys;
}

export function buildToolExecutionKey(input: {
  runId?: string;
  toolName: string;
  sessionKey?: string;
}): string {
  return [input.runId ?? input.sessionKey ?? "unknown", input.toolName].join(":");
}

export function enqueueApproval(approval: PendingApproval): PendingApproval {
  const queue = getQueue();
  queue.set(approval.requestId, approval);
  return approval;
}

export function getPendingApproval(
  requestId: string,
): PendingApproval | undefined {
  return getQueue().get(requestId);
}

export function listPendingApprovals(): PendingApproval[] {
  return Array.from(getQueue().values()).filter(
    (item) => item.status === "PENDING",
  );
}

export function isToolExecutionApproved(toolKey: string): boolean {
  return getApprovedKeys().has(toolKey);
}

export function markToolExecutionApproved(toolKey: string): void {
  getApprovedKeys().add(toolKey);
}

export function resolveApprovalRequest(input: {
  requestId: string;
  decision: ApprovalDecision;
}): ApprovalResolution | null {
  const queue = getQueue();
  const pending = queue.get(input.requestId);

  if (!pending || pending.status !== "PENDING") {
    return null;
  }

  if (input.decision === "APPROVE") {
    pending.status = "APPROVED";
    const toolKey = buildToolExecutionKey({
      runId: pending.runId,
      toolName: pending.normalizedTool,
      sessionKey: pending.sessionKey,
    });
    markToolExecutionApproved(toolKey);

    return {
      requestId: pending.requestId,
      decision: input.decision,
      executionStatus: "RUNNING",
      releasedEvent: pending.heldEvent,
    };
  }

  pending.status = "REJECTED";
  return {
    requestId: pending.requestId,
    decision: input.decision,
    executionStatus: "FAILED",
  };
}

export function hasPendingToolApproval(toolKey: string): boolean {
  return Array.from(getQueue().values()).some(
    (item) =>
      item.status === "PENDING" &&
      buildToolExecutionKey({
        runId: item.runId,
        toolName: item.normalizedTool,
        sessionKey: item.sessionKey,
      }) === toolKey,
  );
}

export function clearResolvedApprovals(): void {
  const queue = getQueue();
  for (const [id, item] of queue) {
    if (item.status !== "PENDING") {
      queue.delete(id);
    }
  }
}
