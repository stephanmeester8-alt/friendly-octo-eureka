import fs from "node:fs/promises";
import path from "node:path";

import type {
  CreateProjectRequest,
  ProjectAgentConfig,
  ProjectLifecycleStatus,
  ProjectMetadata,
  ProjectSummary,
  ProjectTemplate,
  UpdateProjectRequest,
} from "@/types/cockpit";

import { getProjectsRoot } from "./config";
import { resolveProjectPath } from "./filesystem";

const METADATA_FILENAME = "metadata.json";

const DEFAULT_AGENT_CONFIG: ProjectAgentConfig = {
  primaryModel: "google/gemini-3.1-pro-preview",
  allowedTools: ["file_write", "terminal_exec", "browser"],
};

const LEGACY_EXECUTION_STATUSES = new Set([
  "IDLE",
  "RUNNING",
  "WAITING_APPROVAL",
  "COMPLETED",
  "FAILED",
]);

export class ProjectAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Project already exists: ${slug}`);
    this.name = "ProjectAlreadyExistsError";
  }
}

export class ProjectNotFoundError extends Error {
  constructor(slug: string) {
    super(`Project not found: ${slug}`);
    this.name = "ProjectNotFoundError";
  }
}

export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeLifecycleStatus(value: unknown): ProjectLifecycleStatus {
  if (value === "ACTIVE" || value === "ARCHIVED" || value === "COMPLETED") {
    return value;
  }

  if (typeof value === "string" && LEGACY_EXECUTION_STATUSES.has(value)) {
    if (value === "COMPLETED") return "COMPLETED";
    if (value === "FAILED") return "ARCHIVED";
    return "ACTIVE";
  }

  return "ACTIVE";
}

function normalizeAgentConfig(raw: unknown): ProjectAgentConfig {
  const record = asRecord(raw);
  const primaryModel =
    readString(record, "primaryModel") ??
    readString(record, "model") ??
    DEFAULT_AGENT_CONFIG.primaryModel;

  const allowedTools = Array.isArray(record.allowedTools)
    ? record.allowedTools.filter((tool): tool is string => typeof tool === "string")
    : DEFAULT_AGENT_CONFIG.allowedTools;

  return {
    primaryModel,
    allowedTools: allowedTools.length > 0 ? allowedTools : DEFAULT_AGENT_CONFIG.allowedTools,
  };
}

export function normalizeProjectMetadata(
  slug: string,
  raw: unknown,
): ProjectMetadata {
  const record = asRecord(raw);
  const now = new Date().toISOString();

  const id = readString(record, "id") ?? readString(record, "slug") ?? slug;
  const name =
    readString(record, "name") ??
    readString(record, "displayName") ??
    slug;

  return {
    id,
    name,
    description: readString(record, "description") ?? "",
    createdAt: readString(record, "createdAt") ?? now,
    updatedAt: readString(record, "updatedAt") ?? now,
    status: normalizeLifecycleStatus(record.status),
    agentConfig: normalizeAgentConfig(record.agentConfig ?? record),
  };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function getTemplateFiles(
  template: ProjectTemplate,
  input: { name: string; description: string },
): Array<{ relativePath: string; content: string }> {
  const readme = `# ${input.name}\n\n${input.description}\n`;

  switch (template) {
    case "python-service":
      return [
        { relativePath: "docs/README.md", content: readme },
        {
          relativePath: "src/main.py",
          content: `"""${input.name} service entry point."""\n\n\ndef main() -> None:\n    print("Hello from ${input.name}")\n\n\nif __name__ == "__main__":\n    main()\n`,
        },
        {
          relativePath: "requirements.txt",
          content: "# Add runtime dependencies here\n",
        },
      ];

    case "nextjs-app":
      return [
        { relativePath: "docs/README.md", content: readme },
        {
          relativePath: "package.json",
          content: JSON.stringify(
            {
              name: slugifyProjectName(input.name),
              private: true,
              version: "0.1.0",
              scripts: { dev: "next dev", build: "next build", start: "next start" },
            },
            null,
            2,
          ),
        },
        {
          relativePath: "src/index.ts",
          content: `export function greet(): string {\n  return "Hello from ${input.name}";\n}\n`,
        },
      ];

    case "default":
    default:
      return [
        { relativePath: "docs/README.md", content: readme },
        {
          relativePath: "src/.gitkeep",
          content: "",
        },
      ];
  }
}

