"use client";

import * as React from "react";
import { Loader2, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentTaskType, ProjectMetadata } from "@/types/cockpit";

interface ModelCatalogResponse {
  models: Array<{ id: string; label: string; description: string }>;
  taskTypes: Array<{ id: AgentTaskType; label: string; description: string }>;
}

const OVERRIDE_TASK_TYPES: AgentTaskType[] = [
  "architecture",
  "code",
  "review",
  "docs",
];

interface ProjectSettingsPanelProps {
  projectSlug?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (project: ProjectMetadata) => void;
}

export function ProjectSettingsPanel({
  projectSlug,
  isOpen,
  onClose,
  onUpdated,
}: ProjectSettingsPanelProps): React.JSX.Element | null {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [catalog, setCatalog] = React.useState<ModelCatalogResponse | null>(
    null,
  );
  const [primaryModel, setPrimaryModel] = React.useState("");
  const [modelByTaskType, setModelByTaskType] = React.useState<
    Partial<Record<AgentTaskType, string>>
  >({});

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
          fetch("/api/models"),
          fetch(`/api/projects/${encodeURIComponent(projectSlug)}`),
        ]);

        const catalogBody = (await catalogResponse.json()) as ModelCatalogResponse;
        const projectBody = (await projectResponse.json()) as ProjectMetadata & {
          error?: string;
        };

        if (!catalogResponse.ok) {
          throw new Error("Failed to load model catalog");
        }

        if (!projectResponse.ok) {
          throw new Error(projectBody.error ?? "Failed to load project settings");
        }

        if (cancelled) return;

        setCatalog(catalogBody);
        setPrimaryModel(projectBody.agentConfig.primaryModel);
        setModelByTaskType(projectBody.agentConfig.modelByTaskType ?? {});
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load project settings",
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
            agentConfig: {
              primaryModel,
              modelByTaskType,
            },
          }),
        },
      );

      const body = (await response.json()) as ProjectMetadata & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save project settings");
      }

      onUpdated?.(body);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save project settings",
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
        aria-labelledby="project-settings-title"
        className="w-full max-w-xl rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <div>
              <h2 id="project-settings-title" className="text-sm font-semibold">
                Project Agent Settings
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
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSave(event)} className="space-y-4 p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading project settings…
            </div>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">
                  Primary model
                </span>
                <select
                  value={primaryModel}
                  onChange={(event) => setPrimaryModel(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {(catalog?.models ?? []).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <span className="block text-[10px] text-muted-foreground">
                  Default model for general prompts and Auto task type
                </span>
              </label>

              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground">
                  Per-task model overrides
                </p>
                {OVERRIDE_TASK_TYPES.map((taskType) => {
                  const taskMeta = catalog?.taskTypes.find(
                    (task) => task.id === taskType,
                  );
                  return (
                    <label key={taskType} className="block space-y-1">
                      <span className="text-[11px] text-muted-foreground">
                        {taskMeta?.label ?? taskType}
                      </span>
                      <select
                        value={modelByTaskType[taskType] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setModelByTaskType((current) => {
                            const next = { ...current };
                            if (value) {
                              next[taskType] = value;
                            } else {
                              delete next[taskType];
                            }
                            return next;
                          });
                        }}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Use catalog default</option>
                        {(catalog?.models ?? []).map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
