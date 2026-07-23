"use client";

import * as React from "react";
import {
  ChevronRight,
  File,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@/types/cockpit";

interface ProjectExplorerProps {
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

function getFileIcon(name: string): React.JSX.Element {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx") {
    return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />;
  }
  if (ext === "md" || ext === "json") {
    return <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400" />;
  }
  return <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelectFile,
}: {
  node: ProjectFile;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = React.useState(depth < 2);
  const isDirectory = node.kind === "directory";
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (isDirectory) {
      setExpanded((value) => !value);
      return;
    }
    onSelectFile(node.path);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "text-foreground/80 hover:bg-accent/60",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isDirectory ? (
          <>
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-90",
              )}
            />
            {expanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="truncate">{node.name || node.path}</span>
      </button>

      {isDirectory && expanded && node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

export function ProjectExplorer({
  selectedPath,
  onSelectFile,
}: ProjectExplorerProps): React.JSX.Element {
  const [tree, setTree] = React.useState<ProjectFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadTree = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/files");
      if (!response.ok) {
        throw new Error("Failed to load project tree");
      }
      const data = (await response.json()) as { projects: ProjectFile[] };
      setTree(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();

    const fetchTree = async () => {
      try {
        const response = await fetch("/api/files", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Failed to load project tree");
        }
        const data = (await response.json()) as { projects: ProjectFile[] };
        setTree(data.projects);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchTree();

    return () => controller.abort();
  }, []);

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explorer
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            workspace/projects
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void loadTree()}
          aria-label="Refresh explorer"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-1">
        {loading && tree.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading projects…
          </div>
        ) : null}

        {error ? (
          <p className="px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}

        {!loading && tree.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            No projects yet. Create one under{" "}
            <code className="rounded bg-muted px-1">workspace/projects/</code>.
          </p>
        ) : null}

        {tree.map((project) => (
          <TreeNode
            key={project.path}
            node={project}
            depth={0}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
