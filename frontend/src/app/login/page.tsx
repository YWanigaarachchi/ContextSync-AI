"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, clearError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      router.push("/chat");
    } catch {
      // Error is handled by auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container} className="bg-radial bg-grid">
      <div style={styles.card} className="glass animate-scaleIn">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoIcon}>⚡</div>
          <h1 style={styles.title}>
            Welcome back to{" "}
            <span className="gradient-text">ContextSync</span>
          </h1>
          <p style={styles.subtitle}>Sign in to access your knowledge base</p>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.error} className="animate-fadeIn">
            <span>⚠️</span> {error}
            <button onClick={clearError} style={styles.errorClose}>✕</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
              id="login-email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="input"
              id="login-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "8px" }}
            id="login-submit"
          >
            {isLoading ? (
              <>
                <span style={styles.spinner} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "40px",
    borderRadius: "var(--radius-xl)",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  logoIcon: {
    fontSize: "40px",
    marginBottom: "16px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    marginBottom: "8px",
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 14px",
    background: "var(--error-bg)",
    border: "1px solid rgba(248, 113, 113, 0.2)",
    borderRadius: "var(--radius-md)",
    color: "var(--error)",
    fontSize: "13px",
    marginBottom: "16px",
  },
  errorClose: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "var(--error)",
    cursor: "pointer",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
  },
  footer: {
    textAlign: "center" as const,
    fontSize: "13px",
    color: "var(--text-secondary)",
    marginTop: "24px",
  },
  link: {
    color: "var(--accent-secondary)",
    fontWeight: 500,
  },
};
