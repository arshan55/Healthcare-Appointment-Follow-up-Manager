import { z } from "zod";
import prisma from "../prismaClient";
import { AppError } from "../utils/errorHandler";
import { endOfDay, occupancyKey, startOfDay } from "../utils/slots";
import { computeAvailableSlots, WorkingHours } from "../utils/slotAvailability";
import { config } from "../config";
import { parseReminderTimes } from "../utils/medication";
import { getLLMService } from "./llmService";
import { getEmailService } from "./emailService";
import { getCalendarService } from "./calendarService";
import { enqueueJob } from "../jobs/queue";
import { publishEvent } from "./outboxService";

const HoldSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime(),
});

const BookSchema = z.object({
  holdId: z.string().uuid(),
  symptoms: z.string().min(10),
});

const DirectBookSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime(),
  symptoms: z.string().min(10),
});

const RescheduleSchema = z.object({
  slotStart: z.string().datetime(),
});

const NotesSchema = z.object({
  notes: z.string().min(5),
  medication: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
});

const appointmentInclude = {
  patient: { select: { id: true, email: true, name: true } },
  doctor: { include: { user: { select: { id: true, email: true, name: true } } } },
  symptomForm: true,
  preVisit: true,
  postVisitNote: true,
  postVisit: true,
  prescription: { include: { reminders: true } },
  calendarEvent: true,
} as const;

