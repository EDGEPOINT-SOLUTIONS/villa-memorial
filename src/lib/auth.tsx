// ============================================================================
// Demo-only auth: hard-coded credentials checked in the browser. NOT real
// security — this prototype has no backend. A real deployment uses httpOnly
// cookies + the identity-access service (see web/AGENTS.md rule #3).
// ============================================================================

import { createContext, useContext, useState, type ReactNode } from "react";

const DEMO_EMAIL = "admin@gmail.com";
const DEMO_PASSWORD = "admin123";

type AuthState = {
  authed: boolean;
  email: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "inmemoriam-demo-auth";

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(readStored);
  const [email, setEmail] = useState<string | null>(
    readStored() ? DEMO_EMAIL : null,
  );

  function login(inputEmail: string, password: string): boolean {
    const ok =
      inputEmail.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
    if (ok) {
      setAuthed(true);
      setEmail(inputEmail.trim());
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    return ok;
  }

  function logout() {
    setAuthed(false);
    setEmail(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <AuthContext.Provider value={{ authed, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
