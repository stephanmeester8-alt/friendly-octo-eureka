import { randomUUID } from "node:crypto";

const MAX_HISTORY = 200;

/** @type {import('./types.js').AgentEvent[]} */
const history = [];

/** @type {Set<(event: import('./types.js').AgentEvent) => void>} */
const subscribers = new Set();

/**
 * @param {Omit<import('./types.js').AgentEvent, 'id' | 'timestamp'> & { id?: string, timestamp?: string }} input
 * @returns {import('./types.js').AgentEvent}
 */
export function publishEvent(input) {
  const event = {
    id: input.id ?? randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    agentName: input.agentName,
    type: input.type,
    payload: input.payload ?? {},
  };

  history.push(event);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  for (const subscriber of subscribers) {
    try {
      subscriber(event);
    } catch {
      // ignore subscriber failures
    }
  }

  return event;
}

/** @param {(event: import('./types.js').AgentEvent) => void} listener */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getRecentEvents(limit = 25) {
  return history.slice(-limit);
}
