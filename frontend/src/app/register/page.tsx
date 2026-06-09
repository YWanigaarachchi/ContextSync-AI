"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, error, clearError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await register(email, username, password);
      router.push("/chat");
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div style={styles.container} className="bg-radial bg-grid">
      <div style={styles.card} className="glass animate-scaleIn">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoIcon}>⚡</div>
          <h1 style={styles.title}>
            Join <span className="gradient-text">ContextSync</span>
          </h1>
          <p style={styles.subtitle}>Create an account to get started</p>
        </div>

        {/* Error */}
        {displayError && (
          <div style={styles.error} className="animate-fadeIn">
            <span>⚠️</span> {displayError}
            <button onClick={() => { clearError(); setLocalError(null); }} style={styles.errorClose}>✕</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              required
              minLength={2}
              className="input"
              id="register-username"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
              id="register-email"
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
              id="register-password"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="input"
              id="register-confirm-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "8px" }}
            id="register-submit"
          >
            {isLoading ? (
              <>
                <span style={styles.spinner} className="animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" style={styles.link}>
            Sign in
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
