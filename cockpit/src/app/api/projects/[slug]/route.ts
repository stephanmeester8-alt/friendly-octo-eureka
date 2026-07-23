import { NextRequest, NextResponse } from "next/server";

import {
  ProjectNotFoundError,
  readProjectMetadata,
  updateProject,
} from "@/lib/projects";
import type { UpdateProjectRequest } from "@/types/cockpit";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { slug } = await context.params;

  try {
    const project = await readProjectMetadata(slug);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to read project metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { slug } = await context.params;
  let body: UpdateProjectRequest;

  try {
    body = (await request.json()) as UpdateProjectRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    body.name === undefined &&
    body.description === undefined &&
    body.status === undefined &&
    body.agentConfig === undefined
  ) {
    return NextResponse.json(
      { error: "At least one field must be provided" },
      { status: 400 },
    );
  }

  try {
    const project = await updateProject(slug, body);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
