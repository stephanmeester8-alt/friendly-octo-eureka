"use client";

import * as React from "react";
import { Loader2, Plug, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { McpServerDefinition, ProjectMetadata } from "@/types/cockpit";

interface McpToolingManagerProps {
  projectSlug?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (project: ProjectMetadata) => void;
}

export function McpToolingManager({
  projectSlug,
  isOpen,
  onClose,
  onUpdated,
}: McpToolingManagerProps): React.JSX.Element | null {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [catalog, setCatalog] = React.useState<McpServerDefinition[]>([]);
  const [enabledServers, setEnabledServers] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen || !projectSlug) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [catalogResponse, projectResponse] = await Promise.all([
          fetch("/api/mcp/servers"),
          fetch(`/api/projects/${encodeURIComponent(projectSlug)}`),
        ]);

        const catalogBody = (await catalogResponse.json()) as {
          servers: McpServerDefinition[];
        };
        const projectBody = (await projectResponse.json()) as ProjectMetadata & {
          error?: string;
        };

        if (!catalogResponse.ok) {
          throw new Error("Failed to load MCP catalog");
        }

        if (!projectResponse.ok) {
          throw new Error(projectBody.error ?? "Failed to load project MCP config");
        }

        if (cancelled) return;

        setCatalog(catalogBody.servers);
        setEnabledServers(projectBody.mcpConfig?.enabledServers ?? []);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load MCP tooling manager",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectSlug]);

  if (!isOpen || !projectSlug) {
    return null;
  }

  const toggleServer = (serverId: string) => {
    setEnabledServers((current) =>
      current.includes(serverId)
        ? current.filter((id) => id !== serverId)
        : [...current, serverId],
    );
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectSlug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mcpConfig: { enabledServers },
          }),
        },
      );

      const body = (await response.json()) as ProjectMetadata & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save MCP configuration");
      }

      onUpdated?.(body);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save MCP configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-tooling-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            <div>
              <h2 id="mcp-tooling-title" className="text-sm font-semibold">
                MCP Skill Registry
              </h2>
              <p className="font-mono text-[10px] text-muted-foreground">
                {projectSlug}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close MCP manager"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event) => void handleSave(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading MCP servers…
              </div>
            ) : (
              catalog.map((server) => {
                const enabled = enabledServers.includes(server.id);
                return (
                  <div
                    key={server.id}
                    className="rounded-md border border-border bg-background/40 p-3"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleServer(server.id)}
                        className="mt-1 rounded border-border"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {server.name}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {server.transport}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {server.description}
                        </span>
                        {server.packageName ? (
                          <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                            {server.packageName}
                          </span>
                        ) : null}
                        <span className="mt-2 flex flex-wrap gap-1">
                          {server.tools.map((tool) => (
                            <span
                              key={tool.id}
                              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              title={tool.description}
                            >
                              {tool.name}
                            </span>
                          ))}
                        </span>
                      </span>
                    </label>
                  </div>
                );
              })
            )}
          </div>

          {error ? (
            <p className="mx-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save MCP configuration
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
