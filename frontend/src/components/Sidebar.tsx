"use client";

import React from "react";
import { Conversation } from "@/lib/api";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  documentCount: number;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  documentCount,
}: SidebarProps) {
  return (
    <aside style={styles.sidebar} className="glass-strong">
      {/* New Chat Button */}
      <button
        onClick={onNewConversation}
        style={styles.newChatBtn}
        className="btn btn-primary"
        id="new-chat-btn"
      >
        <span style={{ fontSize: "18px" }}>+</span>
        <span>New Chat</span>
      </button>

      {/* Document Count */}
      <div style={styles.docCounter}>
        <span style={styles.docIcon}>📚</span>
        <span style={styles.docLabel}>Knowledge Base</span>
        <span style={styles.docCount}>{documentCount}</span>
      </div>

      {/* Conversation List */}
      <div style={styles.convList}>
        <div style={styles.convLabel}>Conversations</div>
        {conversations.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No conversations yet</p>
            <p style={styles.emptySubtext}>Start a new chat to begin</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              style={{
                ...styles.convItem,
                ...(activeConversationId === conv.id ? styles.convItemActive : {}),
              }}
              onClick={() => onSelectConversation(conv.id)}
              id={`conversation-${conv.id}`}
            >
              <div style={styles.convContent}>
                <span style={styles.convIcon}>💬</span>
                <div style={styles.convInfo}>
                  <span style={styles.convTitle}>{conv.title}</span>
                  <span style={styles.convMeta}>
                    {conv.message_count} messages
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                style={styles.deleteBtn}
                title="Delete conversation"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: "fixed",
    left: 0,
    top: "var(--navbar-height)",
    bottom: 0,
    width: "var(--sidebar-width)",
    display: "flex",
    flexDirection: "column",
    padding: "16px 12px",
    gap: "12px",
    borderRight: "1px solid var(--border-color)",
    overflowY: "auto",
    zIndex: 900,
  },
  newChatBtn: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    fontWeight: 600,
    gap: "8px",
  },
  docCounter: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    background: "rgba(99, 102, 241, 0.06)",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(99, 102, 241, 0.1)",
  },
  docIcon: {
    fontSize: "16px",
  },
  docLabel: {
    flex: 1,
    fontSize: "13px",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  docCount: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--accent-secondary)",
    background: "var(--bg-tertiary)",
    padding: "2px 8px",
    borderRadius: "var(--radius-full)",
  },
  convList: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  convLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    padding: "8px 12px 4px",
  },
  convItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "all 150ms ease",
  },
  convItemActive: {
    background: "var(--bg-hover)",
    borderColor: "var(--border-hover)",
  },
  convContent: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: 0,
  },
  convIcon: {
    fontSize: "14px",
    flexShrink: 0,
  },
  convInfo: {
    display: "flex",
    flexDirection: "column" as const,
    minWidth: 0,
  },
  convTitle: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "160px",
  },
  convMeta: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    fontSize: "12px",
    padding: "4px",
    borderRadius: "var(--radius-sm)",
    opacity: 0.4,
    transition: "opacity 150ms ease",
    cursor: "pointer",
  },
  emptyState: {
    padding: "24px 12px",
    textAlign: "center" as const,
  },
  emptyText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    marginBottom: "4px",
  },
  emptySubtext: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
};
