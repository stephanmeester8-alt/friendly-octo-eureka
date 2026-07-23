/**
 * Domain types for the Local AI Workspace Cockpit.
 * Shared across UI, API routes, and orchestration gateway integrations.
 */

// ---------------------------------------------------------------------------
// Execution & task lifecycle
// ---------------------------------------------------------------------------

export type ExecutionStatus =
  | "IDLE"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED";

export interface AgentTask {
  id: string;
  projectSlug: string;
  prompt: string;
  agentName: string;
  status: ExecutionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Real-time telemetry (SSE / WebSocket)
// ---------------------------------------------------------------------------

export type AgentEventType =
  | "THOUGHT"
  | "TOOL_CALL"
  | "FILE_WRITE"
  | "APPROVAL_REQUEST"
  | "ERROR";

export interface AgentEvent {
  id: string;
  timestamp: string;
  agentName: string;
  type: AgentEventType;
  payload: Record<string, unknown>;
}

export interface ApprovalRequestPayload {
  requestId: string;
  toolName: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  arguments?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Project & file system
// ---------------------------------------------------------------------------

export type ProjectFileKind = "file" | "directory";

export interface ProjectFile {
  name: string;
  path: string;
  kind: ProjectFileKind;
  size?: number;
  modifiedAt?: string;
  children?: ProjectFile[];
}

export interface ProjectMetadata {
  slug: string;
  displayName: string;
  status: ExecutionStatus;
  createdAt: string;
  updatedAt: string;
  model?: string;
  lastAgent?: string;
  description?: string;
}

export interface ProjectSummary {
  slug: string;
  displayName: string;
  status: ExecutionStatus;
  updatedAt: string;
}

export interface FileTreeResponse {
  root: string;
  projects: ProjectFile[];
}

export interface FileReadResponse {
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}

export interface FileWriteRequest {
  path: string;
  content: string;
  createDirectories?: boolean;
}

export interface FileWriteResponse {
  path: string;
  bytesWritten: number;
  modifiedAt: string;
}

// ---------------------------------------------------------------------------
// Gateway / orchestration
// ---------------------------------------------------------------------------

export interface GatewayConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface TriggerAgentRequest {
  projectSlug: string;
  prompt: string;
  agentName?: string;
}

export interface TriggerAgentResponse {
  taskId: string;
  status: ExecutionStatus;
}
