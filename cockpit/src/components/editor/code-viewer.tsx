"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading editor…
    </div>
  ),
});

interface CodeViewerProps {
  filePath: string | null;
}

function languageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "html":
      return "html";
    case "py":
      return "python";
    default:
      return "plaintext";
  }
}

function CodeViewerInner({ filePath }: { filePath: string }): React.JSX.Element {
  const [content, setContent] = React.useState("");
  const [originalContent, setOriginalContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const isDirty = content !== originalContent;

  React.useEffect(() => {
    const controller = new AbortController();

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      setSaveMessage(null);

      try {
        const response = await fetch(
          `/api/files?path=${encodeURIComponent(filePath)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Failed to load file");
        }
        const data = (await response.json()) as { content: string };
        setContent(data.content);
        setOriginalContent(data.content);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadFile();

    return () => controller.abort();
  }, [filePath]);

  const handleSave = async () => {
    if (!filePath || !isDirty) return;

    setSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save file");
      }

      setOriginalContent(content);
      setSaveMessage("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-foreground">
            {filePath ?? "No file selected"}
          </p>
          {isDirty ? (
            <p className="text-[10px] text-amber-400">Unsaved changes</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {saveMessage ? (
            <span className="text-[10px] text-emerald-400">{saveMessage}</span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            disabled={!filePath || !isDirty || saving}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className={cn("relative flex-1", loading && "opacity-60")}>
        <MonacoEditor
          height="100%"
          language={languageFromPath(filePath)}
          theme="vs-dark"
          value={content}
          onChange={(value) => setContent(value ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />

        {error ? (
          <div className="absolute bottom-3 left-3 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CodeViewer({ filePath }: CodeViewerProps): React.JSX.Element {
  if (!filePath) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="truncate font-mono text-xs text-foreground">
            No file selected
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Select a file from the explorer to preview or edit.
        </div>
      </div>
    );
  }

  return <CodeViewerInner key={filePath} filePath={filePath} />;
}
