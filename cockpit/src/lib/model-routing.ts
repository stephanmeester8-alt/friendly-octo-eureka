import { DEFAULT_PRIMARY_MODEL, TASK_TYPE_DEFINITIONS } from "@/lib/model-catalog";
import type { AgentTaskType, ProjectAgentConfig } from "@/types/cockpit";

export interface ResolvedModelRoute {
  model: string;
  taskType: AgentTaskType;
  source: "task_override" | "primary" | "catalog_default";
}

const TASK_TYPE_SET = new Set<AgentTaskType>(
  TASK_TYPE_DEFINITIONS.map((task) => task.id),
);

export function normalizeTaskType(value: unknown): AgentTaskType {
  if (typeof value === "string" && TASK_TYPE_SET.has(value as AgentTaskType)) {
    return value as AgentTaskType;
  }
  return "default";
}

export function resolveModelForTask(
  agentConfig: ProjectAgentConfig,
  taskTypeInput?: AgentTaskType,
): ResolvedModelRoute {
  const taskType = normalizeTaskType(taskTypeInput);
  const primaryModel = agentConfig.primaryModel?.trim() || DEFAULT_PRIMARY_MODEL;

  if (taskType === "default") {
    return { model: primaryModel, taskType, source: "primary" };
  }

  const override = agentConfig.modelByTaskType?.[taskType]?.trim();
  if (override) {
    return { model: override, taskType, source: "task_override" };
  }

  const catalogDefault = TASK_TYPE_DEFINITIONS.find(
    (task) => task.id === taskType,
  )?.defaultModel;

  return {
    model: catalogDefault ?? primaryModel,
    taskType,
    source: catalogDefault ? "catalog_default" : "primary",
  };
}

export function inferTaskTypeFromPrompt(prompt: string): AgentTaskType {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return "default";

  if (
    /\b(review|audit|security|vulnerabilit|lint|critique)\b/.test(normalized)
  ) {
    return "review";
  }

  if (
    /\b(readme|documentation|docs?|specification|spec|write.*doc)\b/.test(
      normalized,
    )
  ) {
    return "docs";
  }

  if (
    /\b(architect|design|scaffold|structure|system design|blueprint)\b/.test(
      normalized,
    )
  ) {
    return "architecture";
  }

  if (
    /\b(implement|refactor|fix|bug|code|function|class|api|endpoint)\b/.test(
      normalized,
    )
  ) {
    return "code";
  }

  return "default";
}

export function resolveModelRoute(input: {
  agentConfig: ProjectAgentConfig;
  taskType?: AgentTaskType;
  prompt?: string;
  autoDetectTaskType?: boolean;
}): ResolvedModelRoute {
  const explicitTaskType = input.taskType
    ? normalizeTaskType(input.taskType)
    : undefined;

  if (explicitTaskType && explicitTaskType !== "default") {
    return resolveModelForTask(input.agentConfig, explicitTaskType);
  }

  if (input.autoDetectTaskType && input.prompt?.trim()) {
    const inferred = inferTaskTypeFromPrompt(input.prompt);
    if (inferred !== "default") {
      return resolveModelForTask(input.agentConfig, inferred);
    }
  }

  return resolveModelForTask(input.agentConfig, explicitTaskType ?? "default");
}
