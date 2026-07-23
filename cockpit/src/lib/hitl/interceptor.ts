import { getGatewayEventBus } from "@/lib/gateway/event-bus";
import { readProjectMetadata } from "@/lib/projects";
import type { AgentEvent, ExecutionStatus } from "@/types/cockpit";

import {
  buildToolExecutionKey,
  enqueueApproval,
  getPendingApproval,
  hasPendingToolApproval,
  isToolExecutionApproved,
} from "./approval-queue";
import {
  classifyToolRisk,
  extractProjectSlugFromSessionKey,
  isHighRiskTool,
  isToolAllowed,
  isToolStartPhase,
  normalizeToolName,
} from "./guardrails";
import {
  getExecutionStatus,
  resolveProjectSlug,
  setExecutionStatus,
} from "./session-registry";

function createExecutionStatusEvent(status: ExecutionStatus): AgentEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: "System",
    type: "EXECUTION_STATUS",
    payload: { status },
  };
}

function createUnauthorizedToolEvent(input: {
  toolName: string;
  projectSlug: string;
  allowedTools: string[];
  agentName: string;
  runId?: string;
}): AgentEvent {
  setExecutionStatus("FAILED");

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: input.agentName,
    type: "UNAUTHORIZED_TOOL",
    payload: {
      code: "UNAUTHORIZED_TOOL",
      tool: input.toolName,
      normalizedTool: normalizeToolName(input.toolName),
      projectSlug: input.projectSlug,
      allowedTools: input.allowedTools,
      message: `Tool "${input.toolName}" is not in project allowlist`,
      runId: input.runId,
    },
  };
}

function createApprovalRequestEvent(input: {
  requestId: string;
  toolName: string;
  description: string;
  projectSlug: string;
  runId?: string;
  sessionKey?: string;
  toolInput?: unknown;
  source: "cockpit" | "gateway";
  gatewayKind?: string;
}): AgentEvent {
  setExecutionStatus("WAITING_APPROVAL");

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: "HITL Guardrail",
    type: "APPROVAL_REQUEST",
    payload: {
      requestId: input.requestId,
      toolName: input.toolName,
      description: input.description,
      riskLevel: "high",
      projectSlug: input.projectSlug,
      runId: input.runId,
      sessionKey: input.sessionKey,
      source: input.source,
      kind: input.gatewayKind,
      arguments:
        input.toolInput && typeof input.toolInput === "object"
          ? (input.toolInput as Record<string, unknown>)
          : undefined,
    },
  };
}

async function resolveProjectForEvent(
  event: AgentEvent,
): Promise<string | undefined> {
  const sessionKey =
    typeof event.payload.sessionKey === "string"
      ? event.payload.sessionKey
      : undefined;
  const runId =
    typeof event.payload.runId === "string" ? event.payload.runId : undefined;

  return (
    resolveProjectSlug({ sessionKey, runId }) ??
    extractProjectSlugFromSessionKey(sessionKey) ??
    (typeof event.payload.projectSlug === "string"
      ? event.payload.projectSlug
      : undefined)
  );
}

async function interceptToolEvent(event: AgentEvent): Promise<AgentEvent[]> {
  const toolName =
    typeof event.payload.tool === "string" ? event.payload.tool : undefined;

  if (!toolName) {
    return [event];
  }

  const projectSlug = await resolveProjectForEvent(event);
  if (!projectSlug) {
    return [event];
  }

  let allowedTools: string[] = [];
  try {
    const metadata = await readProjectMetadata(projectSlug);
    allowedTools = metadata.agentConfig.allowedTools;
  } catch {
    return [event];
  }

  const normalizedTool = normalizeToolName(toolName);
  const runId =
    typeof event.payload.runId === "string" ? event.payload.runId : undefined;
  const sessionKey =
    typeof event.payload.sessionKey === "string"
      ? event.payload.sessionKey
      : undefined;
  const phase =
    typeof event.payload.phase === "string" ? event.payload.phase : undefined;

  if (!isToolAllowed(toolName, allowedTools)) {
    return [
      createUnauthorizedToolEvent({
        toolName,
        projectSlug,
        allowedTools,
        agentName: event.agentName,
        runId,
      }),
      createExecutionStatusEvent("FAILED"),
    ];
  }

  if (!isHighRiskTool(toolName) || !isToolStartPhase(phase)) {
    if (getExecutionStatus() === "WAITING_APPROVAL") {
      setExecutionStatus("RUNNING");
    }
    return [event];
  }

  const toolKey = buildToolExecutionKey({
    runId,
    toolName: normalizedTool,
    sessionKey,
  });

  if (isToolExecutionApproved(toolKey)) {
    return [event, createExecutionStatusEvent("RUNNING")];
  }

  const existing = hasPendingToolApproval(toolKey);
  if (existing) {
    return [createExecutionStatusEvent("WAITING_APPROVAL")];
  }

  const requestId = crypto.randomUUID();
  const description = `High-risk tool "${toolName}" requires explicit approval before execution.`;

  enqueueApproval({
    requestId,
    projectSlug,
    toolName,
    normalizedTool,
    riskLevel: classifyToolRisk(toolName),
    status: "PENDING",
    description,
    runId,
    sessionKey,
    toolInput: event.payload.input,
    createdAt: new Date().toISOString(),
    source: "cockpit",
    heldEvent: event,
  });

  return [
    createApprovalRequestEvent({
      requestId,
      toolName,
      description,
      projectSlug,
      runId,
      sessionKey,
      toolInput: event.payload.input,
      source: "cockpit",
    }),
    createExecutionStatusEvent("WAITING_APPROVAL"),
  ];
}

async function interceptGatewayApproval(
  event: AgentEvent,
): Promise<AgentEvent[]> {
  const requestId = String(event.payload.requestId ?? event.id);
  const toolName = String(event.payload.toolName ?? "approval");
  const projectSlug = await resolveProjectForEvent(event);

  if (projectSlug) {
    enqueueApproval({
      requestId,
      projectSlug,
      toolName,
      normalizedTool: normalizeToolName(toolName),
      riskLevel: "high",
      status: "PENDING",
      description: String(
        event.payload.description ?? "Gateway approval required",
      ),
      runId:
        typeof event.payload.runId === "string"
          ? event.payload.runId
          : undefined,
      sessionKey:
        typeof event.payload.sessionKey === "string"
          ? event.payload.sessionKey
          : undefined,
      createdAt: new Date().toISOString(),
      source: "gateway",
      gatewayKind:
        typeof event.payload.kind === "string" ? event.payload.kind : "exec",
    });
  }

  setExecutionStatus("WAITING_APPROVAL");
  return [event, createExecutionStatusEvent("WAITING_APPROVAL")];
}

export async function interceptAgentEvent(
  event: AgentEvent,
): Promise<AgentEvent[]> {
  if (event.type === "TOOL_CALL" || event.type === "FILE_WRITE") {
    return interceptToolEvent(event);
  }

  if (event.type === "APPROVAL_REQUEST") {
    const existing = getPendingApproval(
      String(event.payload.requestId ?? event.id),
    );
    if (existing) {
      return [event, createExecutionStatusEvent("WAITING_APPROVAL")];
    }
    return interceptGatewayApproval(event);
  }

  return [event];
}

export function publishInterceptedEvents(events: AgentEvent[]): void {
  const bus = getGatewayEventBus();
  for (const event of events) {
    bus.publish(event);
  }
}

export function publishExecutionStatus(status: ExecutionStatus): void {
  setExecutionStatus(status);
  publishInterceptedEvents([createExecutionStatusEvent(status)]);
}
