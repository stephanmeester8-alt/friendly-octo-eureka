export class ApprovalNotFoundError extends Error {
  constructor(requestId: string) {
    super(`Approval request not found: ${requestId}`);
    this.name = "ApprovalNotFoundError";
  }
}

export class ApprovalNotPendingError extends Error {
  constructor(requestId: string) {
    super(`Approval request is no longer pending: ${requestId}`);
    this.name = "ApprovalNotPendingError";
  }
}

export class ApprovalProjectMismatchError extends Error {
  constructor() {
    super("projectSlug does not match approval request");
    this.name = "ApprovalProjectMismatchError";
  }
}

export function mapApprovalErrorStatus(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof ApprovalNotFoundError) {
    return { status: 404, message: error.message };
  }
  if (error instanceof ApprovalNotPendingError) {
    return { status: 409, message: error.message };
  }
  if (error instanceof ApprovalProjectMismatchError) {
    return { status: 403, message: error.message };
  }

  return {
    status: 502,
    message: error instanceof Error ? error.message : "Failed to resolve approval",
  };
}
