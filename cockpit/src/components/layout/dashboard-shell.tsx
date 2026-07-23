"use client";

import * as React from "react";
import { Activity, Cpu, FolderKanban } from "lucide-react";

import { AgentMonitor } from "@/components/agent/agent-monitor";
import { HitlBanner } from "@/components/agent/hitl-banner";
import { CodeViewer } from "@/components/editor/code-viewer";
import { PromptInput } from "@/components/editor/prompt-input";
import { ProjectExplorer } from "@/components/explorer/project-explorer";
import { StatusBadge } from "@/components/ui/badge";
import type { AgentEvent } from "@/types/cockpit";

export function DashboardShell(): React.JSX.Element {
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [approvalRequest, setApprovalRequest] =
    React.useState<AgentEvent | null>(null);

  const projectSlug = selectedPath?.split("/")[0];

  const handleApprovalRequest = React.useCallback((event: AgentEvent) => {
    setApprovalRequest(event);
  }, []);

  const handleApprove = (requestId: string) => {
    console.info("[HITL] Approved:", requestId);
    setApprovalRequest(null);
  };

  const handleDeny = (requestId: string) => {
    console.info("[HITL] Denied:", requestId);
    setApprovalRequest(null);
  };

  const handlePromptSubmit = (prompt: string) => {
    console.info("[Agent] Prompt submitted:", { projectSlug, prompt });
  };

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
          <StatusBadge status="RUNNING" />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            workspace/projects
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Gateway 127.0.0.1:18789
          </span>
        </div>
      </header>

      <HitlBanner
        request={approvalRequest}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px]">
        <ProjectExplorer
          selectedPath={selectedPath}
          onSelectFile={setSelectedPath}
        />

        <div className="flex min-w-0 flex-col">
          <div className="min-h-0 flex-1">
            <CodeViewer filePath={selectedPath} />
          </div>
          <PromptInput
            projectSlug={projectSlug}
            onSubmit={handlePromptSubmit}
          />
        </div>

        <AgentMonitor onApprovalRequest={handleApprovalRequest} />
      </div>
    </div>
  );
}
