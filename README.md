# Healthcare Appointment & Follow-up Manager

A production-quality platform with three portals — **Patient**, **Doctor**, and **Admin** — for booking appointments, sharing symptoms, generating AI visit summaries, and managing follow-ups with email and Google Calendar integration.

**Live URL:** https://frontend-xi-woad-63.vercel.app/

---

## Tech Stack

| Layer | Choice | Justification |
|-------|--------|---------------|
| Backend | Node.js + Express + TypeScript | Minimal, mature, easy to deploy on any PaaS |
| Frontend | Next.js 16 + React 19 + TypeScript | App Router, server components, one-click Vercel deploy |
| Database | PostgreSQL 16 | ACID guarantees required for concurrency-safe booking |
| ORM | Prisma 5 | Type-safe queries, migrations, excellent DX |
| Auth | JWT + bcrypt | Stateless, role-based, no session store required |
| LLM | Google Gemini API (gemini-3.6-flash) behind service interface | Swappable implementation; mock fallback for tests |
| Email | SendGrid API + Nodemailer SMTP fallback | Service interface; falls back to console logging when unconfigured |
| Calendar | Google Calendar API (OAuth 2.0) | Patient/doctor calendar event creation, update, delete |
| Background jobs | BullMQ + Redis (or in-process fallback) | Reliable queue with retries; degrades gracefully without Redis |
| Testing | Jest + ts-jest | Unit and integration tests with coverage reporting |

---

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis (optional; jobs run in-process if Redis is absent)

### 1. Clone and install

```bash
git clone <repo-url>
cd HealthCare
npm install
```

### 2. Start databases

```bash
docker compose up -d
```

Or use an existing PostgreSQL instance and update `backend/.env`.

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your database credentials and optional API keys.

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start development servers

```bash
npm run dev:backend   # Express API on http://localhost:4000
npm run dev:frontend  # Next.js on http://localhost:3000
```

### Demo accounts (seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@healthcare.local | Password123 |
| Doctor | doctor@healthcare.local | Password123 |
| Patient | patient@healthcare.local | Password123 |

---

## Environment Variables

See `backend/.env.example` for the full reference. Key variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (use a long random string in production) |
| `PORT` | No | Backend port (default `4000`) |
| `FRONTEND_URL` | No | Allowed CORS origin (default `http://localhost:3000`) |
| `REDIS_URL` | No | BullMQ connection (jobs run in-process if empty) |
| `SLOT_HOLD_MINUTES` | No | Hold expiry before confirmation (default `10`) |
| `LLM_API_KEY` | No | Google AI Studio key (mock service used if empty) |
| `SENDGRID_API_KEY` | No | SendGrid API key for email delivery |
| `EMAIL_SMTP_HOST` | No | SMTP host (console logger used if empty) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Calendar OAuth (calendar writes skipped if empty) |
| `GOOGLE_AUTH_CLIENT_ID` / `GOOGLE_AUTH_CLIENT_SECRET` | No | Google login OAuth (falls back to Calendar credentials) |

---

## API Documentation

All endpoints are prefixed with `/api/v1`. All responses are JSON. Errors follow the shape:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register patient |
| POST | `/auth/login` | No | Login |
| GET | `/auth/google` | No | Get Google OAuth URL |
| GET | `/auth/google/callback` | No | Google OAuth callback |
| GET | `/auth/me` | Yes | Current user |

**POST /auth/register**
```json
// Request
{ "email": "user@example.com", "password": "Password123", "name": "John Doe" }

// Response 201
{ "user": { "id": "uuid", "email": "user@example.com", "role": "PATIENT", "name": "John Doe" }, "token": "jwt.token.here" }
```

**POST /auth/login**
```json
// Request
{ "email": "user@example.com", "password": "Password123" }

// Response 200
{ "user": { "id": "uuid", "email": "user@example.com", "role": "PATIENT", "name": "John Doe" }, "token": "jwt.token.here" }
```

**GET /auth/me**
```json
// Response 200
{ "user": { "id": "uuid", "email": "user@example.com", "role": "PATIENT", "name": "John Doe", "calendarConnected": false, "doctorProfileId": null } }
```

