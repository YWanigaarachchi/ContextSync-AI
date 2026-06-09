"use client";

import React from "react";
import SourceCard from "@/components/SourceCard";
import { SourceCitation } from "@/lib/api";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  responseTimeMs?: number | null;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  sources,
  responseTimeMs,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === "user";

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    // Process markdown-style formatting
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith("### ")) {
        return <h4 key={i} style={styles.h4}>{line.slice(4)}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} style={styles.h3}>{line.slice(3)}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={i} style={styles.h2}>{line.slice(2)}</h2>;
      }
      // List items
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <div key={i} style={styles.listItem}>
            <span style={styles.bullet}>•</span>
            <span>{renderInlineFormatting(line.slice(2))}</span>
          </div>
        );
      }
      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s/);
      if (numMatch) {
        return (
          <div key={i} style={styles.listItem}>
            <span style={styles.number}>{numMatch[1]}.</span>
            <span>{renderInlineFormatting(line.slice(numMatch[0].length))}</span>
          </div>
        );
      }
      // Code blocks
      if (line.startsWith("```")) {
        return null; // Skip code fence markers
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={i} style={{ height: "8px" }} />;
      }
      // Regular paragraph
      return <p key={i} style={styles.paragraph}>{renderInlineFormatting(line)}</p>;
    });
  };

  const renderInlineFormatting = (text: string) => {
    // Bold
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={styles.bold}>{part.slice(2, -2)}</strong>;
      }
      // Inline code
      const codeParts = part.split(/(`.*?`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith("`") && cp.endsWith("`")) {
          return <code key={`${i}-${j}`} style={styles.inlineCode}>{cp.slice(1, -1)}</code>;
        }
        // Source citations [Source: ...]
        const citeParts = cp.split(/(\[Source:.*?\])/g);
        return citeParts.map((cite, k) => {
          if (cite.startsWith("[Source:")) {
            return <span key={`${i}-${j}-${k}`} style={styles.citation}>{cite}</span>;
          }
          return <React.Fragment key={`${i}-${j}-${k}`}>{cite}</React.Fragment>;
        });
      });
    });
  };

  return (
    <div
      style={{
        ...styles.messageRow,
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
      className="animate-fadeInUp"
    >
      {/* Avatar */}
      {!isUser && (
        <div style={styles.avatarAI}>⚡</div>
      )}

      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Message Bubble */}
        <div
          style={{
            ...styles.bubble,
            ...(isUser ? styles.bubbleUser : styles.bubbleAI),
          }}
        >
          {isUser ? (
            <p style={styles.userText}>{content}</p>
          ) : (
            <div style={styles.aiContent}>
              {renderContent(content)}
              {isStreaming && (
                <span style={styles.cursor}>▊</span>
              )}
            </div>
          )}
        </div>

        {/* Response time */}
        {responseTimeMs && !isUser && (
          <span style={styles.responseTime}>
            ⚡ {(responseTimeMs / 1000).toFixed(1)}s
          </span>
        )}

        {/* Source citations */}
        {sources && sources.length > 0 && !isUser && (
          <div style={styles.sourcesContainer}>
            <div style={styles.sourcesLabel}>📎 Sources ({sources.length})</div>
            <div style={styles.sourcesGrid}>
              {sources.map((source, i) => (
                <SourceCard key={i} source={source} index={i + 1} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div style={styles.avatarUser}>You</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  messageRow: {
    display: "flex",
    gap: "12px",
    padding: "4px 0",
    alignItems: "flex-start",
  },
  avatarAI: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-md)",
    background: "var(--accent-gradient)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
    boxShadow: "var(--shadow-glow)",
  },
  avatarUser: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    flexShrink: 0,
  },
  bubble: {
    borderRadius: "var(--radius-lg)",
    padding: "14px 18px",
    lineHeight: 1.6,
  },
  bubbleUser: {
    background: "var(--accent-gradient)",
    color: "white",
    borderBottomRightRadius: "4px",
  },
  bubbleAI: {
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderBottomLeftRadius: "4px",
    color: "var(--text-primary)",
  },
  userText: {
    fontSize: "14px",
    lineHeight: 1.6,
  },
  aiContent: {
    fontSize: "14px",
  },
  h2: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "8px",
    marginTop: "12px",
    color: "var(--text-primary)",
  },
  h3: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "6px",
    marginTop: "10px",
    color: "var(--text-primary)",
  },
  h4: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "4px",
    marginTop: "8px",
    color: "var(--text-primary)",
  },
  paragraph: {
    marginBottom: "4px",
    lineHeight: 1.7,
  },
  listItem: {
    display: "flex",
    gap: "8px",
    marginBottom: "4px",
    lineHeight: 1.6,
  },
  bullet: {
    color: "var(--accent-secondary)",
    fontWeight: 700,
    flexShrink: 0,
  },
  number: {
    color: "var(--accent-secondary)",
    fontWeight: 600,
    flexShrink: 0,
    minWidth: "20px",
  },
  bold: {
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  inlineCode: {
    background: "rgba(99, 102, 241, 0.1)",
    color: "var(--accent-light)",
    padding: "1px 6px",
    borderRadius: "4px",
    fontSize: "13px",
    fontFamily: "var(--font-mono)",
  },
  citation: {
    color: "var(--accent-secondary)",
    fontSize: "12px",
    fontWeight: 500,
    background: "rgba(99, 102, 241, 0.08)",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  cursor: {
    display: "inline-block",
    animation: "pulse 1s infinite",
    color: "var(--accent-primary)",
    marginLeft: "2px",
  },
  responseTime: {
    fontSize: "11px",
    color: "var(--text-muted)",
    paddingLeft: "4px",
  },
  sourcesContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  sourcesLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  sourcesGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
};
