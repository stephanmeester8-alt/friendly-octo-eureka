import { NextRequest } from "next/server";

import { getGatewayClient, getGatewayEventBus } from "@/lib/gateway";
import type { AgentEvent } from "@/types/cockpit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSseEvent(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();
  const bus = getGatewayEventBus();
  let closed = false;

  request.signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AgentEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      for (const event of bus.getHistory(25).reverse()) {
        send(event);
      }

      const unsubscribe = bus.subscribe(send);

      void getGatewayClient()
        .ensureConnected()
        .catch((error) => {
          send({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            agentName: "System",
            type: "ERROR",
            payload: {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to connect to OpenClaw gateway",
            },
          });
        });

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
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
