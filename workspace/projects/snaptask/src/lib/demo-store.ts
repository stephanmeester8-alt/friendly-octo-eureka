import type { Profile, Task, TaskStatus } from "@/types/database";
import { eurosToCents } from "@/lib/utils";

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
const now = () => new Date().toISOString();

let demoProfile: Profile = {
  id: DEMO_USER_ID,
  username: "demo",
  avatar_url: null,
  balance: eurosToCents(12.5), // 1250 cents
  created_at: now(),
};

let demoTasks: Task[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    client_id: DEMO_USER_ID,
    maker_id: null,
    title: "Remove background from product photo",
    description:
      "Clean cutout of a white sneaker on seamless backdrop. Export PNG with transparency.",
    budget: 75, // €0.75
    status: "open",
    file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    client_id: "00000000-0000-4000-8000-000000000002",
    maker_id: null,
    title: "Rewrite this bio in a warmer tone",
    description:
      "120 words max. Keep facts, soften corporate voice. Source text attached as .txt.",
    budget: 40, // €0.40
    status: "open",
    file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    client_id: DEMO_USER_ID,
    maker_id: "00000000-0000-4000-8000-000000000003",
    title: "Generate 5 Instagram captions",
    description:
      "For a local coffee roaster launch. Playful, not cringe. Include 3 hashtag suggestions each.",
    budget: 120, // €1.20
    status: "in_progress",
    file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    client_id: "00000000-0000-4000-8000-000000000004",
    maker_id: null,
    title: "Color-grade evening street photo",
    description:
      "Warm tungsten look, keep skin natural. Deliver .jpg at original resolution.",
    budget: 200, // €2.00
    status: "open",
    file_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
];

function cloneProfile(): Profile {
  return { ...demoProfile };
}

function cloneTasks(): Task[] {
  return demoTasks.map((t) => ({ ...t }));
}

export function getDemoProfile(): Profile {
  return cloneProfile();
}

export function getDemoTasks(filter?: {
  status?: TaskStatus | TaskStatus[];
  clientId?: string;
}): Task[] {
  let tasks = cloneTasks();
  if (filter?.status) {
    const statuses = Array.isArray(filter.status)
      ? filter.status
      : [filter.status];
    tasks = tasks.filter((t) => statuses.includes(t.status));
  }
  if (filter?.clientId) {
    tasks = tasks.filter((t) => t.client_id === filter.clientId);
  }
  return tasks.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getDemoOpenTasks(): Task[] {
  return getDemoTasks({ status: "open" });
}

export function getDemoActiveTasksForUser(): Task[] {
  return getDemoTasks({
    clientId: DEMO_USER_ID,
    status: ["open", "in_progress"],
  });
}

/** Top up wallet. `amountCents` must be ≥ 100 (€1.00). */
export function demoTopUp(amountCents: number): Profile {
  if (amountCents < 100) {
    throw new Error("Minimum top-up is €1.00");
  }
  demoProfile = {
    ...demoProfile,
    balance: demoProfile.balance + amountCents,
  };
  return cloneProfile();
}

/** Create task. `budget` is in cents. */
export function demoCreateTask(input: {
  title: string;
  description: string;
  budget: number;
  fileName?: string | null;
}): Task {
  if (input.budget > demoProfile.balance) {
    throw new Error("Insufficient wallet balance");
  }

  const timestamp = now();
  const task: Task = {
    id: crypto.randomUUID(),
    client_id: DEMO_USER_ID,
    maker_id: null,
    title: input.title.trim(),
    description: input.description.trim(),
    budget: Math.round(input.budget),
    status: "open",
    file_url: input.fileName ? `demo://${input.fileName}` : null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  demoProfile = {
    ...demoProfile,
    balance: demoProfile.balance - task.budget,
  };
  demoTasks = [task, ...demoTasks];
  return { ...task };
}

export function demoClaimTask(taskId: string): Task {
  const index = demoTasks.findIndex((t) => t.id === taskId);
  if (index === -1) throw new Error("Task not found");
  const task = demoTasks[index];
  if (task.status !== "open") throw new Error("Task is not open");
  if (task.client_id === DEMO_USER_ID) {
    throw new Error("You cannot claim your own task");
  }

  const updated: Task = {
    ...task,
    status: "in_progress",
    maker_id: DEMO_USER_ID,
    updated_at: now(),
  };
  demoTasks = [
    ...demoTasks.slice(0, index),
    updated,
    ...demoTasks.slice(index + 1),
  ];
  return { ...updated };
}

export const DEMO_USER = {
  id: DEMO_USER_ID,
  username: demoProfile.username,
};