export class AppointmentService {
  async getAvailableSlots(doctorId: string, date: Date) {
    const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new AppError("DOCTOR_NOT_FOUND", "Doctor not found", 404);

    const from = startOfDay(date);
    const to = endOfDay(date);

    const leave = await prisma.doctorLeaveDay.findFirst({
      where: { doctorId, date: from },
    });
    await prisma.slotHold.deleteMany({ where: { expiresAt: { lte: new Date() } } });

    const [booked, holds] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          doctorId,
          occupancyKey: { not: null },
          slotStart: { gte: from, lt: to },
        },
        select: { slotStart: true, status: true },
      }),
      prisma.slotHold.findMany({
        where: { doctorId, slotStart: { gte: from, lt: to } },
        select: { slotStart: true, expiresAt: true },
      }),
    ]);

    return computeAvailableSlots({
      date: from,
      workingHours: doctor.workingHours as WorkingHours,
      slotDuration: doctor.slotDuration,
      onLeave: Boolean(leave),
      occupied: booked,
      activeHolds: holds,
    });
  }

  async createHold(patientId: string, data: unknown) {
    const input = HoldSchema.parse(data);
    const slotStart = new Date(input.slotStart);
    const doctor = await prisma.doctorProfile.findUnique({ where: { id: input.doctorId } });
    if (!doctor) throw new AppError("DOCTOR_NOT_FOUND", "Doctor not found", 404);
    const slotEnd = new Date(slotStart.getTime() + doctor.slotDuration * 60000);

    return prisma.$transaction(async (tx) => {
      await tx.slotHold.deleteMany({ where: { expiresAt: { lte: new Date() } } });
      const existing = await tx.appointment.findFirst({
        where: { doctorId: input.doctorId, occupancyKey: occupancyKey(input.doctorId, slotStart) },
      });
      if (existing) throw new AppError("SLOT_TAKEN", "This slot is no longer available", 409);

      try {
        // Unique (doctorId, slotStart) is the second line of defense if the lock is skipped.
        return await tx.slotHold.create({
          data: {
            doctorId: input.doctorId,
            patientId,
            slotStart,
            slotEnd,
            expiresAt: new Date(Date.now() + config.holdMinutes * 60 * 1000),
          },
        });
      } catch {
        throw new AppError("SLOT_TAKEN", "This slot is no longer available", 409);
      }
    });
  }

  async bookFromHold(patientId: string, data: unknown) {
    const input = BookSchema.parse(data);
    const appointment = await prisma.$transaction(async (tx) => {
      const hold = await tx.slotHold.findUnique({ where: { id: input.holdId } });
      if (!hold || hold.patientId !== patientId) {
        throw new AppError("HOLD_NOT_FOUND", "Slot hold not found", 404);
      }
      if (hold.expiresAt.getTime() <= Date.now()) {
        await tx.slotHold.delete({ where: { id: hold.id } }).catch(() => undefined);
        throw new AppError("HOLD_EXPIRED", "Slot hold expired. Please pick the time again.", 409);
      }

      // occupancyKey unique index: two CONFIRMED rows for the same doctor+instant cannot exist.
      const taken = await tx.appointment.findFirst({
        where: { occupancyKey: occupancyKey(hold.doctorId, hold.slotStart) },
      });
      if (taken) throw new AppError("SLOT_TAKEN", "This slot is no longer available", 409);

      const created = await tx.appointment.create({
        data: {
          patientId,
          doctorId: hold.doctorId,
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          status: "CONFIRMED",
          occupancyKey: occupancyKey(hold.doctorId, hold.slotStart),
          symptomForm: { create: { symptoms: input.symptoms } },
          preVisit: { create: { status: "PENDING" } },
        },
        include: appointmentInclude,
      });
      await tx.slotHold.delete({ where: { id: hold.id } });
      return created;
    });

    void this.afterConfirm(appointment.id, input.symptoms);
    return appointment;
  }

  /** Combined hold+book for simpler clients; still locks the doctor row. */
  async bookDirect(patientId: string, data: unknown) {
    const input = DirectBookSchema.parse(data);
    const hold = await this.createHold(patientId, { doctorId: input.doctorId, slotStart: input.slotStart });
    return this.bookFromHold(patientId, { holdId: hold.id, symptoms: input.symptoms });
  }

  private async afterConfirm(appointmentId: string, symptoms: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: appointmentInclude,
    });
    if (!appointment) return;
    const doctorName = appointment.doctor.user.name;

    // Publish email events to outbox for reliable delivery
    await publishEvent("booking-confirmation-patient", {
      to: appointment.patient.email,
      subject: "Appointment confirmed",
      body: `<p>Your visit with ${doctorName} is confirmed for ${appointment.slotStart.toLocaleString()}.</p>`,
      type: "booking-confirmation-patient",
    });
    await publishEvent("booking-confirmation-doctor", {
      to: appointment.doctor.user.email,
      subject: "New appointment scheduled",
      body: `<p>${appointment.patient.name} booked ${appointment.slotStart.toLocaleString()}.</p>`,
      type: "booking-confirmation-doctor",
    });

    const calendar = getCalendarService();
    await calendar.createEvents({
      appointmentId,
      summary: `Visit: ${appointment.patient.name} / ${doctorName}`,
      slotStart: appointment.slotStart,
      slotEnd: appointment.slotEnd,
      patientId: appointment.patientId,
      doctorUserId: appointment.doctor.userId,
    });

    await enqueueJob("pre-visit-summary", { appointmentId, symptoms });
  }

  async generatePreVisit(appointmentId: string, symptoms: string) {
    const llm = getLLMService();
    try {
      const result = await llm.generatePreVisit(symptoms);
      await prisma.preVisitSummary.update({
        where: { appointmentId },
        data: {
          rawResponse: result,
          urgency: result.urgency,
          chiefComplaint: result.chief_complaint,
          suggestedQuestions: result.suggested_questions,
          status: "READY",
        },
      });
    } catch (error) {
      // LLM failure handling: booking already committed; mark FAILED and email the doctor.
      console.error("Pre-visit LLM failed", error);
      await prisma.preVisitSummary.update({
        where: { appointmentId },
        data: { status: "FAILED" },
      });
      const apt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { doctor: { include: { user: true } } },
      });
      if (apt) {
        await publishEvent("summary-pending", {
          to: apt.doctor.user.email,
          subject: "pre-visit summary not ready",
          body: `<p>The pre-visit summary could not be generated automatically. It will be available after regeneration.</p>`,
          type: "summary-pending",
        }).catch(() => undefined);
      }
    }
  }

  async generatePostVisit(appointmentId: string, notes: string) {
    const llm = getLLMService();
    try {
      const result = await llm.generatePostVisit(notes);
      await prisma.postVisitSummary.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          rawResponse: result,
          summary: result.summary,
          medicationSchedule: result.medication_schedule,
          followUpSteps: result.follow_up_steps,
          status: "READY",
        },
        update: {
          rawResponse: result,
          summary: result.summary,
          medicationSchedule: result.medication_schedule,
          followUpSteps: result.follow_up_steps,
          status: "READY",
        },
      });
    } catch (error) {
      // LLM failure handling: notes stay saved; summary is FAILED until regenerate.
      console.error("Post-visit LLM failed", error);
      await prisma.postVisitSummary.upsert({
        where: { appointmentId },
        create: { appointmentId, status: "FAILED" },
        update: { status: "FAILED" },
      });
      const apt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true },
      });
      if (apt) {
        await publishEvent("summary-pending", {
          to: apt.patient.email,
          subject: "post-visit summary not ready",
          body: `<p>The post-visit summary could not be generated automatically. It will be available after regeneration.</p>`,
          type: "summary-pending",
        }).catch(() => undefined);
      }
    }
  }

  async cancel(appointmentId: string, actorId: string, role: string) {
    const appointment = await this.requireAccess(appointmentId, actorId, role);
    if (!["HELD", "CONFIRMED", "NEEDS_RESCHEDULE"].includes(appointment.status)) {
      throw new AppError("INVALID_STATUS", "Appointment cannot be cancelled", 400);
    }
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED", occupancyKey: null },
      include: appointmentInclude,
    });
    await getCalendarService().deleteEvents(appointmentId);
    // Publish cancellation email to outbox
    await publishEvent("cancellation", {
      to: updated.patient.email,
      subject: "Appointment cancelled",
      body: `<p>Your visit with ${updated.doctor.user.name} was cancelled.</p>`,
      type: "cancellation",
    }).catch((err) => console.error("Outbox publish failed", err));
    return updated;
  }

  async reschedule(appointmentId: string, actorId: string, role: string, data: unknown) {
    const input = RescheduleSchema.parse(data);
    const appointment = await this.requireAccess(appointmentId, actorId, role);
    const newStart = new Date(input.slotStart);
    const newEnd = new Date(newStart.getTime() + (appointment.slotEnd.getTime() - appointment.slotStart.getTime()));

    const updated = await prisma.$transaction(async (tx) => {
      const leave = await tx.doctorLeaveDay.findFirst({
        where: { doctorId: appointment.doctorId, date: startOfDay(newStart) },
      });
      if (leave) throw new AppError("DOCTOR_ON_LEAVE", "Doctor is on leave during this slot", 400);
      const taken = await tx.appointment.findFirst({
        where: {
          occupancyKey: occupancyKey(appointment.doctorId, newStart),
          id: { not: appointmentId },
        },
      });
      if (taken) throw new AppError("SLOT_TAKEN", "New slot is not available", 409);
      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          slotStart: newStart,
          slotEnd: newEnd,
          status: "CONFIRMED",
          occupancyKey: occupancyKey(appointment.doctorId, newStart),
        },
        include: appointmentInclude,
      });
    });

    await getCalendarService().updateEvents(appointmentId, updated.slotStart, updated.slotEnd);
    // Publish reschedule email to outbox
    await publishEvent("reschedule", {
      to: updated.patient.email,
      subject: "Appointment rescheduled",
      body: `<p>Your visit with ${updated.doctor.user.name} was moved to ${updated.slotStart.toLocaleString()}.</p>`,
      type: "reschedule",
    }).catch((err) => console.error("Outbox publish failed", err));
    return updated;
  }

  async getForUser(userId: string, role: string) {
    if (role === "PATIENT") {
      return prisma.appointment.findMany({
        where: { patientId: userId },
        include: appointmentInclude,
        orderBy: { slotStart: "desc" },
      });
    }
    if (role === "DOCTOR") {
      const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
      if (!profile) return [];
      return prisma.appointment.findMany({
        where: { doctorId: profile.id },
        include: appointmentInclude,
        orderBy: { slotStart: "asc" },
      });
    }
    return prisma.appointment.findMany({
      include: appointmentInclude,
      orderBy: { slotStart: "desc" },
    });
  }

  async getById(id: string, actorId: string, role: string) {
    return this.requireAccess(id, actorId, role);
  }

  async submitNotes(appointmentId: string, doctorUserId: string, data: unknown) {
    const input = NotesSchema.parse(data);
    const profile = await prisma.doctorProfile.findUnique({ where: { userId: doctorUserId } });
    if (!profile) throw new AppError("FORBIDDEN", "Doctor profile not found", 403);
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.doctorId !== profile.id) {
      throw new AppError("NOT_FOUND", "Appointment not found", 404);
    }

    const note = await prisma.postVisitNote.upsert({
      where: { appointmentId },
      create: { appointmentId, notes: input.notes },
      update: { notes: input.notes },
    });

    if (input.medication && input.frequency) {
      const prescription = await prisma.prescription.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          medication: input.medication,
          dosage: input.dosage || "",
          frequency: input.frequency,
        },
        update: {
          medication: input.medication,
          dosage: input.dosage || "",
          frequency: input.frequency,
        },
      });
      await prisma.medicationReminder.deleteMany({ where: { prescriptionId: prescription.id } });
      const times = parseReminderTimes(input.frequency, new Date());
      if (times.length) {
        await prisma.medicationReminder.createMany({
          data: times.map((remindAt) => ({ prescriptionId: prescription.id, remindAt })),
        });
      }
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "COMPLETED", occupancyKey: null },
    });

    await prisma.postVisitSummary.upsert({
      where: { appointmentId },
      create: { appointmentId, status: "PENDING" },
      update: { status: "PENDING" },
    });
    await enqueueJob("post-visit-summary", { appointmentId, notes: input.notes });
    return note;
  }

  private async requireAccess(appointmentId: string, actorId: string, role: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: appointmentInclude,
    });
    if (!appointment) throw new AppError("NOT_FOUND", "Appointment not found", 404);
    if (role === "ADMIN") return appointment;
    if (role === "PATIENT" && appointment.patientId === actorId) return appointment;
    if (role === "DOCTOR" && appointment.doctor.userId === actorId) return appointment;
    throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
  }
}

export default new AppointmentService();
