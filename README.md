# Artdrobotix Institute Platform — Local Development Guide

Full-stack TypeScript web platform (React 19, Vite 8, Tailwind CSS 4, Express, Drizzle ORM, PostgreSQL, and Firebase Authentication).

## Prerequisites

- **Node.js** 20+ (with `npm`)
- **PostgreSQL** 14+ running locally (or via Docker)

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your local PostgreSQL credentials:

```bash
cp .env.example .env
```

Required database variables in `.env`:

```env
SQL_HOST="localhost"
SQL_DB_NAME="artdrobotix"
SQL_USER="postgres"
SQL_PASSWORD="your_postgres_password"
SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="your_postgres_password"
APP_URL="http://localhost:3000"
```

Optional keys (`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `RESEND_API_KEY`, `GEMINI_API_KEY`) can remain blank for local development — manual bank transfer submission/verification, PDF invoices/receipts, admissions, academics, and student/admin portals work without them.

## 3. Create Database & Push Schema

Create an empty PostgreSQL database named `artdrobotix`:

```bash
createdb artdrobotix
```

Or with Docker:

```bash
docker run --name artdrobotix-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=artdrobotix \
  -p 5432:5432 -d postgres:16
```

Push the Drizzle schema to PostgreSQL:

```bash
npx drizzle-kit push --config=src/db/drizzle.config.ts
```

## 4. Run Locally

Start the combined Express API + Vite dev server on port `3000`:

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.
On first load, the backend automatically seeds the default active programmes, cohorts, and institute settings.

## Production Build

```bash
npm run build
NODE_ENV=production npm start
```

## Notes on Authentication

- Client Firebase configuration lives in `firebase-applet-config.json`.
- Ensure `localhost` is listed under **Authentication → Settings → Authorized domains** in your Firebase Console if using Google or Email sign-in locally.
- The first signed-in user in a fresh local database (or `OWNER_EMAIL` configured in `src/server/middleware/auth.ts`) is automatically assigned `SUPER_ADMIN`.
