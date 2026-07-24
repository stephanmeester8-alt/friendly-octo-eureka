import { TaskCard } from "@/components/tasks/task-card";
import type { Task } from "@/types/database";

export function MarketplaceFeed({
  tasks,
  showClaim = true,
  emptyLabel = "No open tasks right now. Check back soon.",
}: {
  tasks: Task[];
  showClaim?: boolean;
  emptyLabel?: string;
}) {
  if (!tasks.length) {
    return (
      <p className="py-12 text-center text-sm text-[var(--ink-muted)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} showClaim={showClaim} />
      ))}
    </div>
  );
}
