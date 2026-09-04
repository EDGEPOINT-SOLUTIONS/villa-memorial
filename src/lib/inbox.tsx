// ============================================================================
// inbox.tsx — in-memory store for public-site form submissions (register,
// contact, quote request, appointment). Generic (ⓡ): "form", "channel",
// "kind". Staff InquiriesPage shows these as New inquiries so public forms
// round-trip in the demo. No backend.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type InboxFormKind =
  | "Registration"
  | "Contact"
  | "Quote request"
  | "Appointment";

export type InboxForm = {
  id: string;
  kind: InboxFormKind;
  name: string;
  contact: string;
  subject: string;
  note: string;
  date: string;
};

type InboxState = {
  forms: InboxForm[];
  submit: (form: Omit<InboxForm, "id" | "date">) => void;
};

const InboxContext = createContext<InboxState | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const [forms, setForms] = useState<InboxForm[]>([]);
  const seq = useRef(300);

  const submit = useCallback((form: Omit<InboxForm, "id" | "date">) => {
    seq.current += 1;
    const date = new Date().toISOString().slice(0, 10);
    setForms((prev) => [{ ...form, id: `WEB-${seq.current}`, date }, ...prev]);
  }, []);

  const value = useMemo<InboxState>(() => ({ forms, submit }), [forms, submit]);

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxState {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within InboxProvider");
  return ctx;
}
