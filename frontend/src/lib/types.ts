export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export type AppointmentStatus =
  | "HELD"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "CANCELLED_DUE_TO_LEAVE"
  | "NEEDS_RESCHEDULE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  calendarConnected?: boolean;
  doctorProfileId?: string | null;
}

export interface Doctor {
  id: string;
  specialization: string;
  slotDuration: number;
  workingHours: Record<string, [string, string]>;
  user: { id: string; email: string; name: string };
  leaveDays?: { id: string; date: string; reason?: string | null }[];
}

export interface Slot {
  start: string;
  end: string;
}

export interface Appointment {
  id: string;
  slotStart: string;
  slotEnd: string;
  status: AppointmentStatus;
  patient?: { id: string; email: string; name: string };
  doctor?: { id: string; user: { id: string; email: string; name: string }; specialization?: string };
  symptomForm?: { symptoms: string };
  preVisit?: {
    status: string;
    urgency?: string | null;
    chiefComplaint?: string | null;
    suggestedQuestions?: string[];
  };
  postVisit?: {
    status: string;
    summary?: string | null;
    medicationSchedule?: { medication: string; dosage: string; frequency: string }[];
    followUpSteps?: string[];
  };
  postVisitNote?: { notes: string };
  prescription?: { medication: string; dosage: string; frequency: string; reminders?: { remindAt: string; sent: boolean }[] };
}
