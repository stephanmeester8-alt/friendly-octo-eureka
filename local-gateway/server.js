import express from "express";

import { resolveApproval, startAgentRun } from "./lib/agent.js";
import { HOST, PORT, PROJECTS_ROOT, WORKSPACE_ROOT } from "./lib/config.js";
import { getRecentEvents, publishEvent, subscribe } from "./lib/events.js";
import { attachSseKeepalive, encodeDataEvent, encodeInitialBurst } from "./lib/sse.js";
import {
  listProjects,
  NotFoundError,
  PathTraversalError,
  readProjectFile,
  readProjectTree,
  writeProjectFile,
} from "./lib/filesystem.js";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control",
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Cache-Control");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

function sendError(res, error, fallbackStatus = 500) {
  if (error instanceof PathTraversalError) {
    res.status(403).json({ error: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  const status = Number(error?.statusCode) || fallbackStatus;
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(status).json({ error: message });
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: "local-gateway",
    host: HOST,
    port: PORT,
    workspaceRoot: WORKSPACE_ROOT,
    projectsRoot: PROJECTS_ROOT,
  });
});

app.get("/projects", async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json({ projects });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/projects/:slug/tree", async (req, res) => {
  try {
    const tree = await readProjectTree(req.params.slug);
    res.json(tree);
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/projects/:slug/file", async (req, res) => {
  try {
    const filePath = String(req.query.path ?? "").trim();
    if (!filePath) {
      res.status(400).json({ error: "Query parameter 'path' is required" });
      return;
    }
    const file = await readProjectFile(req.params.slug, filePath);
    res.json(file);
  } catch (error) {
    sendError(res, error);
  }
});

app.put("/projects/:slug/file", async (req, res) => {
  try {
    const filePath = String(req.body?.path ?? req.query.path ?? "").trim();
    const content = req.body?.content;

    if (!filePath) {
      res.status(400).json({ error: "Field 'path' is required" });
      return;
    }
    if (typeof content !== "string") {
      res.status(400).json({ error: "Field 'content' must be a string" });
      return;
    }

    const result = await writeProjectFile(
      req.params.slug,
      filePath,
      content,
      req.body?.createDirectories !== false,
    );

    publishEvent({
      agentName: "Filesystem",
      type: "FILE_WRITE",
      payload: {
        path: `${req.params.slug}/${result.path}`,
        bytesWritten: result.bytesWritten,
        projectSlug: req.params.slug,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/projects/:slug/run", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt ?? "").trim();
    if (!prompt) {
      res.status(400).json({ error: "Field 'prompt' is required" });
      return;
    }

    const result = await startAgentRun(req.params.slug, req.body ?? {});
    res.status(202).json(result);
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/approvals/:id", async (req, res) => {
  try {
    const decision = req.body?.decision ?? req.body?.approve;
    if (!decision) {
      res.status(400).json({ error: "Field 'decision' is required (APPROVE or REJECT)" });
      return;
    }

    const result = await resolveApproval(req.params.id, {
      decision: typeof decision === "boolean" ? (decision ? "APPROVE" : "REJECT") : String(decision),
      projectSlug: req.body?.projectSlug,
    });

    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/events", (req, res) => {
  try {
    // One-shot probe for tunnel diagnostics (returns immediately).
    if (req.query.probe === "1") {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.write(encodeInitialBurst());
      res.end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Content-Encoding", "identity");
    res.socket?.setNoDelay?.(true);
    res.flushHeaders?.();

    const { write, cleanup } = attachSseKeepalive(res);

    const send = (event) => {
      write(encodeDataEvent(event));
    };

    for (const event of getRecentEvents(25)) {
      send(event);
    }

    const unsubscribe = subscribe(send);

    req.on("close", () => {
      unsubscribe();
      cleanup();
      res.end();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SSE stream failed";
    if (!res.headersSent) {
      res.status(500).json({ error: message });
      return;
    }
    res.end();
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, HOST, () => {
  console.log(`[local-gateway] listening on http://${HOST}:${PORT}`);
  console.log(`[local-gateway] workspace root: ${WORKSPACE_ROOT}`);
  console.log(`[local-gateway] projects root: ${PROJECTS_ROOT}`);
  publishEvent({
    agentName: "System",
    type: "THOUGHT",
    payload: { message: "Local gateway started" },
  });
});
