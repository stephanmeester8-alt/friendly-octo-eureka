"use client";

import * as React from "react";
import {
  AlertTriangle,
  Brain,
  FilePen,
  Radio,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatTimestamp } from "@/lib/utils";
import type { AgentEvent, AgentEventType } from "@/types/cockpit";

const EVENT_ICONS: Record<AgentEventType, React.JSX.Element> = {
  THOUGHT: <Brain className="h-3.5 w-3.5 text-violet-400" />,
  TOOL_CALL: <Wrench className="h-3.5 w-3.5 text-sky-400" />,
  FILE_WRITE: <FilePen className="h-3.5 w-3.5 text-emerald-400" />,
  APPROVAL_REQUEST: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  ERROR: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
};

const EVENT_COLORS: Record<AgentEventType, string> = {
  THOUGHT: "border-violet-500/20 bg-violet-500/5",
  TOOL_CALL: "border-sky-500/20 bg-sky-500/5",
  FILE_WRITE: "border-emerald-500/20 bg-emerald-500/5",
  APPROVAL_REQUEST: "border-amber-500/20 bg-amber-500/5",
  ERROR: "border-red-500/20 bg-red-500/5",
};

function summarizePayload(event: AgentEvent): string {
  const { payload } = event;
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.description === "string") return payload.description;
  if (typeof payload.tool === "string") {
    return `${payload.tool}${payload.path ? ` → ${String(payload.path)}` : ""}`;
  }
  return JSON.stringify(payload);
}

interface AgentMonitorProps {
  onApprovalRequest?: (event: AgentEvent) => void;
}

export function AgentMonitor({
  onApprovalRequest,
}: AgentMonitorProps): React.JSX.Element {
  const [events, setEvents] = React.useState<AgentEvent[]>([]);
  const [connected, setConnected] = React.useState(false);
  const seenApprovalIds = React.useRef(new Set<string>());

  React.useEffect(() => {
    const source = new EventSource("/api/events");

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as AgentEvent;
      setEvents((current) => [event, ...current].slice(0, 200));

      if (event.type === "APPROVAL_REQUEST") {
        const requestId = String(event.payload.requestId ?? event.id);
        if (!seenApprovalIds.current.has(requestId)) {
          seenApprovalIds.current.add(requestId);
          onApprovalRequest?.(event);
        }
      }
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [onApprovalRequest]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Monitor
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Radio
              className={cn(
                "h-3 w-3",
                connected ? "text-emerald-400" : "text-muted-foreground",
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {connected ? "Live SSE" : "Disconnected"}
            </span>
          </div>
        </div>
        <Badge variant="secondary">{events.length} events</Badge>
      </div>

      <ScrollArea className="flex-1 p-2">
        {events.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Waiting for agent telemetry…
          </p>
        ) : null}

        <div className="space-y-2">
          {events.map((event) => (
            <article
              key={event.id}
              className={cn(
                "rounded-md border px-2.5 py-2",
                EVENT_COLORS[event.type],
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {EVENT_ICONS[event.type]}
                  <span className="text-[10px] font-medium text-foreground">
                    {event.agentName}
                  </span>
                </div>
                <time className="text-[10px] text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </time>
              </div>
              <p className="text-[11px] leading-relaxed text-foreground/90">
                {summarizePayload(event)}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                {event.type}
              </p>
            </article>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
