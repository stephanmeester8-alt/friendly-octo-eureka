import { NextRequest } from "next/server";

import type { AgentEvent } from "@/types/cockpit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EVENTS: Omit<AgentEvent, "id" | "timestamp">[] = [
  {
    agentName: "ArchitectAgent",
    type: "THOUGHT",
    payload: {
      message: "Analyzing project structure under workspace/projects/",
    },
  },
  {
    agentName: "CoderAgent",
    type: "TOOL_CALL",
    payload: {
      tool: "read_file",
      path: "demo-project/src/index.ts",
    },
  },
  {
    agentName: "CoderAgent",
    type: "APPROVAL_REQUEST",
    payload: {
      requestId: "apr-demo-001",
      toolName: "shell_exec",
      description: "Run npm test in demo-project",
      riskLevel: "high",
    },
  },
];

function createEvent(
  partial: Omit<AgentEvent, "id" | "timestamp">,
): AgentEvent {
  return {
    ...partial,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();
  let eventIndex = 0;
  let closed = false;

  request.signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AgentEvent) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      send(
        createEvent({
          agentName: "System",
          type: "THOUGHT",
          payload: { message: "Agent monitor connected via SSE" },
        }),
      );

      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval);
          controller.close();
          return;
        }

        const template = DEMO_EVENTS[eventIndex % DEMO_EVENTS.length];
        send(createEvent(template));
        eventIndex += 1;
      }, 4000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
