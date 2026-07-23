import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 18_789);
export const HOST = process.env.HOST ?? "127.0.0.1";

const defaultWorkspaceRoot = path.resolve(__dirname, "..", "..", "workspace");

export const WORKSPACE_ROOT = path.resolve(
  process.env.WORKSPACE_ROOT?.trim() || defaultWorkspaceRoot,
);

export const PROJECTS_ROOT = path.join(WORKSPACE_ROOT, "projects");

export const IGNORED_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "__pycache__",
  ".DS_Store",
]);
