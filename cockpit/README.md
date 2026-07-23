# Local Workspace Cockpit

Next.js dashboard for local-first agent orchestration with OpenClaw gateway integration, project management, and HITL guardrails.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

## Model routing

Per-project model configuration is stored in `workspace/projects/<slug>/metadata.json`:

- `agentConfig.primaryModel` — default model for Auto task type
- `agentConfig.modelByTaskType` — optional overrides per task (`architecture`, `code`, `review`, `docs`)

The prompt bar supports task type selection and optional auto-detection from the prompt text. Resolved model is sent to the OpenClaw gateway via the `model` RPC param.

```bash
npm run test:model-routing
```

## End-to-end workflow test (Option B)

Validates the full loop without a real OpenClaw install:

```text
Prompt → Gateway → Interceptor → SSE → HITL Approve → Files on disk → Explorer API
```

```bash
npm run build
npm run test:e2e
```

This will:

1. Start `scripts/mock-openclaw-gateway.mjs` on `127.0.0.1:18789`
2. Start the cockpit (`next start`)
3. Trigger an agent run on `demo-project`
4. Verify proxy hard-halt: no artifacts on disk until `POST /api/approval`
5. Approve via `POST /api/approval` (releases `tool.execution.release` to the gateway)
6. Confirm `src/cli_tool.py` and `docs/CLI_SPEC.md` appear in `/api/files`

### With a real OpenClaw gateway

```bash
openclaw gateway --port 18789
AGENT_GATEWAY_URL=http://127.0.0.1:18789 npm run dev
```

Then submit a prompt from the UI on any project under `workspace/projects/`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run mock-gateway` | Standalone OpenClaw gateway mock |
| `npm run test:e2e` | Full automated workflow test |
