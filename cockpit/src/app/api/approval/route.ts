import { NextRequest, NextResponse } from "next/server";

import {
  mapApprovalErrorStatus,
  processApprovalResolution,
} from "@/lib/hitl";
import type { ApprovalResolveRequest } from "@/types/cockpit";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ApprovalResolveRequest;

  try {
    body = (await request.json()) as ApprovalResolveRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  if (body.decision !== "APPROVE" && body.decision !== "REJECT") {
    return NextResponse.json(
      { error: "decision must be APPROVE or REJECT" },
      { status: 400 },
    );
  }

  try {
    const result = await processApprovalResolution({
      requestId,
      decision: body.decision,
      projectSlug: body.projectSlug,
      kind: body.kind,
    });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = mapApprovalErrorStatus(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
