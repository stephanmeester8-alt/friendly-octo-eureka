import { NextResponse } from "next/server";
import {
  demoCreateTask,
  getDemoActiveTasksForUser,
  getDemoOpenTasks,
  getDemoTasks,
} from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { eurosToCents, isDemoMode } from "@/lib/utils";
import type { Profile, Task } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "open";

  if (isDemoMode()) {
    if (scope === "mine") {
      return NextResponse.json({ tasks: getDemoActiveTasksForUser() });
    }
    if (scope === "all") {
      return NextResponse.json({ tasks: getDemoTasks() });
    }
    return NextResponse.json({ tasks: getDemoOpenTasks() });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (scope === "open") {
    query = query.eq("status", "open");
  } else if (scope === "mine") {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    query = query
      .eq("client_id", user.id)
      .in("status", ["open", "in_progress"]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: (data ?? []) as Task[] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const fileName = body.fileName ? String(body.fileName) : null;

  // Accept either budgetCents (preferred) or budget in euros (legacy UI)
  let budgetCents: number;
  if (body.budgetCents != null) {
    budgetCents = Math.round(Number(body.budgetCents));
  } else {
    budgetCents = eurosToCents(Number(body.budget ?? 0));
  }

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required" },
      { status: 400 },
    );
  }
  if (Number.isNaN(budgetCents) || budgetCents < 0) {
    return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
  }

  if (isDemoMode()) {
    try {
      const task = demoCreateTask({
        title,
        description,
        budget: budgetCents,
        fileName,
      });
      return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to create task" },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const current = profile as Pick<Profile, "balance">;

  if (budgetCents > Number(current.balance)) {
    return NextResponse.json(
      { error: "Insufficient wallet balance" },
      { status: 400 },
    );
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      client_id: user.id,
      title,
      description,
      budget: budgetCents,
      file_url: fileName,
      status: "open",
    })
    .select()
    .single();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  const { error: debitError } = await supabase
    .from("profiles")
    .update({ balance: Number(current.balance) - budgetCents })
    .eq("id", user.id);

  if (debitError) {
    return NextResponse.json({ error: debitError.message }, { status: 500 });
  }

  return NextResponse.json({ task: task as Task }, { status: 201 });
}
