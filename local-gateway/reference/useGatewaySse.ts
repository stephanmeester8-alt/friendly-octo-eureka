/**
 * Enterprise SSE client for Lovable / cloud cockpit UIs.
 *
 * Copy into your frontend (e.g. src/hooks/useGatewaySse.ts) and wire to GATEWAY_URL.
 *
 * Features:
 * - Adaptive liveness: ANY inbound frame resets stall timer
 * - Open-state bootstrap: footer heartbeat timestamp on connect
 * - Exponential backoff with jitter (1s → 10s)
 * - Forced reconnect on visibilitychange and stall (>30s idle)
 * - Recognizes comment heartbeats, named `heartbeat`, and `connect` events
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type SseConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "stalled"
  | "error";

export interface AgentEvent {
  id: string;
  timestamp: string;
  agentName: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface UseGatewaySseOptions {
  gatewayUrl: string;
  stallWindowMs?: number;
  minBackoffMs?: number;
  maxBackoffMs?: number;
  eventBufferSize?: number;
  enabled?: boolean;
  onEvent?: (event: AgentEvent) => void;
}

export interface UseGatewaySseResult {
  status: SseConnectionStatus;
  events: AgentEvent[];
  lastActivityAt: Date | null;
  reconnect: () => void;
}

function withJitter(delayMs: number): number {
  return delayMs + Math.floor(Math.random() * 1000);
}

export function useGatewaySse(options: UseGatewaySseOptions): UseGatewaySseResult {
  const {
    gatewayUrl,
    stallWindowMs = 30_000,
    minBackoffMs = 1_000,
    maxBackoffMs = 10_000,
    eventBufferSize = 500,
    enabled = true,
    onEvent,
  } = options;

  const [status, setStatus] = useState<SseConnectionStatus>("idle");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<Date | null>(null);

  const sourceRef = useRef<EventSource | null>(null);
  const backoffAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const touchActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    setLastActivityAt(new Date(now));
    setStatus((current) => (current === "stalled" ? "open" : current));
  }, []);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (stallTimerRef.current) {
      clearInterval(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (connectFn: () => void) => {
      const attempt = backoffAttemptRef.current;
      const base = Math.min(maxBackoffMs, minBackoffMs * 2 ** attempt);
      const delay = withJitter(base);
      backoffAttemptRef.current = attempt + 1;
      setStatus("connecting");
      reconnectTimerRef.current = setTimeout(connectFn, delay);
    },
    [maxBackoffMs, minBackoffMs],
  );

  const ingestAgentEvent = useCallback(
    (event: AgentEvent) => {
      touchActivity();
      setEvents((current) => [event, ...current].slice(0, eventBufferSize));
      onEventRef.current?.(event);
    },
    [eventBufferSize, touchActivity],
  );

  const connect = useCallback(() => {
    if (!enabled || !gatewayUrl) return;

    clearTimers();
    sourceRef.current?.close();

    const url = `${gatewayUrl.replace(/\/$/, "")}/events`;
    setStatus("connecting");

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      backoffAttemptRef.current = 0;
      touchActivity();
      setStatus("open");
    };

    source.onerror = () => {
      setStatus("error");
      source.close();
      scheduleReconnect(connect);
    };

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as AgentEvent;
        ingestAgentEvent(event);
      } catch {
        touchActivity();
      }
    };

    source.addEventListener("connect", () => {
      touchActivity();
      setStatus("open");
    });

    source.addEventListener("heartbeat", () => {
      touchActivity();
    });

    stallTimerRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current > stallWindowMs) {
        setStatus("stalled");
        source.close();
        scheduleReconnect(connect);
      }
    }, 2_000);
  }, [
    clearTimers,
    enabled,
    gatewayUrl,
    ingestAgentEvent,
    scheduleReconnect,
    stallWindowMs,
    touchActivity,
  ]);

  const reconnect = useCallback(() => {
    backoffAttemptRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      sourceRef.current?.close();
      setStatus("idle");
      return;
    }

    connect();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimers();
      sourceRef.current?.close();
      setStatus("idle");
    };
  }, [clearTimers, connect, enabled, reconnect]);

  return { status, events, lastActivityAt, reconnect };
}
