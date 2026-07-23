import fs from "node:fs/promises";
import path from "node:path";

import { IGNORED_NAMES, PROJECTS_ROOT } from "./config.js";

export class PathTraversalError extends Error {
  constructor(message) {
    super(message);
    this.name = "PathTraversalError";
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

function resolveUnderRoot(root, relativePath) {
  const normalized = String(relativePath ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const resolved = path.resolve(root, normalized);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new PathTraversalError(`Path escapes workspace boundary: ${relativePath}`);
  }

  return resolved;
}

export function resolveProjectRoot(slug) {
  const safeSlug = String(slug ?? "").trim();
  if (!safeSlug || safeSlug.includes("..") || safeSlug.includes("/") || safeSlug.includes("\\")) {
    throw new PathTraversalError(`Invalid project slug: ${slug}`);
  }
  return resolveUnderRoot(PROJECTS_ROOT, safeSlug);
}

export function resolveProjectFile(slug, filePath) {
  const projectRoot = resolveProjectRoot(slug);
  return resolveUnderRoot(projectRoot, filePath);
}

async function buildTree(absolutePath, relativePath) {
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
  const children = [];

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

export async function listProjects() {
  let entries = [];
  try {
    entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || IGNORED_NAMES.has(entry.name)) continue;

    const metadataPath = path.join(PROJECTS_ROOT, entry.name, "metadata.json");
    let metadata = null;

    try {
      const raw = await fs.readFile(metadataPath, "utf8");
      metadata = JSON.parse(raw);
    } catch {
      metadata = {
        id: entry.name,
        name: entry.name,
        description: "",
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
      };
    }

    projects.push({
      id: metadata.id ?? entry.name,
      slug: entry.name,
      name: metadata.name ?? entry.name,
      description: metadata.description ?? "",
      status: metadata.status ?? "ACTIVE",
      updatedAt: metadata.updatedAt ?? new Date().toISOString(),
    });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readProjectTree(slug) {
  const projectRoot = resolveProjectRoot(slug);
  try {
    await fs.access(projectRoot);
  } catch {
    throw new NotFoundError(`Project not found: ${slug}`);
  }

  const tree = await buildTree(projectRoot, "");
  return {
    root: projectRoot,
    project: {
      name: slug,
      path: slug,
      kind: "directory",
      modifiedAt: tree.modifiedAt,
      children: tree.children ?? [],
    },
  };
}

export async function readProjectFile(slug, filePath) {
  const absolute = resolveProjectFile(slug, filePath);
  try {
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) {
      throw new NotFoundError(`Not a file: ${filePath}`);
    }
    const content = await fs.readFile(absolute, "utf8");
    return {
      path: filePath.replace(/\\/g, "/"),
      content,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      throw new NotFoundError(`File not found: ${filePath}`);
    }
    throw error;
  }
}

export async function writeProjectFile(slug, filePath, content, createDirectories = true) {
  const absolute = resolveProjectFile(slug, filePath);
  if (createDirectories) {
    await fs.mkdir(path.dirname(absolute), { recursive: true });
  }
  await fs.writeFile(absolute, content, "utf8");
  const stat = await fs.stat(absolute);
  return {
    path: filePath.replace(/\\/g, "/"),
    bytesWritten: Buffer.byteLength(content, "utf8"),
    modifiedAt: stat.mtime.toISOString(),
  };
}
