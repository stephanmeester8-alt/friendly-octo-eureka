import { NextRequest, NextResponse } from "next/server";

import { listProjectMetadata, createProject, ProjectAlreadyExistsError } from "@/lib/projects";
import type { CreateProjectRequest, CreateProjectResponse } from "@/types/cockpit";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const projects = await listProjectMetadata();
    return NextResponse.json({ projects });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: CreateProjectRequest;

  try {
    body = (await request.json()) as CreateProjectRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const result = await createProject({
      name,
      description: body.description?.trim() ?? "",
      template: body.template,
    });

    const response: CreateProjectResponse = {
      success: true,
      project: result.project,
      slug: result.slug,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof ProjectAlreadyExistsError) {
      return NextResponse.json({ error: "Project already exists" }, { status: 409 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
