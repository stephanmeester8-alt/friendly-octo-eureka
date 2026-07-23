import type { AgentEvent, AgentEventType } from "@/types/cockpit";

import type { GatewayEventFrame } from "./types";

const FILE_WRITE_TOOL_PATTERN =
  /write|patch|edit|save|create.*file|file.*write/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function inferAgentName(payload: Record<string, unknown>): string {
  return (
    readString(payload, "agentId", "agentName", "agent") ??
    readString(asRecord(payload.data), "agentId", "agentName") ??
    "OpenClaw"
  );
}

function mapToolEvent(
  payload: Record<string, unknown>,
  agentName: string,
): AgentEvent | null {
  const data = asRecord(payload.data ?? payload);
  const toolName =
    readString(data, "name", "toolName", "tool") ??
    readString(payload, "toolName", "name");
  const phase = readString(data, "phase", "status");
  const path =
    readString(data, "path", "filePath", "file") ??
    readString(asRecord(data.input), "path", "filePath", "file");

  if (!toolName) {
    return null;
  }

  const isFileWrite = FILE_WRITE_TOOL_PATTERN.test(toolName);
  const type: AgentEventType = isFileWrite ? "FILE_WRITE" : "TOOL_CALL";

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName,
    type,
    payload: {
      tool: toolName,
      phase,
      path,
      input: data.input ?? data.args ?? data.arguments,
      output: data.output ?? data.result,
      runId: payload.runId,
      sessionKey: readString(payload, "sessionKey"),
    },
  };
}

function mapAssistantEvent(
  payload: Record<string, unknown>,
  agentName: string,
): AgentEvent | null {
  const data = asRecord(payload.data);
  const text =
    readString(data, "text", "deltaText", "message", "content") ??
    readString(payload, "text", "message");

  if (!text?.trim()) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName,
    type: "THOUGHT",
    payload: {
      message: text,
      stream: payload.stream ?? "assistant",
      runId: payload.runId,
    },
  };
}

function mapApprovalEvent(
  frame: GatewayEventFrame,
  agentName: string,
): AgentEvent {
  const payload = asRecord(frame.payload);
  const requestId =
    readString(payload, "id", "approvalId", "requestId") ?? crypto.randomUUID();
  const toolName =
    readString(payload, "toolName", "command", "kind", "name") ?? "approval";
  const description =
    readString(payload, "description", "summary", "message", "reason") ??
    `Approval required for ${toolName}`;
  const kind =
    frame.event === "plugin.approval.requested"
      ? "plugin"
      : frame.event === "exec.approval.requested"
        ? "exec"
        : readString(payload, "kind");

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName,
    type: "APPROVAL_REQUEST",
    payload: {
      requestId,
      toolName,
      description,
      riskLevel: "high",
      kind,
      gatewayPayload: payload,
    },
  };
}

function mapErrorEvent(
  frame: GatewayEventFrame,
  agentName: string,
): AgentEvent {
  const payload = asRecord(frame.payload);
  const message =
    readString(payload, "message", "error", "reason") ??
    `Gateway error: ${frame.event}`;

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName,
    type: "ERROR",
    payload: {
      message,
      event: frame.event,
      details: payload,
    },
  };
}

export function mapGatewayFrameToAgentEvent(
  frame: GatewayEventFrame,
): AgentEvent | null {
  const payload = asRecord(frame.payload);
  const agentName = inferAgentName(payload);

  switch (frame.event) {
    case "agent": {
      const stream = readString(payload, "stream");
      if (stream === "tool" || stream === "tool-result") {
        return mapToolEvent(payload, agentName);
      }
      if (stream === "assistant" || stream === "lifecycle") {
        return mapAssistantEvent(payload, agentName);
      }
      if (stream === "error") {
        return mapErrorEvent(frame, agentName);
      }
      return mapAssistantEvent(payload, agentName);
    }

    case "session.tool":
      return mapToolEvent(payload, agentName);

    case "session.message": {
      const message = readString(payload, "text", "content", "message");
      if (!message) return null;
      return {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        agentName,
        type: "THOUGHT",
        payload: { message, sessionKey: payload.sessionKey },
      };
    }

    case "exec.approval.requested":
    case "plugin.approval.requested":
    case "session.approval":
      return mapApprovalEvent(frame, agentName);

    case "chat":
    case "sessions.changed":
    case "presence":
    case "tick":
    case "connect.challenge":
      return null;

    default:
      if (frame.event.endsWith(".error") || frame.event.includes("failed")) {
        return mapErrorEvent(frame, agentName);
      }
      return null;
  }
}
