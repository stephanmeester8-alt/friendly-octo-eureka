import type { Profile, Task, TaskStatus } from "@/types/database";

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

let demoProfile: Profile = {
  id: DEMO_USER_ID,
  email: "demo@usesnaptask.com",
  balance: 12.5,
  created_at: new Date().toISOString(),
};

let demoTasks: Task[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    client_id: DEMO_USER_ID,
    title: "Remove background from product photo",
    description:
      "Clean cutout of a white sneaker on seamless backdrop. Export PNG with transparency.",
    budget: 0.75,
    status: "open",
    file_url: null,
    worker_id: null,
    result_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    client_id: "00000000-0000-4000-8000-000000000002",
    title: "Rewrite this bio in a warmer tone",
    description:
      "120 words max. Keep facts, soften corporate voice. Source text attached as .txt.",
    budget: 0.4,
    status: "open",
    file_url: null,
    worker_id: null,
    result_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    client_id: DEMO_USER_ID,
    title: "Generate 5 Instagram captions",
    description:
      "For a local coffee roaster launch. Playful, not cringe. Include 3 hashtag suggestions each.",
    budget: 1.2,
    status: "in_progress",
    file_url: null,
    worker_id: "00000000-0000-4000-8000-000000000003",
    result_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    client_id: "00000000-0000-4000-8000-000000000004",
    title: "Color-grade evening street photo",
    description:
      "Warm tungsten look, keep skin natural. Deliver .jpg at original resolution.",
    budget: 2.0,
    status: "open",
    file_url: null,
    worker_id: null,
    result_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
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
    status: ["open", "in_progress", "disputed"],
  });
}

export function demoTopUp(amount: number): Profile {
  if (amount < 1) {
    throw new Error("Minimum top-up is €1.00");
  }
  demoProfile = {
    ...demoProfile,
    balance: Number((demoProfile.balance + amount).toFixed(2)),
  };
  return cloneProfile();
}

export function demoCreateTask(input: {
  title: string;
  description: string;
  budget: number;
  fileName?: string | null;
}): Task {
  if (input.budget > demoProfile.balance) {
    throw new Error("Insufficient wallet balance");
  }

  const task: Task = {
    id: crypto.randomUUID(),
    client_id: DEMO_USER_ID,
    title: input.title.trim(),
    description: input.description.trim(),
    budget: Number(input.budget.toFixed(2)),
    status: "open",
    file_url: input.fileName ? `demo://${input.fileName}` : null,
    worker_id: null,
    result_url: null,
    created_at: new Date().toISOString(),
  };

  demoProfile = {
    ...demoProfile,
    balance: Number((demoProfile.balance - input.budget).toFixed(2)),
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
    worker_id: DEMO_USER_ID,
  };
  demoTasks = [
    ...demoTasks.slice(0, index),
    updated,
    ...demoTasks.slice(index + 1),
  ];
  return { ...updated };
}

export const DEMO_USER = { id: DEMO_USER_ID, email: demoProfile.email };
