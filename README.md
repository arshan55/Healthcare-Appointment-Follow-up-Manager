# Healthcare Appointment & Follow-up Manager

A production-quality platform with three portals — **Patient**, **Doctor**, and **Admin** — for booking appointments, sharing symptoms, generating AI visit summaries, and managing follow-ups with email and Google Calendar integration.

---

## Tech Stack

| Layer | Choice | Justification |
|-------|--------|---------------|
| Backend | Node.js + Express + TypeScript | Minimal, mature, easy to deploy on any PaaS |
| Frontend | Next.js 16 + React 19 + TypeScript | App Router, server components, one-click Vercel deploy |
| Database | PostgreSQL 16 | ACID guarantees required for concurrency-safe booking |
| ORM | Prisma 5 | Type-safe queries, migrations, excellent DX |
| Auth | JWT + bcrypt | Stateless, role-based, no session store required |
| LLM | Google Gemini API (gemini-2.0-flash) behind service interface | Swappable implementation; mock fallback for tests |
| Email | Nodemailer + retry/backoff | Service interface; falls back to console logging when SMTP is unconfigured |
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
| `EMAIL_SMTP_HOST` | No | SMTP host (console logger used if empty) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Calendar OAuth (calendar writes skipped if empty) |

---

## API Documentation

All endpoints are prefixed with `/api/v1`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register patient (`email`, `password`, `name`) |
| POST | `/auth/login` | Login (`email`, `password`) |
| GET | `/auth/me` | Current user (requires token) |

### Doctors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/doctors` | List doctors (`?specialization=`) |
| GET | `/doctors/:id` | Doctor profile |
| GET | `/doctors/:id/slots` | Available slots for a date (`?date=`) |
| PATCH | `/doctors/:id` | Update profile (doctor/admin) |

### Appointments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/appointments/holds` | Create a slot hold (patient) |
| POST | `/appointments/book` | Book from hold or direct book (patient) |
| GET | `/appointments` | List for current user |
| GET | `/appointments/:id` | Appointment detail |
| POST | `/appointments/:id/cancel` | Cancel appointment |
| POST | `/appointments/:id/reschedule` | Reschedule (`slotStart`) |
| POST | `/appointments/:id/post-visit-notes` | Submit notes + prescription (doctor) |
| GET | `/appointments/:id/pre-visit` | Pre-visit summary |
| GET | `/appointments/:id/post-visit` | Post-visit summary |
| POST | `/appointments/:id/pre-visit/regenerate` | Regenerate pre-visit summary |
| POST | `/appointments/:id/post-visit/regenerate` | Regenerate post-visit summary |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | All users |
| GET | `/admin/appointments` | All appointments |
| GET | `/admin/doctors` | All doctors |
| POST | `/admin/doctors` | Create doctor |
| PATCH | `/admin/doctors/:id` | Update doctor |
| DELETE | `/admin/doctors/:id` | Delete doctor |
| POST | `/admin/doctors/:id/leave` | Mark leave for a date |
| DELETE | `/admin/doctors/leave/:leaveDayId` | Remove leave day |
| GET | `/admin/statistics` | Counts |

### Calendar

| Method | Path | Description |
|--------|------|-------------|
| GET | `/calendar/connect` | Get Google OAuth URL |
| GET | `/calendar/callback` | OAuth callback |

### Error shape

All errors return:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

---

## Database Schema

### Core tables

| Table | Purpose |
|-------|---------|
| `users` | All accounts (patient / doctor / admin). Passwords bcrypt-hashed. |
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

### Indexes

- `appointments(doctorId, slotStart)` — fast slot lookups
- `appointments(occupancyKey)` — unique while active, enforces no double-booking
- `slot_holds(doctorId, slotStart)` — unique, prevents concurrent holds
- `slot_holds(expiresAt)` — fast expiry cleanup
- `medication_reminders(remindAt, sent)` — fast reminder job queries

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

Both prompts are behind a service interface (`src/services/llmService.ts`). If the API key is missing or the environment is `test`, a deterministic `MockLLMService` is used.

Get a free Gemini API key at https://aistudio.google.com/app/apikey

---

## Google Calendar OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Create OAuth 2.0 credentials (Web application).
4. Add authorized redirect URI: `https://your-backend/api/v1/calendar/callback`.
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALENDAR_REDIRECT_URI` in `backend/.env`.

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

- **Double-booking prevention:** A unique `occupancyKey` on active appointments plus a row-level `FOR UPDATE` lock inside a Prisma transaction serializes concurrent holds/books for the same doctor and time.
- **Slot hold mechanism:** A `slot_holds` table with a unique `(doctorId, slotStart)` constraint and TTL `expiresAt` lets a patient reserve a slot for 10 minutes before confirming. Expired holds are cleaned up by a background job and lazily on read.
- **Doctor leave conflict handling:** When an admin marks leave, a background-style handler flips affected active appointments to `NEEDS_RESCHEDULE`, clears their `occupancyKey`, deletes calendar events, and emails the patient.
- **LLM failure handling:** LLM calls are wrapped in exponential backoff (3 attempts). On final failure, the summary is marked `FAILED`, the booking/visit is not rolled back, and the relevant party is notified by email.
- **Notification failure handling:** All email sends use a retry-with-backoff layer. Failures are logged to `email_logs` with error details. The caller flow (booking, cancellation, leave) never blocks on email success.

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
      middleware/         # Auth + role guards
      routes/             # Express routers
      services/           # Business logic (appointment, auth, doctor, LLM, email, calendar)
      utils/              # Slots, retry, LLM parsing, medication scheduling
      index.ts            # App entry
    tests/                # Jest tests
  frontend/
    src/
      app/                # Next.js App Router pages
      components/         # Shared UI (PortalShell, Button, Card, StatusBadge)
      contexts/           # Auth context
      lib/                # API client, types
```
