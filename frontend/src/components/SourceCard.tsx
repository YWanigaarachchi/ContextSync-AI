"use client";

import React, { useState } from "react";
import { SourceCitation } from "@/lib/api";

interface SourceCardProps {
  source: SourceCitation;
  index: number;
}

export default function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const text = source.chunk_text || source.text || "";
  const preview = text.length > 120 ? text.slice(0, 120) + "..." : text;
  const score = Math.round(source.relevance_score * 100);

  return (
    <div
      style={styles.card}
      onClick={() => setExpanded(!expanded)}
      id={`source-card-${index}`}
    >
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.index}>#{index}</span>
          <span style={styles.docName}>{source.document_name}</span>
          {source.page_number && (
            <span style={styles.page}>p.{source.page_number}</span>
          )}
        </div>
        <div style={styles.headerRight}>
          <span
            style={{
              ...styles.score,
              color: score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--error)",
            }}
          >
            {score}% match
          </span>
          <span style={styles.expand}>{expanded ? "▾" : "▸"}</span>
        </div>
      </div>
      <p style={styles.preview}>
        {expanded ? text : preview}
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(99, 102, 241, 0.04)",
    border: "1px solid rgba(99, 102, 241, 0.1)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    cursor: "pointer",
    transition: "all 200ms ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  index: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--accent-secondary)",
    background: "rgba(99, 102, 241, 0.1)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  docName: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-primary)",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  page: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  score: {
    fontSize: "11px",
    fontWeight: 600,
  },
  expand: {
    fontSize: "10px",
    color: "var(--text-muted)",
  },
  preview: {
    fontSize: "12px",
    lineHeight: 1.5,
    color: "var(--text-secondary)",
    margin: 0,
  },
};
