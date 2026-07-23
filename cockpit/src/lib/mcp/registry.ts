import { normalizeToolName } from "@/lib/hitl/guardrails";
import type { ProjectMetadata, McpServerDefinition } from "@/types/cockpit";

import { getMcpServerById, MCP_SERVER_CATALOG } from "./catalog";

export function getDefaultEnabledMcpServers(): string[] {
  return MCP_SERVER_CATALOG.filter((server) => server.enabledByDefault).map(
    (server) => server.id,
  );
}

export function normalizeMcpConfig(
  raw: unknown,
  fallbackEnabled = getDefaultEnabledMcpServers(),
): ProjectMetadata["mcpConfig"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { enabledServers: fallbackEnabled };
  }

  const record = raw as Record<string, unknown>;
  const enabledServers = Array.isArray(record.enabledServers)
    ? record.enabledServers.filter(
        (serverId): serverId is string =>
          typeof serverId === "string" && Boolean(getMcpServerById(serverId)),
      )
    : fallbackEnabled;

  return {
    enabledServers:
      enabledServers.length > 0 ? [...new Set(enabledServers)] : fallbackEnabled,
  };
}

export function listEnabledMcpServers(
  mcpConfig: ProjectMetadata["mcpConfig"],
): McpServerDefinition[] {
  const enabled = new Set(mcpConfig?.enabledServers ?? getDefaultEnabledMcpServers());
  return MCP_SERVER_CATALOG.filter((server) => enabled.has(server.id));
}

export function resolveEffectiveAllowedTools(metadata: ProjectMetadata): string[] {
  const allowed = new Set(
    metadata.agentConfig.allowedTools.map((tool) => normalizeToolName(tool)),
  );

  for (const server of listEnabledMcpServers(metadata.mcpConfig)) {
    for (const tool of server.tools) {
      allowed.add(normalizeToolName(tool.normalizedTool));
    }
  }

  return [...allowed];
}

export function summarizeMcpRegistry(metadata: ProjectMetadata): {
  enabledServers: McpServerDefinition[];
  effectiveTools: string[];
} {
  const enabledServers = listEnabledMcpServers(metadata.mcpConfig);
  return {
    enabledServers,
    effectiveTools: resolveEffectiveAllowedTools(metadata),
  };
}

export function toggleMcpServer(
  current: ProjectMetadata["mcpConfig"],
  serverId: string,
  enabled: boolean,
): ProjectMetadata["mcpConfig"] {
  const base = new Set(current?.enabledServers ?? getDefaultEnabledMcpServers());

  if (enabled) {
    base.add(serverId);
  } else {
    base.delete(serverId);
  }

  return { enabledServers: [...base] };
}
