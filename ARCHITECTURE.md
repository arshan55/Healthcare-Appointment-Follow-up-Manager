# Architecture

## Overview

This is a three-portal clinical workflow platform built as a decoupled monorepo:

- **Backend** (`/backend`): Express + TypeScript + Prisma, serving a versioned REST API.
- **Frontend** (`/frontend`): Next.js 16 App Router, deployed as a static+SSR app.
- **Database**: Single PostgreSQL instance with a fully migration-managed schema.

Communication is JSON over HTTP. JWT carries identity and role. The backend is stateless (except for the database and optional Redis queue).

## Key Architectural Decisions

### 1. Stateless JWT auth instead of sessions

**Decision:** Use short-to-medium-lived JWTs with no server-side session store.

**Trade-off:** We cannot revoke tokens before expiry without a denylist. For this scope, the 30-day expiry is acceptable. If revocation becomes necessary, we can add a Redis-backed denylist without changing the client.

### 2. Prisma as the data-access layer

**Decision:** All database access goes through Prisma Client. Migrations are committed and run on deploy.

**Trade-off:** Prisma adds abstraction and can be slower than raw SQL for complex reporting queries. We mitigate this by keeping reporting queries simple and adding composite indexes for the hot paths (`appointments(doctorId, slotStart)`, `appointments(occupancyKey)`).

### 3. Slot hold + occupancyKey for concurrency safety

**Decision:** A `slot_holds` table with a unique `(doctorId, slotStart)` constraint plus an `occupancyKey` unique index on active appointments. Booking and hold creation both happen inside Prisma transactions with `SELECT ... FOR UPDATE` on the doctor row.

**Trade-off:** Row-level locking serializes all booking attempts for a single doctor. For a small-to-mid clinic this is fine. Under very high contention we could switch to an atomic `INSERT ... ON CONFLICT` pattern, but the explicit transaction makes the intent clearer and is easier to audit.

### 4. Background jobs degrade gracefully

**Decision:** BullMQ + Redis when available, otherwise in-process `setImmediate` execution with the same retry/backoff logic.

**Trade-off:** Without Redis, job persistence and horizontal scaling are lost. For a single-instance deploy (Render free tier, local dev) this is the right trade-off because it removes a required infrastructure dependency.

### 5. Service interfaces for external integrations

**Decision:** LLM, Email, and Calendar are accessed through interfaces (`LLMService`, `EmailService`, `CalendarService`) with concrete implementations swapped based on environment.

**Trade-off:** More files and indirection, but it makes testing trivial (mock implementations) and lets us change providers without touching business logic.

### 6. Demo-mode fallback in the frontend

**Decision:** The frontend `api.ts` falls back to in-memory demo data when the backend is unreachable.

**Trade-off:** This is only intended for local development and UI review. In production the fallback should never trigger. It does, however, mean the frontend can be reviewed independently of the backend.

## What I'd improve with more time

- **Real-time availability:** WebSockets or polling so patients see slot changes instantly.
- **Telemedicine links:** Add video consultation URLs to calendar events.
- **Audit log:** Immutable log of status changes on appointments.
- **Prescription refill workflow:** Patient-initiated refill requests routed to the doctor.
- **Rate limiting and brute-force protection** on auth endpoints.
- **Read replicas** for admin reporting dashboards.
- **End-to-end tests** with Playwright covering the full booking flow in a real browser.
