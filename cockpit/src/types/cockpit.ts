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
  | "UNAUTHORIZED_TOOL"
  | "EXECUTION_STATUS"
  | "ERROR";

export type ToolRiskLevel = "low" | "medium" | "high";

export type ApprovalDecision = "APPROVE" | "REJECT";

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
  riskLevel: ToolRiskLevel;
  projectSlug?: string;
  runId?: string;
  source?: "cockpit" | "gateway";
  kind?: string;
  arguments?: Record<string, unknown>;
}

export interface ApprovalResolveRequest {
  requestId: string;
  decision: ApprovalDecision;
  projectSlug?: string;
  kind?: string;
}

export interface ApprovalResolveResponse {
  ok: true;
  requestId: string;
  decision: ApprovalDecision;
  executionStatus: ExecutionStatus;
}

// ---------------------------------------------------------------------------
// Project & file system
// ---------------------------------------------------------------------------

export type ProjectLifecycleStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";

export type ProjectTemplate = "default" | "python-service" | "nextjs-app";

export interface ProjectAgentConfig {
  primaryModel: string;
  allowedTools: string[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectLifecycleStatus;
  agentConfig: ProjectAgentConfig;
}

export interface ProjectSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectLifecycleStatus;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  template?: ProjectTemplate;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectLifecycleStatus;
  agentConfig?: Partial<ProjectAgentConfig>;
}

export interface CreateProjectResponse {
  success: true;
  project: ProjectMetadata;
  slug: string;
}

export type ProjectFileKind = "file" | "directory";

export interface ProjectFile {
  name: string;
  path: string;
  kind: ProjectFileKind;
  size?: number;
  modifiedAt?: string;
  children?: ProjectFile[];
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
