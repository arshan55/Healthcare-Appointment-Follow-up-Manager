# System Design

## Double-booking Prevention

The primary guard is a unique `occupancyKey` index on the `appointments` table while a slot is active (`HELD` or `CONFIRMED`). The value is `${doctorId}:${slotStartISO}`. Only one row can hold a given key at a time.

Inside the database transaction that creates a hold or confirms a booking, we also run `SELECT ... FOR UPDATE` on the doctor row. This serializes concurrent transactions touching the same doctor, so two patients racing for the same slot cannot both pass the application-level check before either writes.

If the lock is somehow bypassed (e.g., a bug or future code path), the unique index on `occupancyKey` causes one transaction to fail with a constraint error, which we catch and translate to a `409 SLOT_TAKEN` response.

## Slot Hold Mechanism

When a patient selects a slot, a `slot_holds` row is created with:
- `doctorId`, `patientId`, `slotStart`, `slotEnd`
- `expiresAt` = now + `SLOT_HOLD_MINUTES` (default 10 minutes)

The `slot_holds` table has a unique index on `(doctorId, slotStart)`, so a second concurrent hold for the same doctor and start time fails immediately.

Expired holds are released in two ways:
1. A background job runs every 5 minutes and deletes all holds where `expiresAt <= now()`.
2. The `getAvailableSlots` endpoint lazily deletes expired holds before computing availability.

When a hold expires or is cancelled, the slot immediately becomes bookable again.

## Doctor Leave Conflict Handling

When an admin marks a doctor on leave for a specific date, the `handleLeaveConflicts` flow:
1. Finds all appointments on that date with status `HELD` or `CONFIRMED`.
2. Flips each to `NEEDS_RESCHEDULE` and sets `occupancyKey = null` so the slot is immediately reusable.
3. Deletes any Google Calendar events tied to the appointment.
4. Sends a leave-notification email to the patient with instructions to pick a new time.

The patient can then reschedule from the patient portal. The doctor sees the appointment flagged in their schedule.

## Notification Failure Handling

All outbound emails go through `EmailService`, which uses Nodemailer in production and a console logger when SMTP is unconfigured. Every send is wrapped in `withBackoff`, which retries up to 3 times with exponential backoff (2s, 4s, 8s).

Failures are persisted to the `email_logs` table with the error message and attempt count. The application flow (booking, cancellation, leave processing) does not depend on email success — email errors are logged but never thrown up to the user-facing response.

Similarly, Google Calendar operations are wrapped in try/catch. Failures are recorded in `calendar_events.lastError` and the booking flow continues normally.
