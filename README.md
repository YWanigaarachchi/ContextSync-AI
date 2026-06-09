# ContextSync-AI ⚡

An intelligent **Retrieval-Augmented Generation (RAG)** system that seamlessly connects LLMs to your proprietary knowledge base, delivering highly accurate, cited, and context-aware responses in real time.

## 🏗️ Architecture

```text
┌─────────────────────┐     ┌──────────────────────────────────┐
│  Next.js Frontend   │────▸│      FastAPI Backend             │
│  (Port 3000)        │     │      (Port 8000)                 │
│                     │     │                                  │
│  • Landing Page     │     │  • Auth Service (JWT)            │
│  • Chat UI (SSE)    │     │  • Document Ingestion Pipeline   │
│  • Document Manager │     │  • RAG Pipeline (Gemini)         │
│  • Analytics Dash   │     │  • Analytics Engine              │
└─────────────────────┘     └──────────┬───────────────────────┘
                                       │
                       ┌───────────────┼───────────────┐
                       │               │               │
                  ┌────▾────┐   ┌──────▾─────┐  ┌─────▾─────┐
                  │ ChromaDB │   │   SQLite   │  │   File    │
                  │ (Vectors)│   │ (Metadata) │  │  Storage  │
                  └──────────┘   └────────────┘  └───────────┘
```

## ✨ Features

- **📄 Multi-Format Document Ingestion** — PDF, DOCX, TXT, Web URLs, and 20+ code file types.
- **🧠 Smart RAG Pipeline** — Semantic chunking, Gemini embeddings, cosine similarity retrieval.
- **💬 Real-Time Streaming Chat** — Token-by-token Server-Sent Events (SSE) responses with conversation history.
- **📎 Source Citations** — Every answer cites documents with page numbers and relevance scores.
- **👥 Multi-User Auth** — JWT-based authentication with private knowledge bases.
- **📊 Analytics Dashboard** — Usage trends, top referenced docs, recent activity tracking.

## ⚙️ Environment Variables

Before running the application, make sure to configure the backend environment variables. Create a `.env` file in the `backend/` directory:

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `GEMINI_API_KEY` | **Required**. Your Google Gemini API Key | `AIzaSy...` |
| `SECRET_KEY` | JWT secret key | `your-super-secret-jwt-key` |
| `DATABASE_URL` | SQLite database URI | `sqlite+aiosqlite:///./data/contextsync.db` |
| `CHROMA_PERSIST_DIR` | ChromaDB storage path | `./data/chroma_db` |
| `UPLOAD_DIR` | File upload storage path | `./data/uploads` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Google Gemini API Key** — [Get one here](https://ai.google.dev/)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Open the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger UI)**: http://localhost:8000/docs

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `POST` | `/api/documents/upload` | Upload a document |
| `POST` | `/api/documents/url` | Ingest from a web URL |
| `GET` | `/api/documents` | List uploaded documents |
| `DELETE` | `/api/documents/{id}` | Delete a document and its vectors |
| `POST` | `/api/chat` | Send a message (SSE stream response) |
| `GET` | `/api/chat/conversations` | List conversation history |
| `GET` | `/api/chat/conversations/{id}` | Get specific conversation messages |
| `DELETE` | `/api/chat/conversations/{id}` | Delete a conversation |
| `GET` | `/api/analytics/dashboard` | Get dashboard analytics data |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, TypeScript, Vanilla CSS |
| **Backend** | FastAPI, Python 3.11+ |
| **LLM** | Google Gemini 2.0 Flash |
| **Embeddings** | Gemini text-embedding-004 |
| **Vector DB** | ChromaDB |
| **Database** | SQLite (async SQLAlchemy) |
| **Auth** | JWT (python-jose + bcrypt) |

## 📁 Project Structure

```text
ContextSync-AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── core/                # Configuration & Database setup
│   │   ├── models/              # Pydantic schemas & SQLAlchemy models
│   │   ├── services/            # Business logic (Auth, RAG, Embeddings)
│   │   └── routers/             # API Endpoints
│   ├── data/                    # Runtime data (SQLite, Chroma, Uploads)
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── app/                 # Next.js App Router pages
    │   ├── components/          # Reusable React components
    │   ├── contexts/            # React context providers
    │   └── lib/                 # API client & fetch wrappers
    └── next.config.ts
```

## 🔧 Troubleshooting

- **`Cannot find module` in Frontend**: If the IDE shows a TypeScript error but the code builds fine (`npm run build`), try restarting your TypeScript language server (`Ctrl+Shift+P` -> `TypeScript: Restart TS Server` in VS Code).
- **Backend Database Errors**: If you encounter SQLite schema errors during development, you can safely delete the `backend/data/contextsync.db` file to reset the database. It will auto-recreate on next startup.

## 📜 License

This project is licensed under the MIT License.
