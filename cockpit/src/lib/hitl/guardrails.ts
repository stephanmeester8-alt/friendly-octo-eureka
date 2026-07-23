import type { ToolRiskLevel } from "@/types/cockpit";

export const HIGH_RISK_TOOLS = new Set([
  "terminal_exec",
  "file_delete",
  "network_request",
]);

const TOOL_ALIASES: Record<string, string> = {
  shell_exec: "terminal_exec",
  exec: "terminal_exec",
  bash: "terminal_exec",
  run_terminal: "terminal_exec",
  system_run: "terminal_exec",
  delete_file: "file_delete",
  remove_file: "file_delete",
  file_remove: "file_delete",
  fetch: "network_request",
  http_request: "network_request",
  web_fetch: "network_request",
  browser_navigate: "network_request",
  write_file: "file_write",
  save_file: "file_write",
  patch_file: "file_write",
};

export function normalizeToolName(toolName: string): string {
  const normalized = toolName.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return TOOL_ALIASES[normalized] ?? normalized;
}

export function isHighRiskTool(toolName: string): boolean {
  return HIGH_RISK_TOOLS.has(normalizeToolName(toolName));
}

export function classifyToolRisk(toolName: string): ToolRiskLevel {
  const normalized = normalizeToolName(toolName);
  if (HIGH_RISK_TOOLS.has(normalized)) {
    return "high";
  }
  if (/delete|remove|exec|terminal|network|fetch|http|shell/i.test(normalized)) {
    return "medium";
  }
  return "low";
}

export function isToolAllowed(
  toolName: string,
  allowedTools: string[],
): boolean {
  const normalized = normalizeToolName(toolName);
  const allowed = new Set(allowedTools.map((tool) => normalizeToolName(tool)));

  if (allowed.has(normalized)) {
    return true;
  }

  // file_write family matches file_write allowlist entry
  if (
    normalized.includes("write") ||
    normalized.includes("patch") ||
    normalized.includes("edit")
  ) {
    return allowed.has("file_write");
  }

  return false;
}

export function extractProjectSlugFromSessionKey(
  sessionKey: string | undefined,
): string | undefined {
  if (!sessionKey) return undefined;

  const cockpitMatch = sessionKey.match(/^cockpit:project:([^:]+)$/);
  if (cockpitMatch) {
    return cockpitMatch[1];
  }

  return undefined;
}

export function isToolStartPhase(phase: string | undefined): boolean {
  if (!phase) return true;
  const normalized = phase.toLowerCase();
  return (
    normalized === "start" ||
    normalized === "started" ||
    normalized === "call" ||
    normalized === "invoke" ||
    normalized === "pending"
  );
}
