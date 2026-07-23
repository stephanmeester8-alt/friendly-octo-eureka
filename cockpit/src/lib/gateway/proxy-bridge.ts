import { enqueueApproval } from "@/lib/hitl/approval-queue";
import { publishExecutionStatus, publishInterceptedEvents } from "@/lib/hitl/interceptor";
import type { ToolExecutionContext } from "@/lib/gateway/proxy";
import type { AgentEvent } from "@/types/cockpit";

function createProxyApprovalEvent(context: ToolExecutionContext): AgentEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: "Gateway Proxy",
    type: "APPROVAL_REQUEST",
    payload: {
      requestId: context.requestId,
      toolName: context.toolName,
      description: `Proxy suspended high-risk tool "${context.toolName}" pending operator approval.`,
      riskLevel: "high",
      projectSlug: context.projectSlug,
      runId: context.runId,
      sessionKey: context.sessionKey,
      source: "cockpit",
      proxyHeld: true,
      arguments:
        context.toolInput && typeof context.toolInput === "object"
          ? (context.toolInput as Record<string, unknown>)
          : undefined,
    },
  };
}

export function registerProxySuspension(context: ToolExecutionContext): void {
  enqueueApproval({
    requestId: context.requestId,
    projectSlug: context.projectSlug,
    toolName: context.toolName,
    normalizedTool: context.normalizedTool,
    riskLevel: "high",
    status: "PENDING",
    description: `Proxy suspended high-risk tool "${context.toolName}"`,
    runId: context.runId,
    executionId: context.executionId ?? context.runId,
    sessionKey: context.sessionKey,
    toolInput: context.toolInput,
    createdAt: new Date().toISOString(),
    source: "cockpit",
    proxyHeld: true,
  });

  publishInterceptedEvents([
    createProxyApprovalEvent(context),
    {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agentName: "System",
      type: "EXECUTION_STATUS",
      payload: { status: "WAITING_APPROVAL", proxyHeld: true },
    },
  ]);
  publishExecutionStatus("WAITING_APPROVAL");
}
