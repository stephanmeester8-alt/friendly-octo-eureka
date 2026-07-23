import type { AgentEvent } from "@/types/cockpit";

export function createRejectedEvent(pending: {
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
