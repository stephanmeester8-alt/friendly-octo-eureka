"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatEurFromCents } from "@/lib/utils";
import type { Task } from "@/types/database";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TaskCard({
  task,
  showClaim = false,
}: {
  task: Task;
  showClaim?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function claim() {
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${task.id}/claim`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <article className="group border-b border-[var(--ink)]/8 py-5 first:pt-0 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <span className="text-xs text-[var(--ink-muted)]">
              {timeAgo(task.created_at)}
            </span>
          </div>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]">
            {task.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--ink-muted)]">
            {task.description}
          </p>
          {task.file_url && (
            <p className="mt-2 text-xs font-medium text-[var(--ink)]/70">
              Attachment · {task.file_url.replace(/^demo:\/\//, "")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
            {task.budget === 0 ? "Free" : formatEurFromCents(task.budget)}
          </p>
          {showClaim && task.status === "open" && (
            <Button size="sm" variant="secondary" onClick={claim} disabled={pending}>
              {pending ? "Claiming…" : "Claim"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
