import { readProjectMetadata } from "@/lib/projects";
import type { AgentEvent } from "@/types/cockpit";

import {
  classifyToolRisk,
  extractProjectSlugFromSessionKey,
  isHighRiskTool,
  isToolAllowed,
  isToolStartPhase,
  normalizeToolName,
} from "../hitl/guardrails";
import { resolveProjectSlug, resolveActiveRunId } from "../hitl/session-registry";
import type { GatewayEventFrame, GatewayRequestFrame } from "./types";

export const EXECUTION_AUTO_REJECT_MS = 300_000;

export type ExecutionGuardAction = "allow" | "suspend" | "deny";

export interface ToolExecutionContext {
  requestId: string;
  executionId?: string;
  toolName: string;
  normalizedTool: string;
  projectSlug: string;
  runId?: string;
  sessionKey?: string;
  toolInput?: unknown;
  direction: "inbound" | "outbound";
  method?: string;
}

export interface SuspendedExecution extends ToolExecutionContext {
  status: "SUSPENDED" | "RELEASED" | "REJECTED" | "TIMED_OUT";
  createdAt: string;
  releasedAt?: string;
  reason?: string;
}

interface PendingDeferred {
  context: SuspendedExecution;
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class GatewayExecutionProxy {
  private readonly suspended = new Map<string, PendingDeferred>();

  async evaluateInboundToolFrame(
    frame: GatewayEventFrame,
  ): Promise<{ action: ExecutionGuardAction; context?: ToolExecutionContext }> {
    if (frame.event !== "agent") {
      return { action: "allow" };
    }

    const payload = frame.payload ?? {};
    const stream = String(payload.stream ?? "");
    if (stream !== "tool" && stream !== "tool-result") {
      return { action: "allow" };
    }

    const data = asRecord(payload.data);
    const toolName = readString(data, "name", "toolName", "tool");
    const phase = readString(data, "phase", "status");

    if (!toolName || !isToolStartPhase(phase)) {
      return { action: "allow" };
    }

    const sessionKey = readString(payload, "sessionKey");
    const runId =
      readString(payload, "runId") ??
      resolveActiveRunId({ sessionKey }) ??
      undefined;
    const projectSlug = await this.resolveProjectSlug({ sessionKey, runId });

    if (!projectSlug) {
      return { action: "allow" };
    }

    const metadata = await readProjectMetadata(projectSlug).catch(() => null);
    if (!metadata) {
      return { action: "allow" };
    }

    const executionId =
      readString(data, "executionId", "toolCallId") ?? runId;

    const context = this.buildContext({
      toolName,
      projectSlug,
      runId,
      sessionKey,
      executionId,
      toolInput: data.input ?? data.args ?? data.arguments,
      direction: "inbound",
    });

    if (!isToolAllowed(toolName, metadata.agentConfig.allowedTools)) {
      return { action: "deny", context };
    }

    if (isHighRiskTool(toolName)) {
      return { action: "suspend", context };
    }

    return { action: "allow", context };
  }

  async evaluateOutboundRequest(
    frame: GatewayRequestFrame,
  ): Promise<{ action: ExecutionGuardAction; context?: ToolExecutionContext }> {
    if (frame.method !== "tools.invoke") {
      return { action: "allow" };
    }

    const params = frame.params ?? {};
    const toolName = readString(params, "tool", "toolName", "name");
    if (!toolName) {
      return { action: "allow" };
    }

    const sessionKey = readString(params, "sessionKey");
    const runId = readString(params, "runId");
    const projectSlug =
      (await this.resolveProjectSlug({ sessionKey, runId })) ??
      readString(params, "projectSlug");

    if (!projectSlug) {
      return { action: "allow" };
    }

    const metadata = await readProjectMetadata(projectSlug).catch(() => null);
    if (!metadata) {
      return { action: "allow" };
    }

    const context = this.buildContext({
      toolName,
      projectSlug,
      runId,
      sessionKey,
      toolInput: params.arguments ?? params.input,
      direction: "outbound",
      method: frame.method,
    });

    if (!isToolAllowed(toolName, metadata.agentConfig.allowedTools)) {
      return { action: "deny", context };
    }

    if (isHighRiskTool(toolName)) {
      return { action: "suspend", context };
    }

    return { action: "allow", context };
  }

  suspendExecution(context: ToolExecutionContext): Promise<void> {
    const existing = this.suspended.get(context.requestId);
    if (existing) {
      return new Promise((resolve, reject) => {
        const priorResolve = existing.resolve;
        const priorReject = existing.reject;
        existing.resolve = () => {
          priorResolve();
          resolve();
        };
        existing.reject = (error) => {
          priorReject(error);
          reject(error);
        };
      });
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.rejectExecution(
          context.requestId,
          new Error("Execution auto-rejected after 300 seconds"),
          "TIMED_OUT",
        );
      }, EXECUTION_AUTO_REJECT_MS);

      this.suspended.set(context.requestId, {
        context: {
          ...context,
          status: "SUSPENDED",
          createdAt: new Date().toISOString(),
        },
        resolve,
        reject,
        timer,
      });
    });
  }

  releaseExecution(requestId: string): SuspendedExecution | null {
    const pending = this.suspended.get(requestId);
    if (!pending || pending.context.status !== "SUSPENDED") {
      return null;
    }

    clearTimeout(pending.timer);
    pending.context.status = "RELEASED";
    pending.context.releasedAt = new Date().toISOString();
    pending.resolve();
    this.suspended.delete(requestId);
    return pending.context;
  }

  rejectExecution(
    requestId: string,
    error: Error,
    status: "REJECTED" | "TIMED_OUT" = "REJECTED",
  ): SuspendedExecution | null {
    const pending = this.suspended.get(requestId);
    if (!pending || pending.context.status !== "SUSPENDED") {
      return null;
    }

    clearTimeout(pending.timer);
    pending.context.status = status;
    pending.context.releasedAt = new Date().toISOString();
    pending.context.reason = error.message;
    pending.reject(error);
    this.suspended.delete(requestId);
    return pending.context;
  }

  getSuspendedExecution(requestId: string): SuspendedExecution | undefined {
    return this.suspended.get(requestId)?.context;
  }

  listSuspendedExecutions(): SuspendedExecution[] {
    return [...this.suspended.values()].map((entry) => entry.context);
  }

  private buildContext(input: {
    toolName: string;
    projectSlug: string;
    runId?: string;
    sessionKey?: string;
    executionId?: string;
    toolInput?: unknown;
    direction: "inbound" | "outbound";
    method?: string;
  }): ToolExecutionContext {
    return {
      requestId: crypto.randomUUID(),
      executionId: input.executionId ?? input.runId,
      toolName: input.toolName,
      normalizedTool: normalizeToolName(input.toolName),
      projectSlug: input.projectSlug,
      runId: input.runId,
      sessionKey: input.sessionKey,
      toolInput: input.toolInput,
      direction: input.direction,
      method: input.method,
    };
  }

  private async resolveProjectSlug(input: {
    sessionKey?: string;
    runId?: string;
  }): Promise<string | undefined> {
    return (
      resolveProjectSlug(input) ??
      extractProjectSlugFromSessionKey(input.sessionKey)
    );
  }
}

