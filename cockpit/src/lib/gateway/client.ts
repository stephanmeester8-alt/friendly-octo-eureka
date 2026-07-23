import path from "node:path";
import { WebSocket } from "ws";

import { GATEWAY_CONFIG, getProjectsRoot } from "@/lib/config";
import { resolveModelRoute } from "@/lib/model-routing";
import { readProjectMetadata } from "@/lib/projects";
import type { AgentEvent, AgentTaskType } from "@/types/cockpit";

import { getGatewayEventBus } from "./event-bus";
import { mapGatewayFrameToAgentEvent } from "./event-mapper";
import {
  createProxyDeniedEvent,
  getGatewayExecutionProxy,
} from "./proxy";
import { registerProxySuspension } from "./proxy-bridge";
import {
  interceptAgentEvent,
  publishExecutionStatus,
  publishInterceptedEvents,
} from "../hitl/interceptor";
import { markToolExecutionApproved } from "../hitl/approval-queue";
import { buildToolExecutionKey } from "../hitl/approval-queue";
import { publishProxyDenied } from "../hitl/approval-service";
import { registerActiveSession, setExecutionStatus } from "../hitl/session-registry";
import {
  type GatewayAgentAck,
  type GatewayAgentParams,
  type GatewayConnectChallenge,
  type GatewayEventFrame,
  type GatewayFrame,
  type GatewayRequestFrame,
  type GatewayResponseFrame,
} from "./types";

const CONNECT_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = GATEWAY_CONFIG.timeoutMs;

function toWebSocketUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function getGatewayToken(): string | undefined {
  return (
    process.env.AGENT_GATEWAY_TOKEN?.trim() ||
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
    undefined
  );
}

function publishSystemEvent(
  message: string,
  type: AgentEvent["type"] = "THOUGHT",
): void {
  getGatewayEventBus().publish({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentName: "System",
    type,
    payload: { message },
  });
}

export function buildProjectSessionKey(projectSlug: string): string {
  return `cockpit:project:${projectSlug}`;
}

export function resolveProjectCwd(projectSlug: string): string {
  return path.join(getProjectsRoot(), projectSlug);
}

