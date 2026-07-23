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

## Relation to Cockpit

The Next.js cockpit in `cockpit/` uses an **OpenClaw WebSocket** protocol on port 18789 by default. This gateway is a **REST+SSE alternative** intended for external cloud UIs. To use both, run this gateway on a different port or replace the OpenClaw gateway when REST is preferred.
