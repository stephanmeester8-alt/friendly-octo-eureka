import { NextRequest, NextResponse } from "next/server";

import { getGatewayClient } from "@/lib/gateway";

export const runtime = "nodejs";

interface ApprovalResolveBody {
  approvalId: string;
  decision: "approve" | "deny";
  kind?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ApprovalResolveBody;

  try {
    body = (await request.json()) as ApprovalResolveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.approvalId?.trim()) {
    return NextResponse.json(
      { error: "approvalId is required" },
      { status: 400 },
    );
  }

  if (body.decision !== "approve" && body.decision !== "deny") {
    return NextResponse.json(
      { error: "decision must be approve or deny" },
      { status: 400 },
    );
  }

  try {
    await getGatewayClient().resolveApproval({
      approvalId: body.approvalId,
      decision: body.decision,
      kind: body.kind,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve approval";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
