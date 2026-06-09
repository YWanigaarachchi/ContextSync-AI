"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated) return null;

  const navLinks = [
    { href: "/chat", label: "Chat", icon: "💬" },
    { href: "/documents", label: "Documents", icon: "📄" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ];

  return (
    <nav style={styles.navbar} className="glass-strong">
      {/* Logo */}
      <Link href="/chat" style={styles.logo}>
        <span style={styles.logoIcon}>⚡</span>
        <span style={styles.logoText}>
          Context<span className="gradient-text">Sync</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div style={styles.navLinks}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              ...styles.navLink,
              ...(pathname === link.href ? styles.navLinkActive : {}),
            }}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>

      {/* User Menu */}
      <div style={styles.userMenu}>
        <div style={styles.userAvatar}>
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <span style={styles.userName}>{user?.username}</span>
        <button onClick={logout} style={styles.logoutBtn} className="btn btn-ghost btn-sm">
          Logout
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "var(--navbar-height)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    zIndex: 1000,
    borderBottom: "1px solid var(--border-color)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
    color: "var(--text-primary)",
  },
  logoIcon: {
    fontSize: "24px",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  navLinks: {
    display: "flex",
    gap: "4px",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none",
    transition: "all 200ms ease",
  },
  navLinkActive: {
    background: "var(--bg-hover)",
    color: "var(--accent-secondary)",
  },
  userMenu: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--radius-full)",
    background: "var(--accent-gradient)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 600,
    color: "white",
  },
  userName: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  logoutBtn: {
    marginLeft: "4px",
  },
};
