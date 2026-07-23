/** Default max protocol for mock gateways and local tests. */
export const GATEWAY_PROTOCOL_VERSION = 5;

export type GatewayFrameType = "req" | "res" | "event";

export interface GatewayRequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface GatewayResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export interface GatewayEventFrame {
  type: "event";
  event: string;
  payload?: Record<string, unknown>;
  seq?: number;
  stateVersion?: number;
}

export type GatewayFrame =
  | GatewayRequestFrame
  | GatewayResponseFrame
  | GatewayEventFrame;

export interface GatewayAgentParams {
  message: string;
  idempotencyKey: string;
  sessionKey?: string;
  agentId?: string;
  model?: string;
  cwd?: string;
  extraSystemPrompt?: string;
  timeout?: number;
}

export interface GatewayAgentAck {
  runId: string;
  status: "accepted" | "ok" | "error";
  summary?: string;
}

export interface GatewayConnectChallenge {
  nonce: string;
  ts: number;
}
