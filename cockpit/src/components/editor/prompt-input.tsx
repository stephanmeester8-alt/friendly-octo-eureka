"use client";

import * as React from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentTaskType } from "@/types/cockpit";

interface PromptInputProps {
  projectSlug?: string;
  disabled?: boolean;
  onSubmitted?: (input: {
    projectSlug: string;
    prompt: string;
    model?: string;
    taskType?: AgentTaskType;
  }) => void;
  onError?: (message: string) => void;
}

const TASK_TYPE_OPTIONS: Array<{ id: AgentTaskType; label: string }> = [
  { id: "default", label: "Auto" },
  { id: "architecture", label: "Architecture" },
  { id: "code", label: "Code" },
  { id: "review", label: "Review" },
  { id: "docs", label: "Docs" },
];

export function PromptInput({
  projectSlug,
  disabled = false,
  onSubmitted,
  onError,
}: PromptInputProps): React.JSX.Element {
  const [prompt, setPrompt] = React.useState("");
  const [taskType, setTaskType] = React.useState<AgentTaskType>("default");
  const [autoDetectTaskType, setAutoDetectTaskType] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || !projectSlug) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug,
          prompt: trimmed,
          taskType: taskType === "default" ? undefined : taskType,
          autoDetectTaskType,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        taskId?: string;
        model?: string;
        taskType?: AgentTaskType;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to start agent run");
      }

      setPrompt("");
      const modelLabel = body.model ? ` • ${body.model.split("/").pop()}` : "";
      const taskLabel = body.taskType ? ` • ${body.taskType}` : "";
      setStatusMessage(`Run ${body.taskId ?? "started"}${taskLabel}${modelLabel}`);
      onSubmitted?.({
        projectSlug,
        prompt: trimmed,
        model: body.model,
        taskType: body.taskType,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start agent run";
      setStatusMessage(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="border-t border-border bg-card p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Agent Prompt
        </p>
        <div className="flex items-center gap-2">
          {statusMessage ? (
            <span className="max-w-[260px] truncate text-[10px] text-muted-foreground">
              {statusMessage}
            </span>
          ) : null}
          {projectSlug ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              {projectSlug}
            </span>
          ) : (
            <span className="text-[10px] text-amber-400">
              Select a project file first
            </span>
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Task
          <select
            value={taskType}
            onChange={(event) =>
              setTaskType(event.target.value as AgentTaskType)
            }
            disabled={disabled || !projectSlug || submitting}
            className="rounded border border-border bg-background px-2 py-1 text-[10px] text-foreground"
          >
            {TASK_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            checked={autoDetectTaskType}
            onChange={(event) => setAutoDetectTaskType(event.target.checked)}
            disabled={disabled || !projectSlug || submitting || taskType !== "default"}
            className="rounded border-border"
          />
          Auto-detect from prompt
        </label>
      </div>

      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            projectSlug
              ? "Describe a task for the OpenClaw agent engine…"
              : "Open a project file to bind the agent session…"
          }
          rows={3}
          disabled={disabled || !projectSlug || submitting}
          className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <Button
          type="submit"
          className="self-end"
          disabled={!prompt.trim() || !projectSlug || submitting || disabled}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Run
        </Button>
      </div>
    </form>
  );
}
