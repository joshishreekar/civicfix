# CivicFix – AI Public Infrastructure Reporter

Production-style full-stack starter for civic issue reporting.

## Stack
- React + JavaScript + Vite + Tailwind CSS
- Node.js + Express REST API
- PostgreSQL with parameterized SQL
- JWT + bcrypt authentication
- OpenAI text/vision service layer
- Leaflet + OpenStreetMap
- Local upload storage for development

## Roles
1. Citizen: public self-registration and complaint tracking.
2. Department: login only; accounts are created through PostgreSQL/owner SQL.

## Setup

### 1. Database
Create a PostgreSQL database and run:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

For department accounts, first create bcrypt hashes using the server utility:

```bash
cd server
npm install
node utils/generateHash.js "ChangeMe123!"
```

Put the resulting hash into `database/department-insert.sql`, then run that SQL.

### 2. Environment
Copy `.env.example` to `.env` and set values. Never commit `.env`.

### 3. Server
```bash
cd server
npm install
npm run dev
```

### 4. Client
```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown by the terminal.

## OpenAI
Set `OPENAI_API_KEY` on the server only. The service layer uses a text model for structured complaint analysis and a vision-capable model for uploaded images. If the key is absent or the API fails, complaint creation continues with AI status unavailable.

## Maps
The client uses Leaflet with OpenStreetMap tiles. Set `VITE_MAP_TILE_URL` if you want a different compatible tile endpoint. Follow the tile provider's usage policy for production traffic.

## Demo data
`seed.sql` creates citizens, departments, categories, complaints, history, remarks, notifications and resolution evidence. Demo passwords are intentionally development-only and must be changed before production.

Demo citizen:
- email: citizen@example.com
- password: ChangeMe123!

Demo department:
- email: roads@civicfix.local
- password: ChangeMe123!

The seed stores password hashes, not plaintext passwords.

## End-to-end workflow
Citizen registration/login → report with image/location → server validates and stores the complaint → optional AI text/vision analysis → category-to-department routing → notification → department login → status/priority/remarks/resolution evidence → citizen notification → citizen confirms or reopens.

## Important production hardening
For real deployment, use HTTPS, secure cookie/session strategy or carefully configured JWT refresh tokens, object storage/CDN for images, virus/malware scanning, a production PostgreSQL role with least privilege, strict CORS, reverse proxy, centralized logs, backups, and monitoring.
