import { NextResponse } from "next/server";
import { demoClaimTask } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import type { Task } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (isDemoMode()) {
    try {
      const task = demoClaimTask(id);
      return NextResponse.json({ task });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to claim task" },
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

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const current = existing as Task;

  if (current.status !== "open") {
    return NextResponse.json({ error: "Task is not open" }, { status: 400 });
  }

  if (current.client_id === user.id) {
    return NextResponse.json(
      { error: "You cannot claim your own task" },
      { status: 400 },
    );
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status: "in_progress", worker_id: user.id })
    .eq("id", id)
    .eq("status", "open")
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: task as Task });
}
