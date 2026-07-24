/**
 * SSE frame helpers for the local gateway event stream.
 */

const HEARTBEAT_INTERVAL_MS = Number(
  process.env.SSE_HEARTBEAT_INTERVAL_MS ?? 10_000,
);

export { HEARTBEAT_INTERVAL_MS };

export function encodeConnectHandshake() {
  const payload = {
    status: "connected",
    ts: new Date().toISOString(),
    mode: "local-gateway",
  };
  return `event: connect\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function encodeCommentHeartbeat() {
  return ": heartbeat\n\n";
}

export function encodeNamedHeartbeat() {
  const payload = { ts: new Date().toISOString(), kind: "ping" };
  return `event: heartbeat\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function encodeDataEvent(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Large SSE comment to defeat proxy/tunnel buffering (Cloudflare, ngrok).
 * Many proxies hold the stream until ~2–4 KiB are written.
 */
export function encodeProxyPadding() {
  return `: ${" ".repeat(2048)}\n\n`;
}

function flushResponse(res) {
  if (typeof res.flush === "function") {
    res.flush();
    return;
  }
  res.socket?.uncork?.();
}

/**
 * Attach enterprise SSE keepalive to an Express response.
 * Sends connect handshake immediately, then periodic comment + named heartbeats.
 */
export function attachSseKeepalive(res, options = {}) {
  const intervalMs = options.intervalMs ?? HEARTBEAT_INTERVAL_MS;
  let closed = false;

  const write = (frame) => {
    if (closed) return;
    res.write(frame);
    flushResponse(res);
  };

  if (options.proxyPadding !== false) {
    write(encodeProxyPadding());
  }
  write(encodeConnectHandshake());

  const timer = setInterval(() => {
    write(encodeCommentHeartbeat());
    write(encodeNamedHeartbeat());
  }, intervalMs);

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(timer);
  };

  res.on("close", cleanup);
  res.on("finish", cleanup);

  return { write, cleanup };
}
