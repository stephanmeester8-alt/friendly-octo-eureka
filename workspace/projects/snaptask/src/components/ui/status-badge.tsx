import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";

const statusStyles: Record<TaskStatus, string> = {
  open: "bg-[var(--snap)]/25 text-[var(--ink)]",
  in_progress: "bg-[var(--sky)]/20 text-[var(--ink)]",
  completed: "bg-[var(--ink)]/8 text-[var(--ink-muted)]",
  disputed: "bg-[var(--coral)]/15 text-[var(--coral)]",
};

const labels: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  disputed: "Disputed",
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide",
        statusStyles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
