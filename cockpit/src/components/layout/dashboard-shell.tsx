"use client";

import * as React from "react";
import { Activity, Cpu, FolderKanban } from "lucide-react";

import { AgentMonitor } from "@/components/agent/agent-monitor";
import { HitlBanner } from "@/components/agent/hitl-banner";
import { CodeViewer } from "@/components/editor/code-viewer";
import { PromptInput } from "@/components/editor/prompt-input";
import { ProjectExplorer } from "@/components/explorer/project-explorer";
import { StatusBadge } from "@/components/ui/badge";
import type { AgentEvent, ExecutionStatus } from "@/types/cockpit";

async function resolveApproval(
  approvalId: string,
  decision: "approve" | "deny",
  kind?: string,
): Promise<void> {
  const response = await fetch("/api/agent/approval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approvalId, decision, kind }),
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to resolve approval");
  }
}

export function DashboardShell(): React.JSX.Element {
  const [selectedPath, setSelectedPath] = React.useState<string | null>(
    "demo-project/src/index.ts",
  );
  const [approvalRequest, setApprovalRequest] =
    React.useState<AgentEvent | null>(null);
  const [executionStatus, setExecutionStatus] =
    React.useState<ExecutionStatus>("IDLE");
  const [explorerRefreshKey, setExplorerRefreshKey] = React.useState(0);

  const projectSlug = selectedPath?.split("/")[0];

  const handleApprovalRequest = React.useCallback((event: AgentEvent) => {
    setApprovalRequest(event);
    setExecutionStatus("WAITING_APPROVAL");
  }, []);

  const handleApprove = async (requestId: string, kind?: string) => {
    try {
      await resolveApproval(requestId, "approve", kind);
      setApprovalRequest(null);
      setExecutionStatus("RUNNING");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeny = async (requestId: string, kind?: string) => {
    try {
      await resolveApproval(requestId, "deny", kind);
      setApprovalRequest(null);
      setExecutionStatus("IDLE");
    } catch (error) {
      console.error(error);
    }
  };

  const handlePromptSubmitted = () => {
    setExecutionStatus("RUNNING");
  };

  const handleFileWrite = React.useCallback(() => {
    setExplorerRefreshKey((current) => current + 1);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">
              Local Workspace Cockpit
            </span>
          </div>
          <StatusBadge status={executionStatus} />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            workspace/projects
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            OpenClaw Gateway
          </span>
        </div>
      </header>

      <HitlBanner
        request={approvalRequest}
        onApprove={(requestId, kind) => void handleApprove(requestId, kind)}
        onDeny={(requestId, kind) => void handleDeny(requestId, kind)}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px]">
        <ProjectExplorer
          selectedPath={selectedPath}
          refreshKey={explorerRefreshKey}
          onSelectFile={setSelectedPath}
        />

        <div className="flex min-w-0 flex-col">
          <div className="min-h-0 flex-1">
            <CodeViewer filePath={selectedPath} />
          </div>
          <PromptInput
            projectSlug={projectSlug}
            onSubmitted={handlePromptSubmitted}
          />
        </div>

        <AgentMonitor
          onApprovalRequest={handleApprovalRequest}
          onFileWrite={handleFileWrite}
        />
      </div>
    </div>
  );
}
