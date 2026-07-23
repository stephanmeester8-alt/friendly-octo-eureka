import type { AgentEvent } from "@/types/cockpit";

type Listener = (event: AgentEvent) => void;

const MAX_BUFFERED_EVENTS = 200;

class GatewayEventBus {
  private listeners = new Set<Listener>();
  private history: AgentEvent[] = [];

  publish(event: AgentEvent): void {
    this.history = [event, ...this.history].slice(0, MAX_BUFFERED_EVENTS);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getHistory(limit = 50): AgentEvent[] {
    return this.history.slice(0, limit);
  }
}

declare global {
  var __cockpitGatewayEventBus: GatewayEventBus | undefined;
}

export function getGatewayEventBus(): GatewayEventBus {
  if (!globalThis.__cockpitGatewayEventBus) {
    globalThis.__cockpitGatewayEventBus = new GatewayEventBus();
  }
  return globalThis.__cockpitGatewayEventBus;
}
