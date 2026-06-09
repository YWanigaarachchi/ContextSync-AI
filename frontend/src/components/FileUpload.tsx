"use client";

import React, { useState, useRef, useCallback } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  acceptedTypes?: string;
}

export default function FileUpload({
  onFileSelect,
  isUploading,
  acceptedTypes = ".pdf,.docx,.doc,.txt,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.cs,.go,.rs,.rb,.php,.html,.css,.scss,.sql,.sh,.yaml,.yml,.json,.xml,.md",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
      e.target.value = "";
    }
  };

  return (
    <div
      style={{
        ...styles.dropZone,
        ...(isDragging ? styles.dropZoneActive : {}),
        ...(isUploading ? styles.dropZoneUploading : {}),
      }}
      onDrag={handleDrag}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDragIn}
      onDrop={handleDrop}
      onClick={handleClick}
      id="file-upload-zone"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileChange}
        style={{ display: "none" }}
        id="file-input"
      />

      {isUploading ? (
        <div style={styles.uploadingState}>
          <div style={styles.spinner} className="animate-spin" />
          <p style={styles.uploadingText}>Processing document...</p>
          <p style={styles.uploadingSubtext}>Parsing, chunking & embedding</p>
        </div>
      ) : (
        <div style={styles.idleState}>
          <div style={styles.icon}>
            {isDragging ? "📥" : "📄"}
          </div>
          <p style={styles.mainText}>
            {isDragging ? "Drop file here" : "Drag & drop a file here"}
          </p>
          <p style={styles.subText}>or click to browse</p>
          <div style={styles.supportedTypes}>
            <span style={styles.typeTag}>PDF</span>
            <span style={styles.typeTag}>DOCX</span>
            <span style={styles.typeTag}>TXT</span>
            <span style={styles.typeTag}>Code</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dropZone: {
    border: "2px dashed var(--border-color)",
    borderRadius: "var(--radius-lg)",
    padding: "40px 24px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 300ms ease",
    background: "rgba(99, 102, 241, 0.02)",
  },
  dropZoneActive: {
    borderColor: "var(--accent-primary)",
    background: "rgba(99, 102, 241, 0.06)",
    boxShadow: "var(--shadow-glow)",
  },
  dropZoneUploading: {
    borderColor: "var(--accent-primary)",
    cursor: "default",
    opacity: 0.8,
  },
  idleState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "8px",
  },
  icon: {
    fontSize: "40px",
    marginBottom: "8px",
  },
  mainText: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  subText: {
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  supportedTypes: {
    display: "flex",
    gap: "6px",
    marginTop: "12px",
  },
  typeTag: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: "var(--radius-full)",
    background: "var(--bg-tertiary)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-color)",
  },
  uploadingState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "12px",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--border-color)",
    borderTopColor: "var(--accent-primary)",
    borderRadius: "50%",
  },
  uploadingText: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  uploadingSubtext: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
};