### Doctors

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/doctors` | Yes | List doctors (`?specialization=`) |
| GET | `/doctors/:id` | Yes | Doctor profile |
| GET | `/appointments/available-slots` | Yes | Available slots (`?doctorId=&date=`) |

**GET `/doctors?specialization=Cardiology`**
```json
// Response 200
{ "doctors": [{ "id": "uuid", "specialization": "Cardiology", "slotDuration": 30, "workingHours": { "monday": ["09:00", "17:00"] }, "user": { "id": "uuid", "email": "dr@example.com", "name": "Dr. Smith" } }] }
```

**GET `/appointments/available-slots?doctorId=uuid&date=2026-08-25`**
```json
// Response 200
{ "slots": [{ "start": "2026-08-25T09:00:00.000Z", "end": "2026-08-25T09:30:00.000Z" }] }
```

### Appointments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/appointments/holds` | Patient | Create a slot hold |
| POST | `/appointments/book` | Patient | Book from hold or direct book |
| GET | `/appointments` | Yes | List for current user |
| GET | `/appointments/:id` | Yes | Appointment detail |
| POST | `/appointments/:id/cancel` | Yes | Cancel appointment |
| POST | `/appointments/:id/reschedule` | Yes | Reschedule |
| POST | `/appointments/:id/post-visit-notes` | Doctor | Submit notes + prescription |
| GET | `/appointments/:id/pre-visit` | Yes | Pre-visit summary |
| GET | `/appointments/:id/post-visit` | Yes | Post-visit summary |
| POST | `/appointments/:id/pre-visit/regenerate` | Doctor/Admin | Regenerate pre-visit summary |
| POST | `/appointments/:id/post-visit/regenerate` | Doctor/Admin | Regenerate post-visit summary |

**POST /appointments/holds**
```json
// Request
{ "doctorId": "uuid", "slotStart": "2026-08-25T09:00:00.000Z" }

// Response 201
{ "hold": { "id": "uuid", "expiresAt": "2026-08-25T08:40:00.000Z" } }
```

**POST /appointments/book**
```json
// Request (from hold)
{ "holdId": "uuid", "symptoms": "Chest pain and shortness of breath for 3 days..." }

// Request (direct book)
{ "doctorId": "uuid", "slotStart": "2026-08-25T09:00:00.000Z", "symptoms": "Chest pain..." }

// Response 201
{ "appointment": { "id": "uuid", "status": "CONFIRMED", "occupancyKey": "doctorId:slotStart", "slotStart": "...", "slotEnd": "...", "patient": { "id": "uuid", "email": "...", "name": "..." }, "doctor": { "id": "uuid", "user": { "name": "Dr. Smith" } }, "symptomForm": { "symptoms": "..." }, "preVisit": { "status": "PENDING" } } }
```

**POST /appointments/:id/post-visit-notes**
```json
// Request
{ "notes": "Diagnosed with costochondritis...", "medication": "Ibuprofen", "dosage": "400mg", "frequency": "three times daily for 7 days" }

// Response 200
{ "note": { "id": "uuid", "appointmentId": "uuid", "notes": "..." } }
```

**POST /appointments/:id/reschedule**
```json
// Request
{ "slotStart": "2026-08-26T10:00:00.000Z" }

// Response 200
{ "appointment": { "id": "uuid", "status": "CONFIRMED", "slotStart": "..." } }
```

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | Admin | All users |
| GET | `/admin/appointments` | Admin | All appointments |
| GET | `/admin/doctors` | Admin | All doctors |
| POST | `/admin/doctors` | Admin | Create doctor |
| PATCH | `/admin/doctors/:id` | Admin | Update doctor |
| DELETE | `/admin/doctors/:id` | Admin | Delete doctor |
| POST | `/admin/doctors/:id/leave` | Admin | Mark leave for a date |
| DELETE | `/admin/doctors/leave/:leaveDayId` | Admin | Remove leave day |
| GET | `/admin/statistics` | Admin | Counts |

