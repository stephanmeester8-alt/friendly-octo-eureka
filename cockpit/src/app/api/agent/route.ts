import { NextRequest, NextResponse } from "next/server";

import { triggerProjectAgentRun } from "@/lib/gateway";
import { touchProjectActivity } from "@/lib/projects";
import type { TriggerAgentRequest, TriggerAgentResponse } from "@/types/cockpit";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: TriggerAgentRequest;

  try {
    body = (await request.json()) as TriggerAgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectSlug = body.projectSlug?.trim();
  const prompt = body.prompt?.trim();

  if (!projectSlug) {
    return NextResponse.json(
      { error: "projectSlug is required" },
      { status: 400 },
    );
  }

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const result = await triggerProjectAgentRun({
      projectSlug,
      prompt,
      agentId: body.agentName,
      taskType: body.taskType,
      autoDetectTaskType: body.autoDetectTaskType,
    });

    await touchProjectActivity(projectSlug).catch(() => undefined);

    const response: TriggerAgentResponse = {
      taskId: result.runId,
      status: result.status === "error" ? "FAILED" : "RUNNING",
      model: result.model,
      taskType: result.taskType,
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to trigger agent run";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
