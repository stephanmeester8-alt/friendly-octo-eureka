import assert from "node:assert/strict";

import { resolveEffectiveAllowedTools } from "../src/lib/mcp/registry";
import type { ProjectMetadata } from "../src/types/cockpit";

const metadata: ProjectMetadata = {
  id: "demo",
  name: "Demo",
  description: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  status: "ACTIVE",
  agentConfig: {
    primaryModel: "google/gemini-3.1-pro-preview",
    allowedTools: ["file_write"],
  },
  mcpConfig: {
    enabledServers: ["mcp-shell", "mcp-git"],
  },
};

const tools = resolveEffectiveAllowedTools(metadata);

assert.ok(tools.includes("file_write"));
assert.ok(tools.includes("terminal_exec"));
assert.ok(tools.includes("git_status"));
assert.ok(!tools.includes("network_request"));

console.log("[mcp-registry] PASS");
