"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/kit/status-chip";
import {
  NOTICE_STATE_LABEL,
  shortDueDate,
  type NoticeState,
  type ScheduledNotice,
} from "@/lib/lifecycle";

const STATE_TONE: Record<NoticeState, StatusTone> = {
  scheduled: "neutral",
  due: "warning",
  sent: "success",
  missed: "danger",
};

/**
 * The notices the app has scheduled for one record, and the office's hand-off.
 *
 * A notice's state is derived from the record and the day — never stored as a
 * claim. "Ready to send" means the fire date has arrived; "Window passed" means
 * the due date went by unsent (an honest word, not a fabricated "Sent"). The only
 * write here records that the office actually handed it off.
 */
export function NoticeList({
  engagementId,
  notices,
}: {
  engagementId: string;
  notices: ScheduledNotice[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markSent(notice: ScheduledNotice) {
    setBusy(notice.id);
    setError(null);
    try {
      const res = await fetch("/api/staff/lifecycle/notices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          engagement_id: engagementId,
          template_id: notice.template_id,
          seq: notice.seq,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "The notice could not be recorded.");
        return;
      }
      router.refresh();
    } catch {
      setError("The notice could not be recorded.");
    } finally {
      setBusy(null);
    }
  }

  if (notices.length === 0) {
    return (
      <p className="text-sm text-muted" style={{ margin: 0 }}>
        No open installment has a notice scheduled. Add a notice rule, or settle the record.
      </p>
    );
  }

  return (
    <div className="stack-2">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="table-wrapper" tabIndex={0}>
        <table className="table">
          <caption className="visually-hidden">Scheduled notices</caption>
          <thead>
            <tr>
              <th scope="col">Installment</th>
              <th scope="col">Notice</th>
              <th scope="col">Fires</th>
              <th scope="col">Due</th>
              <th scope="col">State</th>
              <th scope="col">Message</th>
              <th scope="col">
                <span className="visually-hidden">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {notices.map((notice) => (
              <tr key={notice.id}>
                <th scope="row">#{notice.seq}</th>
                <td>{notice.label}</td>
                <td>{shortDueDate(notice.fire_on)}</td>
                <td>{shortDueDate(notice.due_on)}</td>
                <td>
                  <StatusChip tone={STATE_TONE[notice.state]}>
                    {NOTICE_STATE_LABEL[notice.state]}
                  </StatusChip>
                </td>
                <td>{notice.message}</td>
                <td className="table__numeric">
                  {notice.state === "due" || notice.state === "missed" ? (
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={busy === notice.id}
                      onClick={() => markSent(notice)}
                    >
                      Mark sent
                    </Button>
                  ) : notice.state === "sent" ? (
                    <span className="text-sm text-muted">Handed off</span>
                  ) : (
                    <span className="text-sm text-muted">Waiting</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
