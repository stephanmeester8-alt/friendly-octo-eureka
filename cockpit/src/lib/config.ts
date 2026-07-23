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

export const GATEWAY_CONFIG = {
  baseUrl: process.env.AGENT_GATEWAY_URL ?? "http://127.0.0.1:18789",
  timeoutMs: Number(process.env.AGENT_GATEWAY_TIMEOUT_MS ?? 30_000),
} as const;