export async function readProjectMetadata(slug: string): Promise<ProjectMetadata> {
  const projectDir = resolveProjectPath(slug);
  const metadataPath = path.join(projectDir, METADATA_FILENAME);

  if (!(await pathExists(metadataPath))) {
    throw new ProjectNotFoundError(slug);
  }

  const raw = await fs.readFile(metadataPath, "utf-8");
  return normalizeProjectMetadata(slug, JSON.parse(raw));
}

export async function writeProjectMetadata(
  slug: string,
  metadata: ProjectMetadata,
): Promise<ProjectMetadata> {
  const projectDir = resolveProjectPath(slug);
  const metadataPath = path.join(projectDir, METADATA_FILENAME);
  const normalized = normalizeProjectMetadata(slug, metadata);

  await fs.writeFile(metadataPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}

export async function listProjectMetadata(): Promise<ProjectSummary[]> {
  const projectsRoot = getProjectsRoot();
  await fs.mkdir(projectsRoot, { recursive: true });

  const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
  const summaries: ProjectSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const metadataPath = path.join(projectsRoot, entry.name, METADATA_FILENAME);
    if (!(await pathExists(metadataPath))) continue;

    const raw = await fs.readFile(metadataPath, "utf-8");
    const metadata = normalizeProjectMetadata(entry.name, JSON.parse(raw));

    summaries.push({
      id: metadata.id,
      slug: entry.name,
      name: metadata.name,
      description: metadata.description,
      status: metadata.status,
      updatedAt: metadata.updatedAt,
    });
  }

  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createProject(
  input: CreateProjectRequest,
): Promise<{ slug: string; project: ProjectMetadata }> {
  const slug = slugifyProjectName(input.name);
  if (!slug) {
    throw new Error("Project name must contain at least one alphanumeric character");
  }

  const projectDir = resolveProjectPath(slug);
  if (await pathExists(projectDir)) {
    throw new ProjectAlreadyExistsError(slug);
  }

  const now = new Date().toISOString();
  const metadata: ProjectMetadata = {
    id: slug,
    name: input.name.trim(),
    description: input.description.trim(),
    createdAt: now,
    updatedAt: now,
    status: "ACTIVE",
    agentConfig: { ...DEFAULT_AGENT_CONFIG },
  };

  await fs.mkdir(path.join(projectDir, "src"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "docs"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "logs"), { recursive: true });

  const template = input.template ?? "default";
  for (const file of getTemplateFiles(template, {
    name: metadata.name,
    description: metadata.description,
  })) {
    const absolutePath = path.join(projectDir, file.relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.content, "utf-8");
  }

  await writeProjectMetadata(slug, metadata);

  return { slug, project: metadata };
}

export async function updateProject(
  slug: string,
  patch: UpdateProjectRequest,
): Promise<ProjectMetadata> {
  const current = await readProjectMetadata(slug);
  const updated: ProjectMetadata = {
    ...current,
    name: patch.name?.trim() || current.name,
    description:
      patch.description !== undefined ? patch.description.trim() : current.description,
    status: patch.status ?? current.status,
    agentConfig: {
      primaryModel:
        patch.agentConfig?.primaryModel ?? current.agentConfig.primaryModel,
      allowedTools:
        patch.agentConfig?.allowedTools ?? current.agentConfig.allowedTools,
    },
    updatedAt: new Date().toISOString(),
  };

  return writeProjectMetadata(slug, updated);
}

export async function touchProjectActivity(slug: string): Promise<void> {
  const metadata = await readProjectMetadata(slug);
  await writeProjectMetadata(slug, {
    ...metadata,
    updatedAt: new Date().toISOString(),
  });
}
