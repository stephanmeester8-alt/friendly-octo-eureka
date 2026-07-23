import assert from "node:assert/strict";

import { resolveModelForTask, resolveModelRoute } from "../src/lib/model-routing";
import type { ProjectAgentConfig } from "../src/types/cockpit";

const baseConfig: ProjectAgentConfig = {
  primaryModel: "google/gemini-3.1-pro-preview",
  allowedTools: ["file_write"],
};

assert.equal(
  resolveModelForTask(baseConfig, "default").model,
  "google/gemini-3.1-pro-preview",
);

assert.equal(
  resolveModelForTask(baseConfig, "code").model,
  "google/gemini-2.5-flash",
);

const overrideConfig: ProjectAgentConfig = {
  ...baseConfig,
  modelByTaskType: {
    code: "google/gemini-2.5-pro",
  },
};

assert.equal(
  resolveModelForTask(overrideConfig, "code").model,
  "google/gemini-2.5-pro",
);

assert.equal(
  resolveModelRoute({
    agentConfig: baseConfig,
    prompt: "Please review this module for security issues",
    autoDetectTaskType: true,
  }).taskType,
  "review",
);

assert.equal(
  resolveModelRoute({
    agentConfig: baseConfig,
    taskType: "docs",
  }).model,
  "google/gemini-2.5-flash",
);

console.log("[model-routing] PASS");
