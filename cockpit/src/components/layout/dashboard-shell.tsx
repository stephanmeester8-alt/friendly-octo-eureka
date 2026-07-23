"use client";

import * as React from "react";
import { Activity, Cpu, FolderKanban, Plug, Settings2 } from "lucide-react";

import { AgentMonitor } from "@/components/agent/agent-monitor";
import { HitlBanner } from "@/components/agent/hitl-banner";
import { CodeViewer } from "@/components/editor/code-viewer";
import { PromptInput } from "@/components/editor/prompt-input";
import { ProjectExplorer } from "@/components/explorer/project-explorer";
import { McpToolingManager } from "@/components/projects/mcp-tooling-manager";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentEvent, ExecutionStatus } from "@/types/cockpit";

export function DashboardShell(): React.JSX.Element {
  const [selectedPath, setSelectedPath] = React.useState<string | null>(
    "demo-project/src/index.ts",
  );
  const [approvalRequest, setApprovalRequest] =
    React.useState<AgentEvent | null>(null);
  const [executionStatus, setExecutionStatus] =
    React.useState<ExecutionStatus>("IDLE");
  const [explorerRefreshKey, setExplorerRefreshKey] = React.useState(0);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [mcpManagerOpen, setMcpManagerOpen] = React.useState(false);

  const projectSlug = selectedPath?.split("/")[0];

  const handleApprovalRequest = React.useCallback((event: AgentEvent) => {
    setApprovalRequest(event);
    setExecutionStatus("WAITING_APPROVAL");
  }, []);

  const handleApprovalResolved = React.useCallback(
    (input: { executionStatus: string }) => {
      setApprovalRequest(null);
      if (
        input.executionStatus === "IDLE" ||
        input.executionStatus === "RUNNING" ||
        input.executionStatus === "WAITING_APPROVAL" ||
        input.executionStatus === "COMPLETED" ||
        input.executionStatus === "FAILED"
      ) {
        setExecutionStatus(input.executionStatus);
      }
    },
    [],
  );

  const handlePromptSubmitted = () => {
    setExecutionStatus("RUNNING");
  };

  const handleFileWrite = React.useCallback(() => {
    setExplorerRefreshKey((current) => current + 1);
  }, []);

  const handleExecutionStatus = React.useCallback((status: ExecutionStatus) => {
    setExecutionStatus(status);
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
          {projectSlug ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={() => setMcpManagerOpen(true)}
              >
                <Plug className="h-3.5 w-3.5" />
                MCP tools
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Agent settings
              </Button>
            </>
          ) : null}
          <span className="flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            workspace/projects
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            OpenClaw Gateway + HITL
          </span>
        </div>
      </header>

      <HitlBanner
        request={approvalRequest}
        projectSlug={projectSlug}
        onResolved={handleApprovalResolved}
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
          onExecutionStatus={handleExecutionStatus}
        />
      </div>

      <ProjectSettingsPanel
        projectSlug={projectSlug}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <McpToolingManager
        projectSlug={projectSlug}
        isOpen={mcpManagerOpen}
        onClose={() => setMcpManagerOpen(false)}
      />
    </div>
  );
}
