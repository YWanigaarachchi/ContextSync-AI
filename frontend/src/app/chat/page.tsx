"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import {
  Conversation,
  SourceCitation,
  apiListConversations,
  apiGetConversation,
  apiSendMessage,
  apiDeleteConversation,
  apiListDocuments,
} from "@/lib/api";

interface DisplayMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources: SourceCitation[];
  responseTimeMs: number | null;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [docCount, setDocCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load conversations and doc count
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      apiListDocuments().then((res) => setDocCount(res.total)).catch(() => {});
    }
  }, [isAuthenticated]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await apiListConversations();
      setConversations(res.conversations);
    } catch {
      // ignore
    }
  };

  const loadConversation = async (id: number) => {
    setActiveConvId(id);
    try {
      const detail = await apiGetConversation(id);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources || [],
          responseTimeMs: m.response_time_ms,
        }))
      );
    } catch {
      // ignore
    }
  };

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const handleDeleteConversation = async (id: number) => {
    try {
      await apiDeleteConversation(id);
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch {
      // ignore
    }
  };

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    // Add user message
    const userMsg: DisplayMessage = {
      id: Date.now(),
      role: "user",
      content: msg,
      sources: [],
      responseTimeMs: null,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add empty assistant message (will be streamed into)
    const assistantMsgId = Date.now() + 1;
    const assistantMsg: DisplayMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      sources: [],
      responseTimeMs: null,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await apiSendMessage(msg, activeConvId, {
        onSources: (sources) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, sources } : m
            )
          );
        },
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + token }
                : m
            )
          );
        },
        onDone: (data) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: data.full_response,
                    responseTimeMs: data.response_time_ms,
                    isStreaming: false,
                  }
                : m
            )
          );
        },
        onMeta: (data) => {
          if (data.is_new || !activeConvId) {
            setActiveConvId(data.conversation_id);
          }
          loadConversations();
        },
        onError: (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `❌ Error: ${error}`, isStreaming: false }
                : m
            )
          );
        },
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: "❌ Failed to get response", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, activeConvId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} className="animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="bg-radial">
      <Navbar />
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConvId}
        onSelectConversation={loadConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        documentCount={docCount}
      />

      <main style={styles.main}>
        {/* Messages Area */}
        <div style={styles.messagesArea}>
          {messages.length === 0 ? (
            <div style={styles.emptyState} className="animate-fadeIn">
              <div style={styles.emptyIcon}>⚡</div>
              <h2 style={styles.emptyTitle}>
                Welcome to <span className="gradient-text">ContextSync-AI</span>
              </h2>
              <p style={styles.emptySubtitle}>
                Ask any question about your uploaded documents. I&apos;ll find the most relevant context and provide cited answers.
              </p>
              <div style={styles.suggestions}>
                {[
                  "📄 What are the key findings in my documents?",
                  "🔍 Summarize the main topics covered",
                  "📊 What data or statistics are mentioned?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    style={styles.suggestionBtn}
                    className="card"
                    onClick={() => {
                      setInput(suggestion.slice(2).trim());
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.messagesList}>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  sources={msg.sources}
                  responseTimeMs={msg.responseTimeMs}
                  isStreaming={msg.isStreaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper} className="glass">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              style={styles.textarea}
              rows={1}
              disabled={isStreaming}
              id="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              style={{
                ...styles.sendBtn,
                opacity: !input.trim() || isStreaming ? 0.4 : 1,
              }}
              className="btn btn-primary"
              id="send-btn"
            >
              {isStreaming ? (
                <span className="animate-spin" style={styles.sendSpinner} />
              ) : (
                "↑"
              )}
            </button>
          </div>
          <p style={styles.inputHint}>
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-primary)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--border-color)",
    borderTopColor: "var(--accent-primary)",
    borderRadius: "50%",
  },
  main: {
    marginLeft: "var(--sidebar-width)",
    paddingTop: "var(--navbar-height)",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
  },
  messagesArea: {
    flex: 1,
    overflow: "auto",
    padding: "24px",
  },
  messagesList: {
    maxWidth: "var(--max-chat-width)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    textAlign: "center" as const,
    padding: "40px",
  },
  emptyIcon: {
    fontSize: "64px",
    marginBottom: "24px",
    filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.3))",
  },
  emptyTitle: {
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "12px",
    color: "var(--text-primary)",
  },
  emptySubtitle: {
    fontSize: "16px",
    color: "var(--text-secondary)",
    maxWidth: "500px",
    lineHeight: 1.6,
    marginBottom: "32px",
  },
  suggestions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    width: "100%",
    maxWidth: "500px",
  },
  suggestionBtn: {
    padding: "14px 18px",
    fontSize: "14px",
    color: "var(--text-secondary)",
    textAlign: "left" as const,
    cursor: "pointer",
    border: "1px solid var(--border-color)",
    background: "var(--bg-card)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-family)",
    transition: "all 200ms ease",
  },
  inputContainer: {
    padding: "16px 24px 20px",
    maxWidth: "var(--max-chat-width)",
    margin: "0 auto",
    width: "100%",
  },
  inputWrapper: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    padding: "8px 8px 8px 16px",
    borderRadius: "var(--radius-lg)",
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--text-primary)",
    fontSize: "14px",
    lineHeight: 1.5,
    resize: "none" as const,
    minHeight: "24px",
    maxHeight: "120px",
    padding: "6px 0",
    fontFamily: "var(--font-family)",
  },
  sendBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-md)",
    fontSize: "18px",
    fontWeight: 700,
    padding: 0,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sendSpinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
  },
  inputHint: {
    fontSize: "11px",
    color: "var(--text-muted)",
    textAlign: "center" as const,
    marginTop: "8px",
  },
};
