import type { AgentTaskType } from "@/types/cockpit";

export interface ModelDefinition {
  id: string;
  label: string;
  description: string;
  tier: "flagship" | "balanced" | "fast";
}

export interface TaskTypeDefinition {
  id: AgentTaskType;
  label: string;
  description: string;
  defaultModel: string;
}

export const AVAILABLE_MODELS: ModelDefinition[] = [
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    description: "Best for architecture, planning, and complex reasoning",
    tier: "flagship",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Strong general-purpose model for mixed workloads",
    tier: "balanced",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast and cost-efficient for codegen and routine tasks",
    tier: "fast",
  },
];

export const TASK_TYPE_DEFINITIONS: TaskTypeDefinition[] = [
  {
    id: "default",
    label: "Auto (primary)",
    description: "Use the project primary model",
    defaultModel: "google/gemini-3.1-pro-preview",
  },
  {
    id: "architecture",
    label: "Architecture",
    description: "System design, scaffolding, and high-level planning",
    defaultModel: "google/gemini-3.1-pro-preview",
  },
  {
    id: "code",
    label: "Code",
    description: "Implementation, refactors, and bug fixes",
    defaultModel: "google/gemini-2.5-flash",
  },
  {
    id: "review",
    label: "Review",
    description: "Code review, security checks, and quality gates",
    defaultModel: "google/gemini-2.5-pro",
  },
  {
    id: "docs",
    label: "Documentation",
    description: "Specs, README files, and technical writing",
    defaultModel: "google/gemini-2.5-flash",
  },
];

export const DEFAULT_PRIMARY_MODEL = AVAILABLE_MODELS[0].id;

export function isKnownModel(modelId: string): boolean {
  return AVAILABLE_MODELS.some((model) => model.id === modelId);
}

export function getModelLabel(modelId: string): string {
  return AVAILABLE_MODELS.find((model) => model.id === modelId)?.label ?? modelId;
}

export function getTaskTypeLabel(taskType: AgentTaskType): string {
  return (
    TASK_TYPE_DEFINITIONS.find((task) => task.id === taskType)?.label ?? taskType
  );
}
