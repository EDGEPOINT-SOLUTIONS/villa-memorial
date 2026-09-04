// Small shared helpers for public contact-style forms (demo). No backend: on
// submit, the entry is pushed to the in-memory inbox (visible in staff
// Inquiries) and a success panel is shown in place of the form.

import { useState } from "react";
import { useInbox, type InboxFormKind } from "../lib/inbox";

export function usePublicForm(kind: InboxFormKind) {
  const { submit } = useInbox();
  const [sent, setSent] = useState(false);

  function send(input: { name: string; contact: string; subject: string; note: string }) {
    submit({ kind, name: input.name, contact: input.contact, subject: input.subject, note: input.note });
    setSent(true);
  }

  return { sent, send };
}
