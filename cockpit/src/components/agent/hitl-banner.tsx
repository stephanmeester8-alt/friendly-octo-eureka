"use client";

import * as React from "react";
import { Loader2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentEvent, ApprovalRequestPayload } from "@/types/cockpit";

interface HitlBannerProps {
  request: AgentEvent | null;
  projectSlug?: string;
  onResolved?: (input: {
    requestId: string;
    decision: "APPROVE" | "REJECT";
    executionStatus: string;
  }) => void;
}

function parseApprovalPayload(event: AgentEvent): ApprovalRequestPayload {
  return {
    requestId: String(event.payload.requestId ?? event.id),
    toolName: String(event.payload.toolName ?? "unknown"),
    description: String(
      event.payload.description ?? "High-risk action requires approval",
    ),
    riskLevel:
      (event.payload.riskLevel as ApprovalRequestPayload["riskLevel"]) ??
      "high",
    projectSlug:
      typeof event.payload.projectSlug === "string"
        ? event.payload.projectSlug
        : undefined,
    runId:
      typeof event.payload.runId === "string" ? event.payload.runId : undefined,
    source:
      event.payload.source === "gateway" || event.payload.source === "cockpit"
        ? event.payload.source
        : undefined,
    kind: typeof event.payload.kind === "string" ? event.payload.kind : undefined,
    arguments:
      (event.payload.arguments as Record<string, unknown> | undefined) ??
      undefined,
  };
}

export function HitlBanner({
  request,
  projectSlug,
  onResolved,
}: HitlBannerProps): React.JSX.Element | null {
  const [loadingDecision, setLoadingDecision] = React.useState<
    "APPROVE" | "REJECT" | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  if (!request) return null;

  const payload = parseApprovalPayload(request);

  const submitDecision = async (decision: "APPROVE" | "REJECT") => {
    setLoadingDecision(decision);
    setError(null);

    try {
      const response = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: payload.requestId,
          decision,
          projectSlug: projectSlug ?? payload.projectSlug,
          kind: payload.kind,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        executionStatus?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to resolve approval");
      }

      onResolved?.({
        requestId: payload.requestId,
        decision,
        executionStatus: body.executionStatus ?? "IDLE",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setLoadingDecision(null);
    }
  };

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-100">
              Human approval required
            </p>
            <p className="mt-0.5 text-xs text-amber-200/80">
              <span className="font-mono">{payload.toolName}</span>
              {" · "}
              Risk: {payload.riskLevel}
              {payload.source ? ` · ${payload.source}` : ""}
            </p>
            <p className="mt-1 text-sm text-foreground/90">
              {payload.description}
            </p>
            {error ? (
              <p className="mt-1 text-xs text-destructive">{error}</p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingDecision !== null}
            onClick={() => void submitDecision("REJECT")}
          >
            {loadingDecision === "REJECT" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldX className="h-3.5 w-3.5" />
            )}
            Reject
          </Button>
          <Button
            size="sm"
            disabled={loadingDecision !== null}
            onClick={() => void submitDecision("APPROVE")}
          >
            {loadingDecision === "APPROVE" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
