import { getGatewayClient } from "@/lib/gateway";
import type {
  AgentEvent,
  ApprovalDecision,
  ApprovalResolveResponse,
} from "@/types/cockpit";

import {
  clearResolvedApprovals,
  getPendingApproval,
  resolveApprovalRequest,
} from "./approval-queue";
import {
  publishExecutionStatus,
  publishInterceptedEvents,
} from "./interceptor";

function createRejectedEvent(pending: {
  requestId: string;
  toolName: string;
  projectSlug: string;
}): AgentEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: "HITL Guardrail",
    type: "ERROR",
    payload: {
      code: "APPROVAL_REJECTED",
      requestId: pending.requestId,
      tool: pending.toolName,
      projectSlug: pending.projectSlug,
      message: `Approval rejected for tool "${pending.toolName}"`,
    },
  };
}

export async function processApprovalResolution(input: {
  requestId: string;
  decision: ApprovalDecision;
  projectSlug?: string;
  kind?: string;
}): Promise<ApprovalResolveResponse> {
  const pending = getPendingApproval(input.requestId);
  if (!pending) {
    throw new ApprovalNotFoundError(input.requestId);
  }

  if (input.projectSlug && input.projectSlug !== pending.projectSlug) {
    throw new ApprovalProjectMismatchError();
  }

  const resolution = resolveApprovalRequest({
    requestId: input.requestId,
    decision: input.decision,
  });

  if (!resolution) {
    throw new ApprovalNotPendingError(input.requestId);
  }

  if (pending.source === "gateway") {
    await getGatewayClient().resolveApproval({
      approvalId: input.requestId,
      decision: input.decision === "APPROVE" ? "approve" : "deny",
      kind: input.kind ?? pending.gatewayKind ?? "exec",
    });
  }

  if (input.decision === "APPROVE") {
    const events: AgentEvent[] = [];
    if (resolution.releasedEvent) {
      events.push(resolution.releasedEvent);
    }
    publishInterceptedEvents(events);
    publishExecutionStatus("RUNNING");
  } else {
    publishInterceptedEvents([createRejectedEvent(pending)]);
    publishExecutionStatus("FAILED");
  }

  clearResolvedApprovals();

  return {
    ok: true,
    requestId: input.requestId,
    decision: input.decision,
    executionStatus: resolution.executionStatus,
  };
}

export class ApprovalNotFoundError extends Error {
  constructor(requestId: string) {
    super(`Approval request not found: ${requestId}`);
    this.name = "ApprovalNotFoundError";
  }
}

export class ApprovalNotPendingError extends Error {
  constructor(requestId: string) {
    super(`Approval request is no longer pending: ${requestId}`);
    this.name = "ApprovalNotPendingError";
  }
}

export class ApprovalProjectMismatchError extends Error {
  constructor() {
    super("projectSlug does not match approval request");
    this.name = "ApprovalProjectMismatchError";
  }
}

export function mapApprovalErrorStatus(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof ApprovalNotFoundError) {
    return { status: 404, message: error.message };
  }
  if (error instanceof ApprovalNotPendingError) {
    return { status: 409, message: error.message };
  }
  if (error instanceof ApprovalProjectMismatchError) {
    return { status: 403, message: error.message };
  }

  return {
    status: 502,
    message: error instanceof Error ? error.message : "Failed to resolve approval",
  };
}
