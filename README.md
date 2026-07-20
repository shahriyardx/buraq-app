# Buraq Horse Riding School — Dashboard

Responsive web app with **Admin** and **Student** panels: students, attendance,
courses, certificates, invoices, and support.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19**
- **better-auth** — email + password, role-based (Admin / Student)
- **Prisma 7 + PostgreSQL** (driver adapter `@prisma/adapter-pg`)
- **Tailwind v4 + shadcn/ui** (base-nova) — navy/gold theme
- **Cloudflare R2** (S3-compatible) for uploads
- **@react-pdf/renderer** for certificates / invoices / reports, **qrcode** for verification QR
- **Resend** for email
- **Biome** for lint/format · **Bun** as package manager

## Getting started

1. **Install**
   ```bash
   bun install
   ```

2. **Environment** — copy `.env.example` to `.env` and fill in values. Minimum
   to run locally is `DATABASE_URL` and `BETTER_AUTH_SECRET`. R2 and Resend are
   optional (uploads/emails degrade gracefully when unset).
   ```bash
   cp .env.example .env
   # generate a secret:  openssl rand -hex 32
   ```

3. **Database** — start Postgres via Docker Compose, then migrate + seed:
   ```bash
   docker compose up -d   # postgres on :5432 (named volume, healthcheck)
   bun run db:migrate     # apply migrations
   bun run db:seed        # demo admin, students, courses, etc.
   ```

4. **Run**
   ```bash
   bun run dev
   ```
   Open http://localhost:3000

### Seeded logins

| Role    | Email               | Password       |
| ------- | ------------------- | -------------- |
| Admin   | `admin@buraq.test`  | `Admin@12345`  |
| Student | `ayesha@buraq.test` | `Student@123`  |

## Scripts

- `bun run dev` / `build` / `start`
- `bun run lint` — Biome check · `bun run format` — Biome write
- `bun run db:migrate` · `db:seed` · `db:generate` · `db:studio` · `db:deploy`

## Architecture notes

- **Auth**: `src/lib/auth.ts` (better-auth) · `src/lib/dal.ts` is the primary
  authorization layer (`requireAdmin` / `requireStudent`, memoized per request).
  `src/proxy.ts` is the Next 16 Proxy (optimistic cookie redirect only).
- **Panels**: `src/app/(admin)/admin/*` and `src/app/(student)/student/*`.
  `/` routes by role; `/verify/[certificateId]` is public (no login).
- **Modules** follow one pattern: a server `page.tsx` (fetch via Prisma) + a
  `"use server"` `actions.ts` (zod-validated, audited, `revalidatePath`) + client
  table/dialog components. `src/app/(admin)/admin/students` is the reference.
- **Shared**: `src/components/data-table.tsx`, `kpi-card`, `status-badge`,
  `page-header`; `src/lib/{r2,email,qr,csv,ids,pdf,enrollments,users,format}`.