**POST /admin/doctors**
```json
// Request
{ "email": "dr@example.com", "password": "Password123", "name": "Dr. Smith", "specialization": "Cardiology", "slotDuration": 30, "workingHours": { "monday": ["09:00", "17:00"], "tuesday": ["09:00", "17:00"] } }

// Response 201
{ "doctor": { "id": "uuid", "email": "dr@example.com", "name": "Dr. Smith", "role": "DOCTOR", "doctorProfile": { "id": "uuid", "specialization": "Cardiology", "slotDuration": 30 } } }
```

**POST /admin/doctors/:id/leave**
```json
// Request
{ "date": "2026-08-26", "reason": "Conference" }

// Response 201
{ "leaveDay": { "id": "uuid", "doctorId": "uuid", "date": "2026-08-26T00:00:00.000Z", "reason": "Conference" } }
```

### Calendar

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/calendar/connect` | Yes | Get Google OAuth URL |
| GET | `/calendar/callback` | No | OAuth callback |

---

## Database Schema

### Core tables

| Table | Purpose |
|-------|---------|
| `users` | All accounts (patient / doctor / admin). Passwords bcrypt-hashed. Google OAuth tokens stored here. |
| `doctor_profiles` | Specialisation, slot duration, working hours JSON. |
| `doctor_leave_days` | Per-doctor leave dates (unique on `doctorId + date`). |
| `appointments` | Bookings with status enum. `occupancyKey` unique while active to prevent double-booking. |
| `slot_holds` | Temporary holds with expiry. Unique on `doctorId + slotStart`. |
| `symptom_forms` | Patient symptoms submitted before confirmation. |
| `pre_visit_summaries` | LLM-generated urgency, chief complaint, suggested questions. |
| `post_visit_notes` | Raw doctor notes. |
| `post_visit_summaries` | Patient-friendly LLM summary + medication schedule + follow-up steps. |
| `prescriptions` | Medication, dosage, frequency. |
| `medication_reminders` | Scheduled reminder timestamps with retry tracking. |
| `email_logs` | Every email attempt and outcome. |
| `calendar_events` | Google Calendar event IDs per appointment. |
| `outbox_events` | Outbox pattern for reliable email delivery. |

### Indexes

- `appointments(doctorId, slotStart)` — fast slot lookups
- `appointments(occupancyKey)` — unique while active, enforces no double-booking
- `slot_holds(doctorId, slotStart)` — unique, prevents concurrent holds
- `slot_holds(expiresAt)` — fast expiry cleanup
- `medication_reminders(remindAt, sent)` — fast reminder job queries
- `outbox_events(status, createdAt)` — fast outbox processing queries

### Enums

```sql
ROLE: PATIENT | DOCTOR | ADMIN
APPOINTMENT_STATUS: HELD | CONFIRMED | CANCELLED | COMPLETED | CANCELLED_DUE_TO_LEAVE | NEEDS_RESCHEDULE
SUMMARY_STATUS: PENDING | READY | FAILED
```

---

## LLM Prompts

### Pre-visit summary

```
Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>

Return ONLY valid JSON:
{"urgency":"Low|Medium|High","chief_complaint":"string","suggested_questions":["q1","q2","q3"]}
```

### Post-visit summary

```
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>

