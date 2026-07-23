import { NextResponse } from "next/server";

import { MCP_SERVER_CATALOG } from "@/lib/mcp";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    servers: MCP_SERVER_CATALOG,
  });
}
