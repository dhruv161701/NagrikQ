# NagrikQ n8n Telegram Notification Workflow (`nagrikq_n8n_workflow`)

This repository folder contains the complete, deployable Node.js project for the **NagrikQ n8n Automation Service**. It automates Telegram notifications when an International Driving Permit (IDP) application is created.

---

## 📁 Project Directory Structure

```
nagrikq_n8n_workflow (n8n/)
├── workflows/
│   └── nagrikq_idp_notification.json   # Exportable n8n workflow definition
├── .env.example                        # Environment variables template
├── .gitignore                           # Excludes secrets, node_modules, and databases
├── package.json                         # Node.js dependencies & n8n start script
├── render.yaml                          # Render Infrastructure-as-Code deployment blueprint
└── README.md                            # Setup & deployment documentation
```

---

## 🚀 Requirement Checklist & Compatibility

- **No Hardcoded Secrets**: Secrets and tokens are accessed via `$env` environment variables (`$env.WEBHOOK_SECRET`, `$env.TELEGRAM_BOT_TOKEN`).
- **Flexible Frontend & Backend URLs**: The Telegram message link resolves dynamically using `$env.FRONTEND_URL` with fallback to `http://localhost:5173`.
- **Node.js Deployment (No Docker)**: Deployable natively on Render using standard Node.js runtime (`npm start`).
- **Local & Cloud Compatible**: Works identically on local development (`http://localhost:5678`) and Render production.

---

## 💻 Local Setup & Testing

### 1. Install Dependencies
```bash
cd n8n
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your local values:
```env
N8N_HOST=0.0.0.0
N8N_PORT=5678
WEBHOOK_URL=http://localhost:5678/
WEBHOOK_SECRET=nagrikq_idp_secret_key_2026
TELEGRAM_BOT_TOKEN=8874803375:AAECsJ9jyBd8d-LlcNJMEpt1ZyYGqYbkHzQ
FRONTEND_URL=http://localhost:5173
N8N_ENCRYPTION_KEY=nagrikq_n8n_encryption_secret_key_2026
```

### 3. Start Local n8n Instance
```bash
npm start
```
Open `http://localhost:5678` in your browser.

### 4. Import Workflow into n8n UI
1. Open n8n dashboard -> Click **Workflows** -> **Import from File**.
2. Select `n8n/workflows/nagrikq_idp_notification.json`.
3. Toggle the workflow to **Active**.

---

## ☁️ Deployment on Render (Node.js - No Docker)

### Option A: Manual Web Service Setup on Render

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> Select **Web Service**.
3. Connect your GitHub repository.
4. Configure service details:
   - **Name**: `nagrikq-n8n-workflow`
   - **Environment**: `Node`
   - **Root Directory**: `n8n`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: Select `18` or `20`
5. Add Environment Variables under **Environment**:
   | Key | Value / Example | Notes |
   |---|---|---|
   | `N8N_HOST` | `0.0.0.0` | Required for Render port binding |
   | `WEBHOOK_URL` | `https://nagrikq-n8n.onrender.com/` | Your Render Web Service URL |
   | `WEBHOOK_SECRET` | `nagrikq_idp_secret_key_2026` | Must match backend `x-webhook-secret` |
   | `TELEGRAM_BOT_TOKEN` | `8874803375:...` | Your Telegram Bot Father token |
   | `FRONTEND_URL` | `https://nagrikq.onrender.com` | Production website URL |
   | `N8N_ENCRYPTION_KEY` | `secure_random_32_byte_string` | Mandatory key for decrypting n8n secrets |
   | `EXECUTIONS_DATA_PRUNE` | `true` | Prevents storage accumulation |
   | `EXECUTIONS_DATA_MAX_AGE` | `168` | Prunes execution logs after 7 days |

---

### Option B: Render Blueprint Deployment (`render.yaml`)

1. In Render Dashboard, click **New +** -> **Blueprint**.
2. Point Render to your repository branch containing `n8n/render.yaml`.
3. Fill in the requested secret prompt variables (`WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`).

---

## ⚠️ Important Production Readiness Requirements

Default single-instance deployments on ephemeral cloud providers like Render free-tier require specific configuration to be considered **Production-Ready**:

1. **Persistent Database (PostgreSQL)**:
   - By default, n8n uses an embedded SQLite database (`database.sqlite`). On Render free web services, local files are deleted on every redeploy or restart.
   - For production data persistence, connect a managed PostgreSQL instance by defining:
     ```env
     DB_TYPE=postgresdb
     DB_POSTGRESDB_HOST=dpg-xxxxx.render.com
     DB_POSTGRESDB_PORT=5432
     DB_POSTGRESDB_DATABASE=nagrikq_n8n_db
     DB_POSTGRESDB_USER=nagrikq_n8n_user
     DB_POSTGRESDB_PASSWORD=your_secure_password
     ```

2. **Fixed Credentials Encryption Key (`N8N_ENCRYPTION_KEY`)**:
   - n8n uses `N8N_ENCRYPTION_KEY` to encrypt stored credentials. You **must** set a fixed value in your environment variables. If omitted or regenerated randomly, n8n will fail to decrypt saved credentials upon service restart.

3. **Webhook Base URL (`WEBHOOK_URL`)**:
   - Set `WEBHOOK_URL` to your full Render HTTPS URL (e.g. `https://nagrikq-n8n.onrender.com/`). Without this, n8n webhook triggers default to `localhost` URLs.

4. **SSL / Proxy Considerations**:
   - The Telegram node has `allowUnauthorizedCerts: true` enabled to prevent SSL handshake errors on networks with local proxy inspection (e.g. institutional firewalls).

---

## 🧪 Webhook Verification & Testing

Once deployed on Render, update your backend `N8N_WEBHOOK_URL` variable:
```env
N8N_WEBHOOK_URL=https://nagrikq-n8n.onrender.com/webhook/idp-created
WEBHOOK_SECRET=nagrikq_idp_secret_key_2026
```

Test manually using `curl`:
```bash
curl -X POST https://nagrikq-n8n.onrender.com/webhook/idp-created \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: nagrikq_idp_secret_key_2026" \
  -d '{
    "eventId": "test-event-101",
    "eventType": "IDP_CREATED",
    "timestamp": "2026-10-09T12:00:00.000Z",
    "recipientTelegramChatId": 5336362913,
    "application": {
      "id": "app-123",
      "applicationNumber": "IDP2026-TEST",
      "userId": "usr-456",
      "serviceName": "International Driving Permit (IDP)",
      "status": "SUBMITTED",
      "submittedAt": "2026-10-09T12:00:00.000Z"
    }
  }'
```
