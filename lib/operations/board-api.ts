/**
 * Browser side of the ops board's two writes: the calls the case screen makes to the
 * app's own BFF routes under `/api/cases/*`. Client-safe by construction — no service
 * URL and no token ever reaches the browser; the BFF owns both.
 *
 * Both calls throw the shared `ApiError` carrying the BFF's (or the service's) own
 * message, so a refused write is shown verbatim instead of being flattened into "something
 * went wrong". Nothing here retries or interprets: whether a move is legal is
 * funeral-cases' answer, and the caller re-reads the case after every outcome.
 */
import { ApiError } from "@/lib/api-client/api-error";
import type { CaseStage, CaseTaskStatus } from "@/lib/operations/case-board";

function errorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const message = (payload as { error: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function send(path: string, method: "PATCH" | "POST", body: unknown, fallback: string) {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the operations service.", 0);
  }
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(errorMessage(payload, fallback), res.status);
  }
}

/** Sets one task's status. Immediate by design — a task tick needs no confirmation. */
export function setTaskStatus(
  caseNumber: string,
  taskId: string,
  status: CaseTaskStatus,
): Promise<void> {
  return send(
    `/api/cases/${encodeURIComponent(caseNumber)}/tasks/${encodeURIComponent(taskId)}`,
    "PATCH",
    { status },
    "The task was not changed.",
  );
}

/** Moves a case to another stage. The caller confirms the target before calling this. */
export function moveCaseStage(caseNumber: string, stage: CaseStage): Promise<void> {
  return send(
    `/api/cases/${encodeURIComponent(caseNumber)}/stage`,
    "POST",
    { stage },
    "The stage was not changed.",
  );
}
