import fs from "node:fs/promises";
import path from "node:path";

import type {
  FileReadResponse,
  FileTreeResponse,
  FileWriteResponse,
  ProjectFile,
  ProjectMetadata,
  ProjectSummary,
} from "@/types/cockpit";

import { getProjectsRoot, getWorkspaceRoot } from "./config";

const METADATA_FILENAME = "metadata.json";
const IGNORED_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "__pycache__",
  ".DS_Store",
]);

export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathTraversalError";
  }
}

/**
 * Resolves a relative path under the projects root and rejects traversal attempts.
 */
export function resolveProjectPath(relativePath: string): string {
  const projectsRoot = getProjectsRoot();
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const resolved = path.resolve(projectsRoot, normalized);

  if (
    resolved !== projectsRoot &&
    !resolved.startsWith(projectsRoot + path.sep)
  ) {
    throw new PathTraversalError(
      `Path escapes workspace boundary: ${relativePath}`,
    );
  }

  return resolved;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readMetadata(
  projectDir: string,
): Promise<ProjectMetadata | null> {
  const metadataPath = path.join(projectDir, METADATA_FILENAME);
  if (!(await pathExists(metadataPath))) {
    return null;
  }

  const raw = await fs.readFile(metadataPath, "utf-8");
  return JSON.parse(raw) as ProjectMetadata;
}

async function buildTree(
  absolutePath: string,
  relativePath: string,
): Promise<ProjectFile> {
  const stat = await fs.stat(absolutePath);
  const name = path.basename(absolutePath);

  if (!stat.isDirectory()) {
    return {
      name,
      path: relativePath,
      kind: "file",
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const children: ProjectFile[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED_NAMES.has(entry.name)) continue;

    const childAbs = path.join(absolutePath, entry.name);
    const childRel = relativePath
      ? path.posix.join(relativePath.replace(/\\/g, "/"), entry.name)
      : entry.name;

    children.push(await buildTree(childAbs, childRel));
  }

  return {
    name,
    path: relativePath,
    kind: "directory",
    modifiedAt: stat.mtime.toISOString(),
    children,
  };
}

export async function ensureProjectsRoot(): Promise<void> {
  await fs.mkdir(getProjectsRoot(), { recursive: true });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await ensureProjectsRoot();
  const projectsRoot = getProjectsRoot();
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
  const summaries: ProjectSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(projectsRoot, entry.name);
    const metadata = await readMetadata(projectDir);

    summaries.push({
      slug: entry.name,
      displayName: metadata?.displayName ?? entry.name,
      status: metadata?.status ?? "IDLE",
      updatedAt:
        metadata?.updatedAt ??
        (await fs.stat(projectDir)).mtime.toISOString(),
    });
  }

  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getFileTree(
  projectSlug?: string,
): Promise<FileTreeResponse> {
  await ensureProjectsRoot();
  const projectsRoot = getProjectsRoot();

  if (projectSlug) {
    const projectPath = resolveProjectPath(projectSlug);
    const tree = await buildTree(projectPath, projectSlug);
    return { root: projectsRoot, projects: [tree] };
  }

  const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
  const projects: ProjectFile[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    projects.push(
      await buildTree(path.join(projectsRoot, entry.name), entry.name),
    );
  }

  return { root: projectsRoot, projects };
}

export async function readProjectFile(
  relativePath: string,
): Promise<FileReadResponse> {
  const absolutePath = resolveProjectPath(relativePath);
  const stat = await fs.stat(absolutePath);

  if (!stat.isFile()) {
    throw new Error(`Not a file: ${relativePath}`);
  }

  const content = await fs.readFile(absolutePath, "utf-8");
  return {
    path: relativePath.replace(/\\/g, "/"),
    content,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  };
}

export async function writeProjectFile(
  relativePath: string,
  content: string,
  options?: { createDirectories?: boolean },
): Promise<FileWriteResponse> {
  const absolutePath = resolveProjectPath(relativePath);

  if (options?.createDirectories) {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  }

  await fs.writeFile(absolutePath, content, { encoding: "utf-8", flag: "w" });
  const stat = await fs.stat(absolutePath);

  return {
    path: relativePath.replace(/\\/g, "/"),
    bytesWritten: Buffer.byteLength(content, "utf-8"),
    modifiedAt: stat.mtime.toISOString(),
  };
}

export function getWorkspaceInfo(): { workspaceRoot: string; projectsRoot: string } {
  return {
    workspaceRoot: getWorkspaceRoot(),
    projectsRoot: getProjectsRoot(),
  };
}