class OpenClawGatewayClient {
  private socket: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private challenge: GatewayConnectChallenge | null = null;
  private connected = false;
  private readonly pending = new Map<
    string,
    {
      resolve: (value: GatewayResponseFrame) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();

  async ensureConnected(): Promise<void> {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.openConnection().finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  private async openConnection(): Promise<void> {
    const wsUrl = toWebSocketUrl(GATEWAY_CONFIG.baseUrl);

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;
      this.challenge = null;
      this.connected = false;

      const connectTimer = setTimeout(() => {
        socket.close();
        reject(new Error("Gateway connect handshake timed out"));
      }, CONNECT_TIMEOUT_MS);

      socket.on("open", () => {
        publishSystemEvent(`Connecting to OpenClaw gateway at ${wsUrl}`);
      });

      socket.on("message", (raw) => {
        try {
          const frame = JSON.parse(String(raw)) as GatewayFrame;
          this.handleFrame(frame, {
            onReady: () => {
              clearTimeout(connectTimer);
              this.connected = true;
              publishSystemEvent("OpenClaw gateway connected");
              resolve();
            },
            onConnectFailed: (error) => {
              clearTimeout(connectTimer);
              reject(error);
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid gateway frame";
          publishSystemEvent(message, "ERROR");
        }
      });

      socket.on("close", () => {
        this.connected = false;
        this.challenge = null;
        publishSystemEvent("OpenClaw gateway disconnected", "ERROR");
        for (const [id, pending] of this.pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error("Gateway connection closed"));
          this.pending.delete(id);
        }
      });

      socket.on("error", (error) => {
        clearTimeout(connectTimer);
        const message =
          error instanceof Error ? error.message : "Gateway socket error";
        publishSystemEvent(message, "ERROR");
        reject(new Error(message));
      });
    });
  }

  private handleFrame(
    frame: GatewayFrame,
    hooks: {
      onReady: () => void;
      onConnectFailed: (error: Error) => void;
    },
  ): void {
    if (frame.type === "event") {
      this.handleEventFrame(frame);
      return;
    }

    if (frame.type !== "res") {
      return;
    }

    const pending = this.pending.get(frame.id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(frame.id);
      if (frame.ok) {
        if (frame.payload?.type === "hello-ok") {
          this.connected = true;
          hooks.onReady();
        }
        pending.resolve(frame);
      } else {
        const error = new Error(frame.error?.message ?? "Gateway request failed");
        if (!this.connected) {
          hooks.onConnectFailed(error);
        }
        pending.reject(error);
      }
      return;
    }

    if (frame.ok && frame.payload?.type === "hello-ok") {
      this.connected = true;
      hooks.onReady();
    } else if (!frame.ok) {
      hooks.onConnectFailed(
        new Error(frame.error?.message ?? "Gateway handshake failed"),
      );
    }
  }

  private handleEventFrame(frame: GatewayEventFrame): void {
    if (frame.event === "connect.challenge") {
      const payload = frame.payload ?? {};
      this.challenge = {
        nonce: String(payload.nonce ?? ""),
        ts: Number(payload.ts ?? Date.now()),
      };
      void this.sendConnectRequest().catch((error) => {
        const message =
          error instanceof Error ? error.message : "Gateway connect failed";
        publishSystemEvent(message, "ERROR");
      });
      return;
    }

    void this.processGuardedEventFrame(frame);
  }

  private async processGuardedEventFrame(
    frame: GatewayEventFrame,
  ): Promise<void> {
    const proxy = getGatewayExecutionProxy();
    const evaluation = await proxy.evaluateInboundToolFrame(frame);

    if (evaluation.action === "deny" && evaluation.context) {
      publishProxyDenied(evaluation.context);
      await this.abortToolExecution({
        requestId: evaluation.context.requestId,
        runId: evaluation.context.runId,
        toolName: evaluation.context.normalizedTool,
        sessionKey: evaluation.context.sessionKey,
        reason: "unauthorized_tool",
      });
      return;
    }

    if (evaluation.action === "suspend" && evaluation.context) {
      registerProxySuspension(evaluation.context);
      try {
        await proxy.suspendExecution(evaluation.context);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Execution rejected";
        publishInterceptedEvents([
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            agentName: "Gateway Proxy",
            type: "ERROR",
            payload: {
              code: "EXECUTION_REJECTED",
              requestId: evaluation.context.requestId,
              message,
            },
          },
        ]);
        publishExecutionStatus("FAILED");
        return;
      }

      markToolExecutionApproved(
        buildToolExecutionKey({
          runId: evaluation.context.runId,
          toolName: evaluation.context.normalizedTool,
          sessionKey: evaluation.context.sessionKey,
        }),
      );
    }

    const mapped = mapGatewayFrameToAgentEvent(frame);
    if (mapped) {
      const events = await interceptAgentEvent(mapped);
      publishInterceptedEvents(events);
    }
  }

  private async sendConnectRequest(): Promise<void> {
    const token = getGatewayToken();
    const params: Record<string, unknown> = {
      minProtocol: GATEWAY_CONFIG.minProtocol,
      maxProtocol: GATEWAY_CONFIG.maxProtocol,
      client: {
        id: GATEWAY_CONFIG.clientId,
        version: "0.1.0",
        platform: process.platform,
        mode: GATEWAY_CONFIG.clientMode,
      },
      role: "operator",
      scopes: [
        "operator.read",
        "operator.write",
        "operator.approvals",
        "operator.admin",
      ],
      caps: [],
      commands: [],
      permissions: {},
      locale: "en-US",
      userAgent: "local-workspace-cockpit/0.1.0",
    };

    if (token) {
      params.auth = { token };
    }

    await this.request("connect", params, { skipEnsure: true });
  }

  private request(
    method: string,
    params?: Record<string, unknown>,
    options?: { skipEnsure?: boolean; timeoutMs?: number },
  ): Promise<GatewayResponseFrame> {
    const send = async (): Promise<GatewayResponseFrame> => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        throw new Error("Gateway socket is not open");
      }

      const id = crypto.randomUUID();
      const frame: GatewayRequestFrame = { type: "req", id, method, params };
      const proxy = getGatewayExecutionProxy();
      const evaluation = await proxy.evaluateOutboundRequest(frame);

      if (evaluation.action === "deny" && evaluation.context) {
        publishProxyDenied(evaluation.context);
        throw new Error(`Proxy blocked unauthorized tool: ${evaluation.context.toolName}`);
      }

      if (evaluation.action === "suspend" && evaluation.context) {
        registerProxySuspension(evaluation.context);
        await proxy.suspendExecution(evaluation.context);
        markToolExecutionApproved(
          buildToolExecutionKey({
            runId: evaluation.context.runId,
            toolName: evaluation.context.normalizedTool,
            sessionKey: evaluation.context.sessionKey,
          }),
        );
      }

      return new Promise<GatewayResponseFrame>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`Gateway request timed out: ${method}`));
        }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS);

        this.pending.set(id, { resolve, reject, timer });
        this.socket?.send(JSON.stringify(frame));
      });
    };

    if (options?.skipEnsure) {
      return send();
    }

    return this.ensureConnected().then(send);
  }

  async runAgent(params: GatewayAgentParams): Promise<GatewayAgentAck> {
    await this.ensureConnected();

    const response = await this.request(
      "agent",
      params as unknown as Record<string, unknown>,
      {
        timeoutMs: params.timeout ?? REQUEST_TIMEOUT_MS,
      },
    );

    const payload = response.payload ?? {};
    const runId = String(payload.runId ?? crypto.randomUUID());
    const status = String(payload.status ?? "accepted") as GatewayAgentAck["status"];

    getGatewayEventBus().publish({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agentName: params.agentId ?? "OpenClaw",
      type: "THOUGHT",
      payload: {
        message: params.model
          ? `Agent run accepted (model: ${params.model})`
          : "Agent run accepted",
        runId,
        sessionKey: params.sessionKey,
        model: params.model,
      },
    });

    if (params.sessionKey) {
      const projectSlug = params.sessionKey.replace(/^cockpit:project:/, "");
      registerActiveSession({
        sessionKey: params.sessionKey,
        projectSlug,
        runId,
      });
      setExecutionStatus("RUNNING");
      publishInterceptedEvents([
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          agentName: "System",
          type: "EXECUTION_STATUS",
          payload: { status: "RUNNING" },
        },
      ]);
    }

    return { runId, status };
  }

  async resolveApproval(input: {
    approvalId: string;
    decision: "approve" | "deny";
    kind?: string;
  }): Promise<void> {
    await this.ensureConnected();

    await this.request("approval.resolve", {
      id: input.approvalId,
      kind: input.kind ?? "exec",
      decision: input.decision,
    });
  }

  async releaseToolExecution(input: {
    requestId: string;
    executionId?: string;
    runId?: string;
    toolName: string;
    sessionKey?: string;
  }): Promise<void> {
    await this.ensureConnected();
    await this.request(
      "tool.execution.release",
      {
        ...input,
        executionId: input.executionId ?? input.runId,
      },
      { skipEnsure: false, timeoutMs: REQUEST_TIMEOUT_MS },
    );
  }

  async abortToolExecution(input: {
    requestId: string;
    executionId?: string;
    runId?: string;
    toolName: string;
    sessionKey?: string;
    reason: string;
  }): Promise<void> {
    await this.ensureConnected();
    await this.request(
      "tool.execution.abort",
      {
        ...input,
        executionId: input.executionId ?? input.runId,
      },
      { skipEnsure: false, timeoutMs: REQUEST_TIMEOUT_MS },
    );
  }
}

