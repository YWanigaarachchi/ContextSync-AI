"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/chat");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div style={styles.page} className="bg-radial bg-grid">
      {/* Hero Section */}
      <header style={styles.hero}>
        {/* Nav */}
        <nav style={styles.nav}>
          <div style={styles.navLogo}>
            <span style={{ fontSize: "28px" }}>⚡</span>
            <span style={styles.navLogoText}>
              Context<span className="gradient-text">Sync</span>
            </span>
          </div>
          <div style={styles.navActions}>
            <Link href="/login" className="btn btn-ghost">
              Sign In
            </Link>
            <Link href="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div style={styles.heroContent} className="animate-fadeInUp">
          <div style={styles.heroBadge} className="glass">
            🚀 Powered by Google Gemini AI
          </div>
          <h1 style={styles.heroTitle}>
            Your Knowledge,{" "}
            <span className="gradient-text">Supercharged</span>{" "}
            with AI
          </h1>
          <p style={styles.heroSubtitle}>
            Upload your documents, ask questions in natural language, and get
            accurate, cited answers powered by retrieval-augmented generation.
          </p>
          <div style={styles.heroCTA}>
            <Link href="/register" className="btn btn-primary btn-lg">
              ✨ Start Free
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg">
              Sign In →
            </Link>
          </div>
        </div>

        {/* Glow Effect */}
        <div style={styles.glowOrb1} />
        <div style={styles.glowOrb2} />
      </header>

      {/* Features Section */}
      <section style={styles.features}>
        <h2 style={styles.featuresTitle} className="animate-fadeInUp">
          Everything you need to unlock your{" "}
          <span className="gradient-text">knowledge base</span>
        </h2>
        <div style={styles.featuresGrid}>
          {[
            {
              icon: "📄",
              title: "Multi-Format Upload",
              desc: "PDF, DOCX, TXT, code files, and web URLs. We parse and chunk everything intelligently.",
            },
            {
              icon: "🧠",
              title: "Smart RAG Pipeline",
              desc: "Semantic search with Gemini embeddings finds the most relevant context for every question.",
            },
            {
              icon: "💬",
              title: "Real-Time Streaming",
              desc: "Watch answers appear token-by-token with source citations. No waiting for complete responses.",
            },
            {
              icon: "📎",
              title: "Source Citations",
              desc: "Every answer cites its sources with document name, page number, and relevance score.",
            },
            {
              icon: "👥",
              title: "Multi-User",
              desc: "Secure JWT authentication. Each user has their own private knowledge base and conversations.",
            },
            {
              icon: "📊",
              title: "Analytics Dashboard",
              desc: "Track queries, monitor usage trends, and see which documents are referenced most.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              style={styles.featureCard}
              className="card animate-fadeInUp"
            >
              <span style={styles.featureIcon}>{feature.icon}</span>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={styles.howItWorks}>
        <h2 style={styles.featuresTitle}>
          How it <span className="gradient-text">works</span>
        </h2>
        <div style={styles.stepsGrid}>
          {[
            { step: "01", title: "Upload", desc: "Drop your documents into the knowledge base" },
            { step: "02", title: "Process", desc: "AI chunks, embeds, and indexes your content" },
            { step: "03", title: "Ask", desc: "Ask natural language questions in the chat" },
            { step: "04", title: "Discover", desc: "Get accurate, cited answers from your docs" },
          ].map((item, i) => (
            <div key={i} style={styles.stepCard} className="animate-fadeInUp">
              <span style={styles.stepNumber}>{item.step}</span>
              <h3 style={styles.stepTitle}>{item.title}</h3>
              <p style={styles.stepDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section style={styles.footerCTA}>
        <h2 style={styles.ctaTitle}>
          Ready to <span className="gradient-text">sync your context</span>?
        </h2>
        <Link href="/register" className="btn btn-primary btn-lg">
          ✨ Get Started — It&apos;s Free
        </Link>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2024 ContextSync-AI. Built with ❤️ using FastAPI, Next.js & Gemini.
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative" as const,
    overflow: "hidden",
  },
  hero: {
    minHeight: "90vh",
    display: "flex",
    flexDirection: "column" as const,
    position: "relative" as const,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 40px",
    zIndex: 10,
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  navLogoText: {
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "-0.5px",
    color: "var(--text-primary)",
  },
  navActions: {
    display: "flex",
    gap: "12px",
  },
  heroContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    padding: "0 24px",
    zIndex: 10,
    maxWidth: "800px",
    margin: "0 auto",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 20px",
    borderRadius: "var(--radius-full)",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "32px",
  },
  heroTitle: {
    fontSize: "52px",
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: "-2px",
    marginBottom: "24px",
    color: "var(--text-primary)",
  },
  heroSubtitle: {
    fontSize: "18px",
    lineHeight: 1.7,
    color: "var(--text-secondary)",
    maxWidth: "600px",
    marginBottom: "40px",
  },
  heroCTA: {
    display: "flex",
    gap: "16px",
  },
  glowOrb1: {
    position: "absolute" as const,
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
    top: "10%",
    left: "10%",
    pointerEvents: "none" as const,
    animation: "float 6s ease-in-out infinite",
  },
  glowOrb2: {
    position: "absolute" as const,
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
    bottom: "10%",
    right: "15%",
    pointerEvents: "none" as const,
    animation: "float 8s ease-in-out infinite reverse",
  },
  features: {
    padding: "80px 40px",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  featuresTitle: {
    fontSize: "32px",
    fontWeight: 800,
    textAlign: "center" as const,
    marginBottom: "48px",
    letterSpacing: "-1px",
    color: "var(--text-primary)",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },
  featureCard: {
    padding: "28px",
    textAlign: "center" as const,
  },
  featureIcon: {
    fontSize: "36px",
    marginBottom: "16px",
    display: "block",
  },
  featureTitle: {
    fontSize: "16px",
    fontWeight: 700,
    marginBottom: "8px",
    color: "var(--text-primary)",
  },
  featureDesc: {
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--text-secondary)",
  },
  howItWorks: {
    padding: "60px 40px 80px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "24px",
  },
  stepCard: {
    textAlign: "center" as const,
    padding: "20px",
  },
  stepNumber: {
    fontSize: "40px",
    fontWeight: 900,
    background: "var(--accent-gradient)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "12px",
    display: "block",
  },
  stepTitle: {
    fontSize: "16px",
    fontWeight: 700,
    marginBottom: "8px",
    color: "var(--text-primary)",
  },
  stepDesc: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  footerCTA: {
    textAlign: "center" as const,
    padding: "80px 24px",
    borderTop: "1px solid var(--border-color)",
  },
  ctaTitle: {
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "24px",
    color: "var(--text-primary)",
  },
  footer: {
    textAlign: "center" as const,
    padding: "24px",
    borderTop: "1px solid var(--border-color)",
  },
  footerText: {
    fontSize: "13px",
    color: "var(--text-muted)",
  },
};