Return ONLY valid JSON:
{"summary":"string","medication_schedule":[{"medication":"name","dosage":"amount","frequency":"timing","duration":"days"}],"follow_up_steps":["step"]}
```

Both prompts:
- Mandate structured JSON output
- Forbid markdown wrappers (plain JSON only)
- Are validated with Zod schemas (`PreVisitSchema`, `PostVisitSchema`)
- Include fallback: if LLM fails or hallucinates, the summary is marked `FAILED` and the user is notified

Get a free Gemini API key at https://aistudio.google.com/app/apikey

---

## Google Calendar OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Create OAuth 2.0 credentials (Web application).
4. Add authorized redirect URI: `https://your-backend/api/v1/calendar/callback`.
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALENDAR_REDIRECT_URI` in `backend/.env`.
6. For Google Login, also set `GOOGLE_AUTH_CLIENT_ID`, `GOOGLE_AUTH_CLIENT_SECRET`, and `GOOGLE_AUTH_REDIRECT_URI` (or leave empty to fall back to Calendar credentials).
7. **Important:** Add test users in **APIs & Services** → **OAuth consent screen** → **Test users** while in Testing mode.

Calendar failures are caught and logged; they never block booking or other flows.

---

## Running Tests

```bash
npm test
```

This runs Jest with coverage across `src/utils/**`, `src/services/llmService.ts`, `src/services/appointmentService.ts`, and `src/services/doctorService.ts`.

Coverage includes:
- **Slot availability calculation** (`slot-holds.test.ts`, `slotAvailability.ts`)
- **Double-booking prevention** (`double-booking.test.ts`)
- **Leave-conflict cascade** (`leave-conflict.test.ts`)
- **LLM prompt parsing/validation** (via `llmParse.ts` unit coverage)
- **Email retry logic** (via `retry.ts` coverage)

---

## Design Decisions

- **Double-booking prevention:** A unique `occupancyKey` on active appointments plus a unique `(doctorId, slotStart)` constraint on slot_holds prevents concurrent bookings. The unique index causes one transaction to fail with a constraint error, which we catch and translate to a `409 SLOT_TAKEN` response.
- **Slot hold mechanism:** A `slot_holds` table with a unique `(doctorId, slotStart)` constraint and TTL `expiresAt` lets a patient reserve a slot for 10 minutes before confirming. Expired holds are cleaned up by a background job and lazily on read.
- **Doctor leave conflict handling:** When an admin marks leave, a background job (BullMQ) processes affected appointments asynchronously, flipping them to `NEEDS_RESCHEDULE`, clearing their `occupancyKey`, deleting calendar events, and emailing patients via the outbox pattern.
- **Outbox Pattern:** Email notifications are published to an `outbox_events` table and processed by a background worker, ensuring reliable delivery even if the email service is temporarily unavailable.
- **Idempotency:** Google Calendar event creation includes an idempotency check to prevent duplicate events if the job is retried.
- **LLM failure handling:** LLM calls are wrapped in exponential backoff (3 attempts). On final failure, the summary is marked `FAILED`, the booking/visit is not rolled back, and the relevant party is notified by email.
- **Notification failure handling:** All email sends use a retry-with-backoff layer. Failures are logged to `email_logs` with error details. The caller flow never blocks on email success.

---

## Scalability & Performance

- **Slot lookups:** Filtered by `doctorId + slotStart` composite index; holds and appointments are fetched in a single query per doctor per day.
- **Background jobs:** BullMQ workers can be scaled horizontally. Without Redis, jobs run in-process with the same retry logic, suitable for single-instance deploys.
- **Caching:** Doctor working hours and profiles are cacheable (Redis or HTTP cache headers) because they change infrequently.
- **Under load:** Add connection pooling (PgBouncer), read replicas for reporting queries (`/admin/*`), and partition the BullMQ queue by event type if throughput grows.

---

## Deploying

### Frontend on Vercel

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set **Root Directory** to `frontend` (or use the included `vercel.json`).
4. Add environment variable `NEXT_PUBLIC_API_URL` pointing to your deployed backend.
5. Deploy.

### Backend on Render / Railway

1. Create a new Web Service pointing to the repository.
2. Set **Root Directory** to `backend`.
3. Set build command: `npm install && npm run build && npm run migrate`
4. Set start command: `npm start`
5. Add all required environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.).
6. Deploy.

---

## Project Structure

```
HealthCare/
  backend/
    prisma/               # Schema, migrations, seed
    src/
      config/             # Env-based configuration
      jobs/               # BullMQ queue + background workers
      middleware/          # Auth + role guards
      routes/              # Express routers
      services/            # Business logic (appointment, auth, doctor, LLM, email, calendar, outbox)
      utils/               # Slots, retry, LLM parsing, medication scheduling
      index.ts             # App entry
    tests/                 # Jest tests
  frontend/
    src/
      app/                 # Next.js App Router pages
      components/          # Shared UI (PortalShell, Button, Card, StatusBadge, ScrollReveal)
      contexts/            # Auth context
      lib/                 # API client, types
```
