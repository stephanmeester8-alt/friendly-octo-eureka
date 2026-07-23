import path from "node:path";

/**
 * Resolves the workspace root directory.
 * Defaults to `<repo>/workspace` but can be overridden via WORKSPACE_ROOT.
 */
export function getWorkspaceRoot(): string {
  const configured = process.env.WORKSPACE_ROOT?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), "..", "workspace");
}

export function getProjectsRoot(): string {
  return path.join(getWorkspaceRoot(), "projects");
}

export function getGatewayWebSocketUrl(): string {
  const base = GATEWAY_CONFIG.baseUrl.replace(/\/$/, "");
  if (base.startsWith("ws://") || base.startsWith("wss://")) {
    return base;
  }
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export const GATEWAY_CONFIG = {
  baseUrl: process.env.AGENT_GATEWAY_URL ?? "http://127.0.0.1:18789",
  timeoutMs: Number(process.env.AGENT_GATEWAY_TIMEOUT_MS ?? 30_000),
  clientId:
    process.env.AGENT_GATEWAY_CLIENT_ID?.trim() ||
    process.env.OPENCLAW_CLIENT_ID?.trim() ||
    "gateway-client",
  clientMode:
    process.env.AGENT_GATEWAY_CLIENT_MODE?.trim() ||
    process.env.OPENCLAW_CLIENT_MODE?.trim() ||
    "backend",
} as const;
