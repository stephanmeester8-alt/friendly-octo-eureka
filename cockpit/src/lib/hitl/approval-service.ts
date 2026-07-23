import { getGatewayClient } from "@/lib/gateway/client";
import {
  createProxyDeniedEvent,
  createProxyRejectedEvent,
  getGatewayExecutionProxy,
} from "@/lib/gateway/proxy";
import {
  enqueueApproval,
  getPendingApproval,
} from "@/lib/hitl/approval-queue";
import { publishExecutionStatus, publishInterceptedEvents } from "@/lib/hitl/interceptor";
import { resolveActiveRunId } from "@/lib/hitl/session-registry";
import type { ApprovalDecision, ApprovalResolveResponse } from "@/types/cockpit";

import {
  clearResolvedApprovals,
  resolveApprovalRequest,
} from "./approval-queue";
import {
  ApprovalNotFoundError,
  ApprovalNotPendingError,
  ApprovalProjectMismatchError,
  mapApprovalErrorStatus,
} from "./approval-service.errors";
import { createRejectedEvent } from "./approval-service.helpers";

export {
  ApprovalNotFoundError,
  ApprovalNotPendingError,
  ApprovalProjectMismatchError,
  mapApprovalErrorStatus,
} from "./approval-service.errors";

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

  const proxy = getGatewayExecutionProxy();
  const client = getGatewayClient();

  if (input.decision === "APPROVE") {
    const released = proxy.releaseExecution(input.requestId);
    const gatewayExecutionId =
      released?.executionId ??
      released?.runId ??
      pending.executionId ??
      pending.runId ??
      resolveActiveRunId({ sessionKey: pending.sessionKey });

    if (gatewayExecutionId) {
      await client.releaseToolExecution({
        requestId: input.requestId,
        executionId: gatewayExecutionId,
        runId: released?.runId ?? pending.runId,
        toolName: released?.normalizedTool ?? pending.normalizedTool,
        sessionKey: released?.sessionKey ?? pending.sessionKey,
      });
    }

    if (pending.source === "gateway") {
      await client.resolveApproval({
        approvalId: input.requestId,
        decision: "approve",
        kind: input.kind ?? pending.gatewayKind ?? "exec",
      });
    }

    const events = [];
    if (resolution.releasedEvent) {
      events.push(resolution.releasedEvent);
    }
    publishInterceptedEvents(events);
    publishExecutionStatus("RUNNING");
  } else {
    const rejected = proxy.rejectExecution(
      input.requestId,
      new Error("Operator rejected tool execution"),
    );
    const gatewayExecutionId =
      rejected?.executionId ??
      rejected?.runId ??
      pending.executionId ??
      pending.runId ??
      resolveActiveRunId({ sessionKey: pending.sessionKey });

    if (gatewayExecutionId) {
      await client.abortToolExecution({
        requestId: input.requestId,
        executionId: gatewayExecutionId,
        runId: rejected?.runId ?? pending.runId,
        toolName: rejected?.normalizedTool ?? pending.normalizedTool,
        sessionKey: rejected?.sessionKey ?? pending.sessionKey,
        reason: rejected?.reason ?? "rejected",
      });
    }

    if (pending.source === "gateway") {
      await client.resolveApproval({
        approvalId: input.requestId,
        decision: "deny",
        kind: input.kind ?? pending.gatewayKind ?? "exec",
      });
    }

    publishInterceptedEvents([
      rejected
        ? createProxyRejectedEvent(rejected, "EXECUTION_REJECTED")
        : createRejectedEvent(pending),
    ]);
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

export function publishProxyDenied(context: Parameters<typeof createProxyDeniedEvent>[0]) {
  publishInterceptedEvents([createProxyDeniedEvent(context)]);
  publishExecutionStatus("FAILED");
}
