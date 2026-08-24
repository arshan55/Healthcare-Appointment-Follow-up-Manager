-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');
CREATE TYPE "AppointmentStatus" AS ENUM ('HELD', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'CANCELLED_DUE_TO_LEAVE', 'NEEDS_RESCHEDULE');
CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "doctor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL,
    "workingHours" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "doctor_profiles_userId_key" ON "doctor_profiles"("userId");
CREATE INDEX "doctor_profiles_specialization_idx" ON "doctor_profiles"("specialization");
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "doctor_leave_days" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctor_leave_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "doctor_leave_days_doctorId_date_key" ON "doctor_leave_days"("doctorId", "date");
CREATE INDEX "doctor_leave_days_doctorId_idx" ON "doctor_leave_days"("doctorId");
ALTER TABLE "doctor_leave_days" ADD CONSTRAINT "doctor_leave_days_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "slotEnd" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "occupancyKey" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "appointments_occupancyKey_key" ON "appointments"("occupancyKey");
CREATE INDEX "appointments_doctorId_slotStart_idx" ON "appointments"("doctorId", "slotStart");
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "slot_holds" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "slotEnd" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slot_holds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "slot_holds_doctorId_slotStart_key" ON "slot_holds"("doctorId", "slotStart");
CREATE INDEX "slot_holds_expiresAt_idx" ON "slot_holds"("expiresAt");
CREATE INDEX "slot_holds_patientId_idx" ON "slot_holds"("patientId");
ALTER TABLE "slot_holds" ADD CONSTRAINT "slot_holds_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slot_holds" ADD CONSTRAINT "slot_holds_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "symptom_forms" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "symptom_forms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "symptom_forms_appointmentId_key" ON "symptom_forms"("appointmentId");
ALTER TABLE "symptom_forms" ADD CONSTRAINT "symptom_forms_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "pre_visit_summaries" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "rawResponse" JSONB,
    "urgency" TEXT,
    "chiefComplaint" TEXT,
    "suggestedQuestions" JSONB,
    "status" "SummaryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pre_visit_summaries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pre_visit_summaries_appointmentId_key" ON "pre_visit_summaries"("appointmentId");
ALTER TABLE "pre_visit_summaries" ADD CONSTRAINT "pre_visit_summaries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "post_visit_notes" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_visit_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "post_visit_notes_appointmentId_key" ON "post_visit_notes"("appointmentId");
ALTER TABLE "post_visit_notes" ADD CONSTRAINT "post_visit_notes_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "post_visit_summaries" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "rawResponse" JSONB,
    "summary" TEXT,
    "medicationSchedule" JSONB,
    "followUpSteps" JSONB,
    "status" "SummaryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "post_visit_summaries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "post_visit_summaries_appointmentId_key" ON "post_visit_summaries"("appointmentId");
ALTER TABLE "post_visit_summaries" ADD CONSTRAINT "post_visit_summaries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prescriptions_appointmentId_key" ON "prescriptions"("appointmentId");
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "medication_reminders" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    CONSTRAINT "medication_reminders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "medication_reminders_prescriptionId_idx" ON "medication_reminders"("prescriptionId");
CREATE INDEX "medication_reminders_remindAt_sent_idx" ON "medication_reminders"("remindAt", "sent");
ALTER TABLE "medication_reminders" ADD CONSTRAINT "medication_reminders_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_logs_to_idx" ON "email_logs"("to");
CREATE INDEX "email_logs_createdAt_idx" ON "email_logs"("createdAt");

CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientEventId" TEXT,
    "doctorEventId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "lastError" TEXT,
    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "calendar_events_appointmentId_key" ON "calendar_events"("appointmentId");
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
