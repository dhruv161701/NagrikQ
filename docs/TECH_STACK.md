# NagrikQ — Actual Technology Stack

> **Auditor Notice**: This technology stack inventory is derived strictly from `package.json`, `backend/package.json`, source code imports, configurations, and active service integrations within this repository. No assumed or unverified technologies are listed.

---

## 1. Frontend

| Category | Technology | Version | How & Why It Is Used in NagrikQ |
|---|---|---|---|
| **Framework** | React | `^19.2.8` | Core UI library for reactive, component-based rendering of all citizen, officer, and admin dashboards. |
| **Language** | TypeScript | `~6.0.2` | Provides static typing, strong contract definitions, and type safety across all components and pages. |
| **Build Tool & Dev Server** | Vite | `^8.3.0` | Ultra-fast development server with Hot Module Replacement (HMR) and production bundler with `/api` proxy. |
| **Routing** | React Router DOM | `^7.18.4` | Client-side routing with role-based route guards (`ProtectedRoute`), nested layouts, and onboarding flows. |
| **Icons** | Lucide React | `^1.49.0` | Vector icons for civic/government UI elements, status badges, counter indicators, and navigation. |
| **Styling** | Vanilla CSS (CSS Variables) | Native | Custom design system (`tokens.css`) defining HSL/hex palettes, spacing, typography, and dark/light/mode variables without Tailwind dependencies. |
| **State Management** | React Context API | Native | Centralized global states across `AuthContext`, `UIContext` (modes/translations), and `DataContext` (live tokens/services). |
| **Realtime Client** | Supabase JS Client | `^2.109.0` | Listens to live PostgreSQL change publications (`queue_tokens`, `service_change_requests`, etc.) via WebSockets. |
| **Audio Engine** | Web Audio API | Browser Native | Programmatically synthesizes two-tone counter chimes (587Hz to 880Hz) when a citizen's token is called. |

---

## 2. Backend

| Category | Technology | Version | How & Why It Is Used in NagrikQ |
|---|---|---|---|
| **Runtime** | Node.js | `>=18` | Server runtime environment executing backend services and API processes. |
| **Language** | TypeScript | `^5.7.3` | Strongly-typed backend codebase compiled to JavaScript via `tsc`. |
| **Server Framework** | Express | `^4.21.2` | REST API framework serving endpoints for queue management, services, applications, change requests, and auth. |
| **Development Engine** | ts-node-dev | `^2.0.0` | Auto-restarting development server transpiling TypeScript on the fly. |
| **Cross-Origin Security** | CORS | `^2.8.5` | Manages allowed HTTP headers, methods, and client origins (`http://localhost:5173`). |
| **Configuration** | Dotenv | `^16.4.7` | Loads environment variables for port, Supabase credentials, Gemini keys, Telegram tokens, and webhooks. |
| **WebSockets** | ws | `^8.22.0` | Low-level WebSocket client installed for potential real-time streaming connections. |
| **Authentication Middleware** | Supabase Auth Verification | Custom | Validates incoming Bearer JWT tokens via `supabaseAdmin.auth.getUser(token)` and maps user identities. |
| **Authorization Middleware** | RBAC (`requireRole`) | Custom | Enforces role checks (`citizen`, `employee`, `admin`, `superadmin`) protecting administrative and officer routes. |

---

## 3. Database & Storage

| Category | Technology | Details / Version | How & Why It Is Used in NagrikQ |
|---|---|---|---|
| **Database** | PostgreSQL on Supabase | Cloud (v15+) | Primary relational data store hosted on Supabase (`fcsrwywlhmcusqababtq.supabase.co`). |
| **Vector Database Extension** | `pgvector` | PostgreSQL Extension | Stores 768-dimensional embeddings in `knowledge_chunks` with IVFFlat cosine similarity indexing. |
| **Realtime Engine** | Supabase Realtime | Publication | Broadcasts `INSERT`, `UPDATE`, `DELETE` events on key tables with `REPLICA IDENTITY FULL` to active clients. |
| **Data Protection** | PostgreSQL Row Level Security (RLS) | Native Policies | Enforces per-user and per-role data isolation at the database layer for all 19 relational tables. |
| **Schema Migrations** | SQL Scripts | `supabase/query.sql` | Idempotent table schemas, ENUM types, foreign keys, indexes, triggers, and realtime configuration. |
| **Media & File Storage** | Cloudinary | Cloud REST API | Stores citizen documents and identity proofs with cryptographic SHA-1 signed upload authentication. |

