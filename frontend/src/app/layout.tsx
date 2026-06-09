import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "ContextSync-AI — Intelligent RAG System",
  description:
    "An intelligent Retrieval-Augmented Generation system that seamlessly connects LLMs to your proprietary knowledge base, delivering highly accurate, cited, and context-aware responses in real time.",
  keywords: ["RAG", "AI", "knowledge base", "document search", "LLM", "Gemini"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
