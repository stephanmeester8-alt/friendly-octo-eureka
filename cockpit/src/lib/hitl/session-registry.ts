import type { ExecutionStatus } from "@/types/cockpit";

interface ActiveSession {
  projectSlug: string;
  sessionKey: string;
  runId?: string;
  updatedAt: string;
}

declare global {
  var __cockpitSessionRegistry: Map<string, ActiveSession> | undefined;
  var __cockpitExecutionStatus: ExecutionStatus | undefined;
}

function getRegistry(): Map<string, ActiveSession> {
  if (!globalThis.__cockpitSessionRegistry) {
    globalThis.__cockpitSessionRegistry = new Map();
  }
  return globalThis.__cockpitSessionRegistry;
}

export function registerActiveSession(input: {
  sessionKey: string;
  projectSlug: string;
  runId?: string;
}): void {
  const registry = getRegistry();
  registry.set(input.sessionKey, {
    projectSlug: input.projectSlug,
    sessionKey: input.sessionKey,
    runId: input.runId,
    updatedAt: new Date().toISOString(),
  });

  if (input.runId) {
    registry.set(input.runId, {
      projectSlug: input.projectSlug,
      sessionKey: input.sessionKey,
      runId: input.runId,
      updatedAt: new Date().toISOString(),
    });
  }
}

export function resolveProjectSlug(input: {
  sessionKey?: string;
  runId?: string;
}): string | undefined {
  const registry = getRegistry();

  if (input.sessionKey) {
    const bySession = registry.get(input.sessionKey);
    if (bySession) return bySession.projectSlug;
  }

  if (input.runId) {
    const byRun = registry.get(input.runId);
    if (byRun) return byRun.projectSlug;
  }

  return undefined;
}

export function getExecutionStatus(): ExecutionStatus {
  return globalThis.__cockpitExecutionStatus ?? "IDLE";
}

export function setExecutionStatus(status: ExecutionStatus): ExecutionStatus {
  globalThis.__cockpitExecutionStatus = status;
  return status;
}
