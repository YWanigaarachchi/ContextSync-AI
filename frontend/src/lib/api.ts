/**
 * ContextSync-AI — API Client
 * Handles all communication with the FastAPI backend including SSE streaming.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ==========================================
// Auth helpers
// ==========================================

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("contextsync_token");
}

export function setToken(token: string): void {
  localStorage.setItem("contextsync_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("contextsync_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ==========================================
// Generic fetch wrapper
// ==========================================

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.headers as Record<string, string>),
  };

  // Only set content-type if not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ==========================================
// Auth API
// ==========================================

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function apiRegister(
  email: string,
  username: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
}

export async function apiLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe(): Promise<User> {
  return apiFetch("/api/auth/me");
}

// ==========================================
// Documents API
// ==========================================

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  doc_type: string;
  file_size: number;
  chunk_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export async function apiUploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export async function apiIngestUrl(
  url: string,
  title?: string
): Promise<Document> {
  return apiFetch("/api/documents/url", {
    method: "POST",
    body: JSON.stringify({ url, title }),
  });
}

export async function apiListDocuments(): Promise<DocumentListResponse> {
  return apiFetch("/api/documents");
}

export async function apiDeleteDocument(id: number): Promise<void> {
  await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
}

// ==========================================
// Chat API (SSE Streaming)
// ==========================================

export interface SourceCitation {
  document_name: string;
  chunk_text?: string;
  text?: string;
  page_number: number | null;
  relevance_score: number;
  chunk_index: number;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources: SourceCitation[];
  response_time_ms: number | null;
  created_at: string;
}

export interface ConversationDetail {
  id: number;
  title: string;
  messages: ChatMessage[];
  created_at: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface StreamCallbacks {
  onSources: (sources: SourceCitation[]) => void;
  onToken: (token: string) => void;
  onDone: (data: { full_response: string; response_time_ms: number }) => void;
  onMeta: (data: { conversation_id: number; is_new: boolean }) => void;
  onError: (error: string) => void;
}

export async function apiSendMessage(
  message: string,
  conversationId: number | null,
  callbacks: StreamCallbacks
): Promise<void> {
  const url = `${API_BASE}/api/chat`;
  const token = getToken();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Chat request failed" }));
    callbacks.onError(error.detail || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("No response stream");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));
        switch (data.type) {
          case "sources":
            callbacks.onSources(data.data);
            break;
          case "token":
            callbacks.onToken(data.data);
            break;
          case "done":
            callbacks.onDone(data.data);
            break;
          case "meta":
            callbacks.onMeta(data.data);
            break;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }
}

export async function apiListConversations(): Promise<ConversationListResponse> {
  return apiFetch("/api/chat/conversations");
}

export async function apiGetConversation(id: number): Promise<ConversationDetail> {
  return apiFetch(`/api/chat/conversations/${id}`);
}

export async function apiCreateConversation(
  title?: string
): Promise<Conversation> {
  return apiFetch("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function apiDeleteConversation(id: number): Promise<void> {
  await apiFetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
}

// ==========================================
// Analytics API
// ==========================================

export interface AnalyticsOverview {
  total_documents: number;
  total_queries: number;
  total_users: number;
  total_conversations: number;
  avg_response_time_ms: number | null;
}

export interface DailyUsage {
  date: string;
  query_count: number;
  upload_count: number;
}

export interface TopDocument {
  document_name: string;
  reference_count: number;
}

export interface RecentActivity {
  event_type: string;
  description: string;
  timestamp: string;
  user_email: string | null;
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  daily_usage: DailyUsage[];
  top_documents: TopDocument[];
  recent_activity: RecentActivity[];
}

export async function apiGetDashboard(): Promise<AnalyticsDashboard> {
  return apiFetch("/api/analytics/dashboard");
}