---

## 4. Artificial Intelligence & Machine Learning

| Category | Technology | Model / Version | How & Why It Is Used in NagrikQ |
|---|---|---|---|
| **AI SDK** | `@google/generative-ai` | `^0.24.1` | Official Google SDK for Gemini LLMs and text embedding generation. |
| **Embedding Model** | Gemini Embeddings | `gemini-embedding-001` | Converts citizen questions and service requirements into 768-dimensional vector representations. |
| **Chat / Reasoning LLM** | Google Gemini | `gemini-3.5-flash` | Generates conversational answers strictly grounded in retrieved government service knowledge chunks. |
| **Fallback LLM** | Google Gemini | `gemini-3.5-flash-lite` | High-availability fallback model if the primary flash model encounters rate limits or latency spikes. |
| **RAG Pipeline** | Custom Cosine Similarity Vector Search | Custom TypeScript | Chunks government service circulars, computes dot-product cosine similarity against `knowledge_chunks`, and feeds top-5 chunks into context. |

---

## 5. Notifications & Integrations

| Category | Technology | Details | How & Why It Is Used in NagrikQ |
|---|---|---|---|
| **Telegram Bot API** | Telegram Bot (`@NagrikQbot`) | Bot Token: `8874803375:...` | Dispatches admin credentials and IDP application updates directly to linked citizen/admin Telegram chats via polling and webhooks. |
| **Workflow Automation** | n8n Workflow | `n8n-nodes-base` | Low-code orchestration pipeline (`nagrikq_idp_notification.json`) processing webhook payloads, verifying secrets, and messaging Telegram. |
| **Phone Normalization** | Custom Utility | `phoneUtils.ts` | Normalizes Indian numbers (+91, leading 0, hyphens) to 10-digit standardized keys for account linkage. |

---

## 6. Hosting & Deployment Configuration

| Category | Technology | Details | How & Why It Is Used in NagrikQ |
|---|---|---|---|
| **Client Dev Server** | Vite Dev Server | `http://localhost:5173` | Hosts the frontend application with live Hot Module Replacement and API reverse-proxying. |
| **API Server** | Node.js Express Server | `http://localhost:5000` | Hosts the REST API routes and Telegram long-polling service. |
| **Cloud Services** | Supabase Cloud | `https://fcsrwywlhmcusqababtq.supabase.co` | Manages auth, database, pgvector indexing, and realtime sockets. |
| **CDN / Cloud Assets** | Cloudinary CDN | Cloud Name: `dx3tt1c5v` | Cloud media delivery and secure document storage. |

---

## 7. Development & Quality Assurance Tooling

| Category | Technology | Version | How & Why It Is Used in NagrikQ |
|---|---|---|---|
| **Version Control** | Git | 2.x | Distributed source control tracking features across branches (`dev`, `main`). |
| **Remote Repository** | GitHub | `dhruv161701/NagrikQ.git` | Upstream remote repository. |
| **Linter** | ESLint | `^10.10.0` | Enforces JavaScript and TypeScript code style standards and static analysis. |
| **React Linting** | `eslint-plugin-react-hooks` | `^7.1.1` | Ensures compliance with React hook dependencies and rules. |
| **Automated Testing** | TypeScript Test Suite | `backend/src/tests/telegramWorkflow.test.ts` | Tests phone normalization, database table existence, and n8n webhook idempotency logic. |
| **Database Inspection Script** | Custom Node Script | `backend/src/inspect_db.js` | Forensic query script for verifying live profiles, staff profiles, and Telegram mappings. |
