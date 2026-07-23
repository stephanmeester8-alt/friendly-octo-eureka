"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PromptInputProps {
  projectSlug?: string;
  onSubmit?: (prompt: string) => void;
}

export function PromptInput({
  projectSlug,
  onSubmit,
}: PromptInputProps): React.JSX.Element {
  const [prompt, setPrompt] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      onSubmit?.(trimmed);
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="border-t border-border bg-card p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Agent Prompt
        </p>
        {projectSlug ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            {projectSlug}
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe a task for the background agent engine…"
          rows={3}
          className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          className="self-end"
          disabled={!prompt.trim() || submitting}
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
