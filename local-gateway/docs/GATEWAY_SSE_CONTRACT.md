# Gateway SSE Contract (Enterprise)

Canonical contract between the **local-gateway** (`GET /events`) and cloud cockpit clients (Lovable).

## Endpoint

```
GET {GATEWAY_URL}/events
Accept: text/event-stream
```

**Not** `/projects/:slug/events` — events are gateway-global.

## Frame sequence on connect

1. **Connect handshake** (immediate, named event):
   ```
   event: connect
   data: {"status":"connected","ts":"2026-07-24T00:00:00.000Z","mode":"local-gateway"}
   ```

2. **History replay** (optional, up to 25 recent events):
   ```
   data: {"id":"...","timestamp":"...","agentName":"...","type":"THOUGHT","payload":{...}}
   ```

3. **Keepalive** every 10s (both forms):
   ```
   : heartbeat

   event: heartbeat
   data: {"ts":"2026-07-24T00:00:10.000Z","kind":"ping"}
   ```

4. **Live agent events** (as they occur):
   ```
   data: {"id":"...","type":"APPROVAL_REQUEST",...}
   ```

## Client liveness rules (enterprise)

| Signal | Resets stall timer? | Updates footer ♥? |
|--------|--------------------|--------------------|
| `EventSource.onopen` | ✅ | ✅ (bootstrap timestamp) |
| `event: connect` | ✅ | ✅ |
| `event: heartbeat` | ✅ | ✅ |
| Comment `: heartbeat` | ✅ (if parsed) | ✅ |
| `onmessage` (any data frame) | ✅ | ✅ |
| `/health` poll success (20s) | ✅ tunnel alive | optional |

**Stall window:** 30s with no activity → `stalled` → reconnect with exponential backoff (1→10s) + jitter (0–1s).

**Visibility:** `document.visibilitychange` → visible → forced reconnect.

## Poll fallback (Cloudflare quick tunnels)

Cloudflare **trycloudflare.com** quick tunnels often return **0 bytes** for long-lived `text/event-stream` responses while `/health` works. Use JSON polling instead:

```
GET {GATEWAY_URL}/events/poll?since=2026-07-24T01:00:00.000Z
```

Response:

```json
{
  "transport": "poll",
  "serverTime": "2026-07-24T01:30:00.000Z",
  "events": [ /* AgentEvent[] newer than since */ ]
}
```

Recommended client strategy:

1. Try `EventSource(/events)` for local dev or ngrok
2. On stall / 0 bytes / tunnel host → fall back to `poll` every 2–5s
3. Keep `/health` poll every 20s for zombie detection

Diagnostic:

```
GET {GATEWAY_URL}/events?probe=json
```

## AgentEvent shape

```typescript
interface AgentEvent {
  id: string;
  timestamp: string;       // ISO-8601
  agentName: string;
  type: AgentEventType;
  payload: Record<string, unknown>;
}

type AgentEventType =
  | "THOUGHT"
  | "TOOL_CALL"
  | "FILE_WRITE"
  | "APPROVAL_REQUEST"
  | "UNAUTHORIZED_TOOL"
  | "EXECUTION_STATUS"
  | "ERROR";
```

## Synthetic / audit events (client-side)

Clients may emit local-only events for UX when SSE is quiet:

| Event | When |
|-------|------|
| `TOOL_CALL` (synthetic) | After `POST /projects/:slug/run` ack |
| `approval.decide` (audit) | After `POST /projects/:slug/approvals/:id` |

These are **client-local** unless the gateway also publishes them.

## Health poll (parallel channel)

```
GET {GATEWAY_URL}/health
```

- Interval: 20s recommended
- Timeout: 5s
- Detects **zombie SSE** (socket open but tunnel dead)
- On failure: trigger reconnect independent of SSE stall timer

Expected response:
```json
{"status":"ok","mode":"local-gateway","host":"127.0.0.1","port":18789}
```

## Gateway env

| Variable | Default | Description |
|----------|---------|-------------|
| `SSE_HEARTBEAT_INTERVAL_MS` | `10000` | Keepalive interval |

## Reference implementation

- **Server:** `local-gateway/lib/sse.js`, `local-gateway/server.js`
- **Client:** `local-gateway/reference/useGatewaySse.ts`

## Verification

```bash
curl -N --max-time 12 http://127.0.0.1:18789/events
```

First lines must include `event: connect`. Within 12s you should see `: heartbeat` and `event: heartbeat`.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Footer `gateway ?` | Old gateway without handshake | `git pull` + restart `npm start` |
| 0 bytes via tunnel, works locally | Cloudflare quick tunnel blocks SSE streaming | Use `GET /events/poll?since=...` fallback; SSE works locally + ngrok |
| 0 events, OPEN status | SSE URL wrong | Use `/events` not `/projects/.../events` |
| Stall after 30s idle | No keepalive | Upgrade gateway; check tunnel buffers |
| Reconnect loop | Tunnel URL changed | Update `GATEWAY_URL` after cloudflared restart |
