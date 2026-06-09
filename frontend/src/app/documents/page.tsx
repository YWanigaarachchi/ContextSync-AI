"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import {
  Document,
  apiListDocuments,
  apiUploadDocument,
  apiDeleteDocument,
  apiIngestUrl,
} from "@/lib/api";

export default function DocumentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [isIngestingUrl, setIsIngestingUrl] = useState(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadDocuments();
  }, [isAuthenticated]);

  // Poll for processing documents
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(loadDocuments, 3000);
    return () => clearInterval(interval);
  }, [documents]);

  const loadDocuments = async () => {
    try {
      const res = await apiListDocuments();
      setDocuments(res.documents);
    } catch {
      // ignore
    }
  };

  const showNotification = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      await apiUploadDocument(file);
      showNotification("success", `"${file.name}" uploaded successfully! Processing...`);
      await loadDocuments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      showNotification("error", message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleUrlIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsIngestingUrl(true);
    try {
      await apiIngestUrl(urlInput.trim(), urlTitle.trim() || undefined);
      showNotification("success", "URL ingested successfully! Processing...");
      setUrlInput("");
      setUrlTitle("");
      await loadDocuments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "URL ingestion failed";
      showNotification("error", message);
    } finally {
      setIsIngestingUrl(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.original_filename}"? This will also remove its vectors.`)) return;
    try {
      await apiDeleteDocument(doc.id);
      showNotification("success", "Document deleted");
      await loadDocuments();
    } catch {
      showNotification("error", "Failed to delete document");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <span className="badge badge-success">✓ Ready</span>;
      case "processing":
        return <span className="badge badge-warning">⏳ Processing</span>;
      case "error":
        return <span className="badge badge-error">✕ Error</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const getTypeIcon = (docType: string) => {
    switch (docType) {
      case "pdf": return "📕";
      case "docx": return "📘";
      case "txt": return "📝";
      case "url": return "🌐";
      case "code": return "💻";
      default: return "📄";
    }
  };

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="bg-radial">
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header} className="animate-fadeInDown">
            <h1 style={styles.title}>
              📚 <span className="gradient-text">Knowledge Base</span>
            </h1>
            <p style={styles.subtitle}>
              Upload documents to build your searchable knowledge base
            </p>
          </div>

          {/* Notification */}
          {notification && (
            <div
              style={{
                ...styles.notification,
                background: notification.type === "success" ? "var(--success-bg)" : "var(--error-bg)",
                borderColor: notification.type === "success" ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)",
                color: notification.type === "success" ? "var(--success)" : "var(--error)",
              }}
              className="animate-fadeInDown"
            >
              {notification.type === "success" ? "✅" : "❌"} {notification.message}
            </div>
          )}

          {/* Upload Section */}
          <div style={styles.uploadSection}>
            <div style={styles.uploadGrid}>
              {/* File Upload */}
              <div style={styles.uploadCard} className="card">
                <h3 style={styles.sectionTitle}>Upload File</h3>
                <FileUpload onFileSelect={handleFileUpload} isUploading={isUploading} />
              </div>

              {/* URL Ingest */}
              <div style={styles.uploadCard} className="card">
                <h3 style={styles.sectionTitle}>Ingest from URL</h3>
                <form onSubmit={handleUrlIngest} style={styles.urlForm}>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/article"
                    className="input"
                    required
                    id="url-input"
                  />
                  <input
                    type="text"
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="input"
                    id="url-title"
                  />
                  <button
                    type="submit"
                    disabled={isIngestingUrl || !urlInput.trim()}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    id="ingest-url-btn"
                  >
                    {isIngestingUrl ? "Ingesting..." : "🌐 Ingest URL"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div style={styles.docsSection}>
            <div style={styles.docsHeader}>
              <h3 style={styles.sectionTitle}>
                Your Documents ({documents.length})
              </h3>
            </div>

            {documents.length === 0 ? (
              <div style={styles.emptyDocs} className="card">
                <p style={styles.emptyText}>No documents uploaded yet</p>
                <p style={styles.emptySubtext}>
                  Upload PDFs, DOCX, TXT files, or paste URLs to start building your knowledge base
                </p>
              </div>
            ) : (
              <div style={styles.docsGrid}>
                {documents.map((doc, i) => (
                  <div
                    key={doc.id}
                    style={styles.docCard}
                    className="card animate-fadeInUp"
                  >
                    <div style={styles.docCardHeader}>
                      <span style={styles.docIcon}>{getTypeIcon(doc.doc_type)}</span>
                      <div style={styles.docInfo}>
                        <span style={styles.docName}>{doc.original_filename}</span>
                        <span style={styles.docMeta}>
                          {doc.doc_type.toUpperCase()} · {formatSize(doc.file_size)} · {doc.chunk_count} chunks
                        </span>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>

                    {doc.error_message && (
                      <p style={styles.errorMsg}>{doc.error_message}</p>
                    )}

                    <div style={styles.docCardFooter}>
                      <span style={styles.docDate}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="btn btn-danger btn-sm"
                        id={`delete-doc-${doc.id}`}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    paddingTop: "var(--navbar-height)",
    minHeight: "100vh",
  },
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "32px 24px",
  },
  header: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "15px",
    color: "var(--text-secondary)",
  },
  notification: {
    padding: "12px 16px",
    borderRadius: "var(--radius-md)",
    border: "1px solid",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  uploadSection: {
    marginBottom: "40px",
  },
  uploadGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  uploadCard: {
    padding: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "16px",
  },
  urlForm: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  docsSection: {
    marginTop: "8px",
  },
  docsHeader: {
    marginBottom: "16px",
  },
  docsGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  docCard: {
    padding: "16px 20px",
  },
  docCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  docIcon: {
    fontSize: "28px",
    flexShrink: 0,
  },
  docInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },
  docName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  docMeta: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  errorMsg: {
    fontSize: "12px",
    color: "var(--error)",
    marginTop: "8px",
    padding: "8px",
    background: "var(--error-bg)",
    borderRadius: "var(--radius-sm)",
  },
  docCardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid var(--border-color)",
  },
  docDate: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  emptyDocs: {
    textAlign: "center" as const,
    padding: "48px 24px",
  },
  emptyText: {
    fontSize: "16px",
    color: "var(--text-secondary)",
    marginBottom: "8px",
  },
  emptySubtext: {
    fontSize: "13px",
    color: "var(--text-muted)",
  },
};