declare global {
  var __cockpitGatewayExecutionProxy: GatewayExecutionProxy | undefined;
}

export function getGatewayExecutionProxy(): GatewayExecutionProxy {
  if (!globalThis.__cockpitGatewayExecutionProxy) {
    globalThis.__cockpitGatewayExecutionProxy = new GatewayExecutionProxy();
  }
  return globalThis.__cockpitGatewayExecutionProxy;
}

export function createProxyDeniedEvent(context: ToolExecutionContext): AgentEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: "Gateway Proxy",
    type: "UNAUTHORIZED_TOOL",
    payload: {
      code: "UNAUTHORIZED_TOOL",
      requestId: context.requestId,
      tool: context.toolName,
      normalizedTool: context.normalizedTool,
      projectSlug: context.projectSlug,
      message: `Proxy blocked unauthorized tool "${context.toolName}"`,
      runId: context.runId,
      direction: context.direction,
    },
  };
}

export function createProxyRejectedEvent(
  context: SuspendedExecution,
  code: string,
): AgentEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: "Gateway Proxy",
    type: "ERROR",
    payload: {
      code,
      requestId: context.requestId,
      tool: context.toolName,
      projectSlug: context.projectSlug,
      message: context.reason ?? `Tool execution ${code.toLowerCase()}`,
      runId: context.runId,
    },
  };
}

export function summarizeRisk(toolName: string): string {
  return classifyToolRisk(toolName);
}

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