declare global {
  var __cockpitGatewayClient: OpenClawGatewayClient | undefined;
}

export function getGatewayClient(): OpenClawGatewayClient {
  if (!globalThis.__cockpitGatewayClient) {
    globalThis.__cockpitGatewayClient = new OpenClawGatewayClient();
  }
  return globalThis.__cockpitGatewayClient;
}

export async function triggerProjectAgentRun(input: {
  projectSlug: string;
  prompt: string;
  agentId?: string;
  taskType?: AgentTaskType;
  autoDetectTaskType?: boolean;
}): Promise<GatewayAgentAck & { model: string; taskType: AgentTaskType }> {
  const client = getGatewayClient();
  const sessionKey = buildProjectSessionKey(input.projectSlug);
  const cwd = resolveProjectCwd(input.projectSlug);
  const workspaceRoot = path.dirname(getProjectsRoot());
  const metadata = await readProjectMetadata(input.projectSlug);
  const route = resolveModelRoute({
    agentConfig: metadata.agentConfig,
    taskType: input.taskType,
    prompt: input.prompt,
    autoDetectTaskType: input.autoDetectTaskType ?? true,
  });

  const result = await client.runAgent({
    message: input.prompt,
    idempotencyKey: crypto.randomUUID(),
    sessionKey,
    agentId: input.agentId,
    model: route.model,
    cwd,
    extraSystemPrompt: [
      "You are operating inside the Local Workspace Cockpit.",
      `Project slug: ${input.projectSlug}`,
      `Project directory: ${cwd}`,
      `Workspace root: ${workspaceRoot}`,
      `Routed model: ${route.model}`,
      `Task type: ${route.taskType}`,
      "Persist generated artifacts under the project directory (src/, docs/, logs/).",
    ].join("\n"),
    timeout: REQUEST_TIMEOUT_MS,
  });

  return { ...result, model: route.model, taskType: route.taskType };
}
