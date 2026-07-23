# Local Workspace Gateway

Standalone **REST + SSE** gateway for cloud-based agent cockpit UIs (e.g. Lovable). Runs on `http://127.0.0.1:18789` and bridges your local `workspace/projects/` folder to remote clients.

## Quick start

```bash
cd local-gateway
npm install
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

Health check:

```bash
curl http://127.0.0.1:18789/health
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` / `GATEWAY_PORT` | `18789` | HTTP port |
| `WORKSPACE_ROOT` | `../workspace` (repo root) | Workspace root containing `projects/` |

Example:

```bash
WORKSPACE_ROOT=/path/to/workspace npm start
```

## API

All responses include permissive CORS headers (`Access-Control-Allow-Origin: *`).

### `GET /health`

```json
{
  "status": "ok",
  "mode": "local-gateway",
  "host": "127.0.0.1",
  "port": 18789,
  "workspaceRoot": "/abs/path/workspace",
  "projectsRoot": "/abs/path/workspace/projects"
}
```

### `GET /projects`

```json
{
  "projects": [
    {
      "id": "demo-project",
      "slug": "demo-project",
      "name": "Demo Project",
      "description": "...",
      "status": "ACTIVE",
      "updatedAt": "2026-07-23T12:00:00.000Z"
    }
  ]
}
```

### `GET /projects/:slug/tree`

```json
{
  "root": "/abs/path/workspace/projects/demo-project",
  "project": {
    "name": "demo-project",
    "path": "demo-project",
    "kind": "directory",
    "children": [ ... ]
  }
}
```

### `GET /projects/:slug/file?path=src/index.ts`

```json
{
  "path": "src/index.ts",
  "content": "...",
  "size": 123,
  "modifiedAt": "2026-07-23T12:00:00.000Z"
}
```

### `PUT /projects/:slug/file`

```json
{
  "path": "src/example.txt",
  "content": "hello",
  "createDirectories": true
}
```

### `POST /projects/:slug/run`

```json
{
  "prompt": "Generate a CLI tool",
  "agentName": "Local Agent",
  "taskType": "code"
}
```

Response `202`:

```json
{
  "taskId": "uuid",
  "runId": "uuid",
  "status": "RUNNING",
  "model": "local/dummy-agent",
  "taskType": "code"
}
```

Starts a background dummy agent that emits SSE events and requests HITL approval for a high-risk tool.

### `POST /approvals/:id`

```json
{
  "decision": "APPROVE",
  "projectSlug": "demo-project"
}
```

`decision`: `APPROVE` or `REJECT` (also accepts `approve: true/false`).

### `GET /events` (SSE)

Server-Sent Events stream of `AgentEvent` JSON frames:

```json
{
  "id": "uuid",
  "timestamp": "2026-07-23T12:00:00.000Z",
  "agentName": "Local Agent",
  "type": "THOUGHT",
  "payload": { "message": "..." }
}
```

Event types: `THOUGHT`, `TOOL_CALL`, `FILE_WRITE`, `APPROVAL_REQUEST`, `EXECUTION_STATUS`, `ERROR`.

## Example workflow

```bash
# 1. Start gateway
npm start

# 2. List projects
curl http://127.0.0.1:18789/projects

# 3. Start agent run
curl -X POST http://127.0.0.1:18789/projects/demo-project/run \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create output file"}'

# 4. Watch SSE (separate terminal)
curl -N http://127.0.0.1:18789/events

# 5. Approve HITL (use requestId from APPROVAL_REQUEST event)
curl -X POST http://127.0.0.1:18789/approvals/<requestId> \
  -H "Content-Type: application/json" \
  -d '{"decision":"APPROVE","projectSlug":"demo-project"}'
```

## Security notes

- Binds to loopback by default (`127.0.0.1`).
- File paths are sandboxed under `workspace/projects/<slug>/`.
- CORS is fully open for cloud UI integration; use a tunnel (ngrok, Cloudflare Tunnel) with care when exposing locally.

## Lovable integration (cloud UI → local machine)

Lovable apps run on **HTTPS** in the cloud. Your local gateway runs on **HTTP** (`127.0.0.1`). Browsers block mixed content (HTTPS page calling `http://127.0.0.1`), so you need a **tunnel** that exposes your local port as HTTPS.

### Step 1 — Start the local gateway

```bash
cd local-gateway
npm install
npm start
```

Verify: `curl http://127.0.0.1:18789/health`

### Step 2 — Expose port 18789 via HTTPS tunnel

**Option A: ngrok**

```bash
ngrok http 18789
```

Copy the forwarding URL, e.g. `https://abc123.ngrok-free.app`

**Option B: Cloudflare Tunnel**

```bash
cloudflared tunnel --url http://127.0.0.1:18789
```

Copy the generated `https://….trycloudflare.com` URL.

### Step 3 — Configure your Lovable app

In your Lovable project, set the gateway base URL to the **tunnel URL** (not `127.0.0.1`):

```
https://abc123.ngrok-free.app
```

Example env in Lovable / Vite:

```env
VITE_GATEWAY_URL=https://abc123.ngrok-free.app
```

### Step 4 — Call the gateway from React

```typescript
const GATEWAY = import.meta.env.VITE_GATEWAY_URL;

// Health check
const health = await fetch(`${GATEWAY}/health`).then((r) => r.json());

// List projects
const { projects } = await fetch(`${GATEWAY}/projects`).then((r) => r.json());

// Read file
const file = await fetch(
  `${GATEWAY}/projects/demo-project/file?path=src/index.ts`,
).then((r) => r.json());

// Start agent
await fetch(`${GATEWAY}/projects/demo-project/run`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "Build a CLI tool" }),
});

// Live events (SSE)
const source = new EventSource(`${GATEWAY}/events`);
source.onmessage = (event) => {
  const agentEvent = JSON.parse(event.data);
  console.log(agentEvent.type, agentEvent.payload);
};

// HITL approval
await fetch(`${GATEWAY}/approvals/${requestId}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ decision: "APPROVE", projectSlug: "demo-project" }),
});
```

### Endpoint map for Lovable

| UI action | HTTP call |
|-----------|-----------|
| Connection test | `GET {GATEWAY}/health` |
| Project list | `GET {GATEWAY}/projects` |
| File explorer | `GET {GATEWAY}/projects/{slug}/tree` |
| Open file | `GET {GATEWAY}/projects/{slug}/file?path=…` |
| Save file | `PUT {GATEWAY}/projects/{slug}/file` |
| Run agent | `POST {GATEWAY}/projects/{slug}/run` |
| Live monitor | `GET {GATEWAY}/events` (EventSource) |
| Approve tool | `POST {GATEWAY}/approvals/{id}` |

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Mixed content blocked | Use tunnel HTTPS URL, not `http://127.0.0.1` |
| CORS error | Gateway already sends `Access-Control-Allow-Origin: *` — check tunnel URL |
| SSE disconnects | ngrok free tier may timeout long streams; retry or use Cloudflare |
| 404 on `/api/...` | This gateway uses `/projects`, `/events` — not Next.js `/api/*` paths |
| Tunnel works but empty projects | Set `WORKSPACE_ROOT` to your local `workspace` folder before `npm start` |

### Security reminder

The tunnel exposes your local filesystem bridge to the internet. Stop ngrok/cloudflared when not in use. Do not share the tunnel URL publicly.


The Next.js cockpit in `cockpit/` uses an **OpenClaw WebSocket** protocol on port 18789 by default. This gateway is a **REST+SSE alternative** intended for external cloud UIs. To use both, run this gateway on a different port or replace the OpenClaw gateway when REST is preferred.
