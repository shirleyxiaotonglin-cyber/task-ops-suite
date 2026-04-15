# Task Ops Deployment Guide

This project already uses shared server-side data (`PostgreSQL + Prisma + NextAuth`), so multi-device data sync is enabled once you deploy it to a public URL with one cloud database.

## 1) Create a cloud PostgreSQL database

Use Neon, Supabase, Railway, or any managed PostgreSQL.

- Create a database.
- Copy the connection string.
- Ensure SSL is enabled (usually `?sslmode=require`).

## 2) Configure local environment

Create `.env.local` from `.env.example` and fill these values:

- `DATABASE_URL`: cloud PostgreSQL connection string
- `AUTH_SECRET`: strong random string (`openssl rand -base64 32`)
- `AUTH_URL`: your site URL
  - local dev: `http://localhost:3000`
  - production: `https://<your-domain>`

## 3) Initialize database schema

Run in `task-ops`:

```bash
npm install
npm run db:push
npm run db:seed
```

If you prefer migrations:

```bash
npm run db:migrate
npm run db:seed
```

## 4) Deploy to Vercel

1. Import this repository into Vercel.
2. Set environment variables in Vercel Project Settings:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (must match the deployed domain)
3. Deploy.

## 5) Verify cross-device sharing

1. Open `https://<your-domain>/health`, expect `ok: true` and `db: connected`.
2. On device A, log in and create/update a task.
3. On device B, log in with the same account and refresh page.
4. Confirm the same task data appears.

## 6) Team sharing (different users)

To share data across different accounts:

- Add users as project members in project settings.
- Keep each user signed in with their own account.
- Data visibility is controlled by project membership and role.

## Common issues

- Login loop: `AUTH_URL` does not match the real domain.
- Unauthorized: `AUTH_SECRET` missing or inconsistent across environments.
- Empty data: `DATABASE_URL` points to a different database than expected.
