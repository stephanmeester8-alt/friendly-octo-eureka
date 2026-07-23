import { NextResponse } from "next/server";

import {
  AVAILABLE_MODELS,
  TASK_TYPE_DEFINITIONS,
} from "@/lib/model-catalog";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    models: AVAILABLE_MODELS,
    taskTypes: TASK_TYPE_DEFINITIONS,
  });
}
