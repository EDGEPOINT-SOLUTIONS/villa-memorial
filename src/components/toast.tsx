// Toast notifications (deterministic action feedback).

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "default" | "success" | "danger";
type ToastItem = { id: number; message: string; tone: Tone };

type ToastApi = { toast: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: Tone = "default") => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.tone !== "default" ? ` toast--${t.tone}` : ""}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
