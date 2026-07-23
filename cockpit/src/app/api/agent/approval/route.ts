import { NextRequest, NextResponse } from "next/server";

import {
  mapApprovalErrorStatus,
  processApprovalResolution,
} from "@/lib/hitl";
import type { ApprovalDecision } from "@/types/cockpit";

export const runtime = "nodejs";

interface LegacyApprovalBody {
  approvalId?: string;
  requestId?: string;
  decision?: "approve" | "deny" | ApprovalDecision;
  kind?: string;
  projectSlug?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: LegacyApprovalBody;

  try {
    body = (await request.json()) as LegacyApprovalBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestId = (body.requestId ?? body.approvalId)?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  const decision: ApprovalDecision | undefined =
    body.decision === "approve" || body.decision === "APPROVE"
      ? "APPROVE"
      : body.decision === "deny" || body.decision === "REJECT"
        ? "REJECT"
        : undefined;

  if (!decision) {
    return NextResponse.json(
      { error: "decision must be APPROVE or REJECT" },
      { status: 400 },
    );
  }

  try {
    const result = await processApprovalResolution({
      requestId,
      decision,
      projectSlug: body.projectSlug,
      kind: body.kind,
    });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = mapApprovalErrorStatus(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
