"use client";

import * as React from "react";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentEvent, ApprovalRequestPayload } from "@/types/cockpit";

interface HitlBannerProps {
  request: AgentEvent | null;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
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
    arguments:
      (event.payload.arguments as Record<string, unknown> | undefined) ??
      undefined,
  };
}

export function HitlBanner({
  request,
  onApprove,
  onDeny,
}: HitlBannerProps): React.JSX.Element | null {
  if (!request) return null;

  const payload = parseApprovalPayload(request);

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
            </p>
            <p className="mt-1 text-sm text-foreground/90">
              {payload.description}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeny(payload.requestId)}
          >
            <ShieldX className="h-3.5 w-3.5" />
            Deny
          </Button>
          <Button
            size="sm"
            onClick={() => onApprove(payload.requestId)}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
