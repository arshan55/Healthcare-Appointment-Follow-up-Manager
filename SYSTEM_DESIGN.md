# System Design

## Architecture Overview

This is a three-portal clinical workflow platform built as a decoupled monorepo:

- **Backend** (`/backend`): Express + TypeScript + Prisma, serving a versioned REST API.
- **Frontend** (`/frontend`): Next.js 16 App Router, deployed as a static+SSR app.
- **Database**: Single PostgreSQL instance with a fully migration-managed schema.
- **Queue**: BullMQ + Redis for background jobs (graceful in-process fallback).

Communication is JSON over HTTP. JWT carries identity and role. The backend is stateless (except for the database and optional Redis queue).

---

## Double-booking Prevention

### Database-Level Guardrails

The primary defense is a **unique `occupancyKey` index** on the `appointments` table while a slot is active (`HELD` or `CONFIRMED`). The value is `${doctorId}:${slotStartISO}`. Only one row can hold a given key at a time.

```sql
-- Prisma schema
model Appointment {
  occupancyKey String? @unique  -- Unique while active
  @@index([doctorId, slotStart])
}
```

The `slot_holds` table has a **unique `(doctorId, slotStart)` constraint**, so a second concurrent hold for the same doctor and start time fails immediately at the database level.

```sql
model SlotHold {
  @@unique([doctorId, slotStart])
}
```

### Application-Level Checks

Inside the database transaction that creates a hold or confirms a booking:
1. Query for existing active appointments with the same `occupancyKey`
2. If found, throw `409 SLOT_TAKEN`
3. Attempt the INSERT — if it violates the unique constraint, catch and return `409 SLOT_TAKEN`

### Concurrency Safety

```
Transaction 1: Check occupancyKey → Not found → INSERT (success)
Transaction 2: Check occupancyKey → Not found → INSERT (fails with unique constraint violation)
```

Even if two transactions both pass the application-level check (race condition), the unique index guarantees only one INSERT succeeds. The other receives a constraint violation, which is caught and translated to a user-friendly error.

---

## Slot Hold Mechanism

When a patient selects a slot, a `slot_holds` row is created with:
- `doctorId`, `patientId`, `slotStart`, `slotEnd`
- `expiresAt` = now + `SLOT_HOLD_MINUTES` (default 10 minutes)

The `slot_holds` table has a unique index on `(doctorId, slotStart)`, so a second concurrent hold for the same doctor and start time fails immediately.

Expired holds are released in two ways:
1. A background job runs every 5 minutes and deletes all holds where `expiresAt <= now()`.
2. The `getAvailableSlots` endpoint lazily deletes expired holds before computing availability.

When a hold expires or is cancelled, the slot immediately becomes bookable again.

---

## Doctor Leave Conflict Handling

### Asynchronous Background Processing

When an admin marks a doctor on leave for a specific date, the system:

1. **Creates the leave record** in the database (synchronous)
2. **Enqueues a background job** (`leave-conflict`) via BullMQ (asynchronous)
3. **Returns immediately** to the admin (no waiting)

The background job:
1. Finds all appointments on that date with status `HELD` or `CONFIRMED`
2. Flips each to `NEEDS_RESCHEDULE` and sets `occupancyKey = null` so the slot is immediately reusable
3. Deletes any Google Calendar events tied to the appointment
4. Publishes leave-notification emails to the outbox for reliable delivery

### Why Async?

- The number of affected appointments is unpredictable (could be dozens)
- Email delivery and calendar API calls are slow network operations
- The admin should not wait for all notifications to complete
- Background jobs are retried automatically on failure (3 attempts with exponential backoff)

---

## Notification & Calendar Reliability

### Outbox Pattern

All email notifications use the **Outbox Pattern** for reliable delivery:

1. **Publish**: When an event occurs (booking, cancellation, leave), write an `outbox_events` row with the email details
2. **Process**: A background worker picks up pending outbox events and sends them via email
3. **Retry**: Failed sends increment the `attempts` counter and are retried (up to 3 attempts)
4. **Dead Letter**: Events that exceed max attempts are marked `FAILED` for manual inspection

```sql
model OutboxEvent {
  id          String   @id @default(uuid())
  eventType   String
  payload     Json
  status      String   @default("PENDING")
  attempts    Int      @default(0)
  lastError   String?
  createdAt   DateTime @default(now())
  processedAt DateTime?
}
```

### Idempotency for Google Calendar

Google Calendar event creation includes an **idempotency check**:
- Before creating events, check if `calendar_events` already has entries for the appointment
- If both `patientEventId` and `doctorEventId` exist, skip creation (prevents duplicates)
- This ensures that if the background job is retried, duplicate calendar events are not created

### Retry with Exponential Backoff

All external API calls (LLM, email, calendar) use a `withBackoff` utility:
- 3 attempts by default
- Exponential delay: 2s, 4s, 8s between retries
- Final failure is caught and logged; the user flow continues

---

## LLM Integration

### Prompt Engineering

Both LLM prompts:
- Mandate **structured JSON output** (no prose, no markdown)
- Forbid markdown wrappers (`Return ONLY valid JSON`)
- Specify exact field names and types

### Validation & Fallback

```
LLM Response → extractJson() → Zod Schema Validation → Store result
     ↓                ↓                ↓
  Network Error   Invalid JSON    Schema Mismatch
     ↓                ↓                ↓
  Retry (3x)      Throw error     Throw error
     ↓                ↓                ↓
  Final failure → Mark FAILED → Notify user
```

- **Zod schemas** (`PreVisitSchema`, `PostVisitSchema`) validate structure and types
- **MockLLMService** provides deterministic output when no API key is configured
- On final failure, the summary is marked `FAILED` and the relevant party is notified by email
- The booking/visit is **never rolled back** due to LLM failure

---

## Error Handling

All errors follow a consistent shape:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

Common error codes:
- `SLOT_TAKEN` (409) — Slot is no longer available
- `HOLD_EXPIRED` (409) — Slot hold has expired
- `DOCTOR_ON_LEAVE` (400) — Doctor is on leave during requested slot
- `INVALID_STATUS` (400) — Appointment cannot be cancelled/rescheduled
- `FORBIDDEN` (403) — Insufficient permissions
- `NOT_FOUND` (404) — Resource not found

---

## Security

- **JWT tokens** with 30-day expiry carry identity and role
- **Role-based access control** enforced at route level (`roleMiddleware`)
- **bcrypt** password hashing (10 rounds)
- **CORS** restricted to the frontend origin
- **Input validation** via Zod schemas on all endpoints
- **Google OAuth** for secure authentication without password storage

---

## Scalability Considerations

- **Slot lookups:** Filtered by `doctorId + slotStart` composite index
- **Background jobs:** BullMQ workers scale horizontally with Redis
- **Connection pooling:** Prisma connection pool can be sized for load
- **Read replicas:** Admin reporting queries can be routed to read replicas
- **Caching:** Doctor profiles and working hours can be cached (Redis or HTTP headers)
- **Queue partitioning:** BullMQ queues can be partitioned by event type if throughput grows
