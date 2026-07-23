import { NextRequest, NextResponse } from "next/server";

import {
  getFileTree,
  PathTraversalError,
  readProjectFile,
  writeProjectFile,
} from "@/lib/filesystem";
import type { FileWriteRequest } from "@/types/cockpit";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const project = searchParams.get("project") ?? undefined;
  const filePath = searchParams.get("path");

  try {
    if (filePath) {
      const file = await readProjectFile(filePath);
      return NextResponse.json(file);
    }

    const tree = await getFileTree(project);
    return NextResponse.json(tree);
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to read filesystem";
    const status = message.includes("ENOENT") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: FileWriteRequest;

  try {
    body = (await request.json()) as FileWriteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.path?.trim()) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  if (typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content must be a string" },
      { status: 400 },
    );
  }

  try {
    const result = await writeProjectFile(body.path, body.content, {
      createDirectories: body.createDirectories ?? true,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to write file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
