import type { McpServerDefinition } from "@/types/cockpit";

export const MCP_SERVER_CATALOG: McpServerDefinition[] = [
  {
    id: "mcp-filesystem",
    name: "Filesystem MCP",
    description: "Read, write, and patch files inside the project workspace",
    transport: "stdio",
    packageName: "@modelcontextprotocol/server-filesystem",
    enabledByDefault: true,
    tools: [
      {
        id: "file_write",
        name: "file_write",
        description: "Create or overwrite files in the workspace",
        normalizedTool: "file_write",
        riskLevel: "low",
      },
      {
        id: "file_read",
        name: "file_read",
        description: "Read file contents from the workspace",
        normalizedTool: "file_read",
        riskLevel: "low",
      },
    ],
  },
  {
    id: "mcp-shell",
    name: "Shell MCP",
    description: "Execute terminal commands in the project environment",
    transport: "stdio",
    packageName: "@modelcontextprotocol/server-shell",
    enabledByDefault: true,
    tools: [
      {
        id: "terminal_exec",
        name: "terminal_exec",
        description: "Run shell commands (high risk — proxy-held)",
        normalizedTool: "terminal_exec",
        riskLevel: "high",
      },
    ],
  },
  {
    id: "mcp-fetch",
    name: "Fetch MCP",
    description: "HTTP fetch and web retrieval for external APIs and docs",
    transport: "stdio",
    packageName: "@modelcontextprotocol/server-fetch",
    tools: [
      {
        id: "network_request",
        name: "network_request",
        description: "Outbound HTTP requests (high risk — proxy-held)",
        normalizedTool: "network_request",
        riskLevel: "high",
      },
    ],
  },
  {
    id: "mcp-browser",
    name: "Browser MCP",
    description: "Headless browser automation for UI verification",
    transport: "stdio",
    packageName: "@anthropic/mcp-server-browser",
    tools: [
      {
        id: "browser",
        name: "browser",
        description: "Navigate and interact with web pages",
        normalizedTool: "browser",
        riskLevel: "medium",
      },
    ],
  },
  {
    id: "mcp-git",
    name: "Git MCP",
    description: "Git status, diff, and commit operations for the repo",
    transport: "stdio",
    packageName: "@modelcontextprotocol/server-git",
    tools: [
      {
        id: "git_status",
        name: "git_status",
        description: "Inspect repository status",
        normalizedTool: "git_status",
        riskLevel: "low",
      },
      {
        id: "git_commit",
        name: "git_commit",
        description: "Create commits in the workspace repo",
        normalizedTool: "git_commit",
        riskLevel: "medium",
      },
    ],
  },
];

export function getMcpServerById(serverId: string): McpServerDefinition | undefined {
  return MCP_SERVER_CATALOG.find((server) => server.id === serverId);
}
