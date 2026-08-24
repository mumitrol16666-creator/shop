"use client";

import Link from "next/link";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type AdminAccessContextValue = {
  logout: () => Promise<void>;
};

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);
const TOKEN_KEY = "maestro_admin_token";

export function useAdminAccess() {
  const value = useContext(AdminAccessContext);
  if (!value) throw new Error("useAdminAccess must be used inside AdminAccessGate");
  return value;
}

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "guest" | "authenticated">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const storedToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) || "" : "";
    const headers: Record<string, string> = storedToken ? { "x-admin-token": storedToken } : {};

    fetch("/api/admin/session", {
      credentials: "same-origin",
      cache: "no-store",
      headers,
    })
      .then((response) => {
        if (active) {
          if (response.ok) {
            setStatus("authenticated");
          } else {
            if (storedToken) localStorage.removeItem(TOKEN_KEY);
            setStatus("guest");
          }
        }
      })
      .catch(() => {
        if (active) setStatus("guest");
      });
    return () => {
      active = false;
    };
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!password.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; token?: string };
      if (!response.ok) throw new Error(data.error || "Неверный пароль");
      if (data.token && typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      setPassword("");
      setStatus("authenticated");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Неверный пароль");
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    setStatus("guest");
  };

  if (status === "checking") {
    return (
      <main className="admin-auth-screen" aria-live="polite">
        <div className="admin-auth-card">
          <div className="brand-mark large">M</div>
          <h2>Проверяем доступ…</h2>
        </div>
      </main>
    );
  }

  if (status === "guest") {
    return (
      <main className="admin-auth-screen">
        <div className="admin-auth-card">
          <div className="brand-mark large">M</div>
          <h2>Панель закупщика Maestro</h2>
          <p>Введите пароль администратора. Вход сохраняется на этом устройстве.</p>
          <form onSubmit={login} className="admin-auth-form">
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Введите пароль"
                autoComplete="current-password"
                autoFocus
              />
            </label>
            {error && <div className="admin-auth-error">{error}</div>}
            <div className="admin-auth-actions">
              <Link href="/" className="secondary-button">← На витрину</Link>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? "Проверяем…" : "Войти в панель"}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AdminAccessContext.Provider value={{ logout }}>
      {children}
    </AdminAccessContext.Provider>
  );
}
