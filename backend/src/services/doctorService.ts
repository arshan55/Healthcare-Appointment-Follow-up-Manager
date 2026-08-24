import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "../prismaClient";
import { AppError } from "../utils/errorHandler";
import { endOfDay, startOfDay } from "../utils/slots";
import { getEmailService } from "./emailService";
import { getCalendarService } from "./calendarService";

const WorkingHoursSchema = z.record(z.tuple([z.string(), z.string()]));

const CreateDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  specialization: z.string().min(2),
  slotDuration: z.number().int().min(10).max(240),
  workingHours: WorkingHoursSchema,
});

const UpdateDoctorSchema = z.object({
  name: z.string().min(1).optional(),
  specialization: z.string().min(2).optional(),
  slotDuration: z.number().int().min(10).max(240).optional(),
  workingHours: WorkingHoursSchema.optional(),
});

export class DoctorService {
  async createDoctor(data: unknown) {
    const input = CreateDoctorSchema.parse(data);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("USER_EXISTS", "Email already registered", 400);
    const password = await bcrypt.hash(input.password, 10);
    return prisma.user.create({
      data: {
        email: input.email,
        password,
        name: input.name,
        role: "DOCTOR",
        doctorProfile: {
          create: {
            specialization: input.specialization,
            slotDuration: input.slotDuration,
            workingHours: input.workingHours,
          },
        },
      },
      include: { doctorProfile: true },
    });
  }

  async updateDoctor(id: string, data: unknown) {
    const input = UpdateDoctorSchema.parse(data);
    const profile = await prisma.doctorProfile.findUnique({ where: { id } });
    if (!profile) throw new AppError("DOCTOR_NOT_FOUND", "Doctor not found", 404);
    if (input.name) {
      await prisma.user.update({ where: { id: profile.userId }, data: { name: input.name } });
    }
    return prisma.doctorProfile.update({
      where: { id },
      data: {
        specialization: input.specialization,
        slotDuration: input.slotDuration,
        workingHours: input.workingHours,
      },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });
  }

  async deleteDoctor(id: string) {
    const profile = await prisma.doctorProfile.findUnique({ where: { id } });
    if (!profile) throw new AppError("DOCTOR_NOT_FOUND", "Doctor not found", 404);
    await prisma.user.delete({ where: { id: profile.userId } });
  }

  async getProfile(id: string) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } }, leaveDays: true },
    });
    if (!profile) throw new AppError("DOCTOR_NOT_FOUND", "Doctor not found", 404);
    return profile;
  }

  async getProfileByUserId(userId: string) {
    return prisma.doctorProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async getAllDoctors(specialization?: string) {
    return prisma.doctorProfile.findMany({
      where: specialization
        ? { specialization: { contains: specialization, mode: "insensitive" } }
        : undefined,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { specialization: "asc" },
    });
  }

  async addLeaveDay(doctorId: string, date: Date, reason?: string) {
    const profile = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!profile) throw new AppError("DOCTOR_NOT_FOUND", "Doctor not found", 404);
    const day = startOfDay(date);
    const leave = await prisma.doctorLeaveDay.upsert({
      where: { doctorId_date: { doctorId, date: day } },
      create: { doctorId, date: day, reason },
      update: { reason },
    });
    await this.handleLeaveConflicts(doctorId, day, reason || "Doctor on leave");
    return leave;
  }

  async removeLeaveDay(leaveDayId: string) {
    await prisma.doctorLeaveDay.delete({ where: { id: leaveDayId } });
  }

  async getLeaveDays(doctorId: string) {
    return prisma.doctorLeaveDay.findMany({ where: { doctorId }, orderBy: { date: "asc" } });
  }

  async handleLeaveConflicts(doctorId: string, leaveDate: Date, reason: string) {
    const from = startOfDay(leaveDate);
    const to = endOfDay(leaveDate);
    const affected = await prisma.appointment.findMany({
      where: {
        doctorId,
        slotStart: { gte: from, lt: to },
        status: { in: ["HELD", "CONFIRMED"] },
      },
      include: { patient: true, doctor: { include: { user: true } } },
    });

    const email = getEmailService();
    const calendar = getCalendarService();

    for (const appointment of affected) {
      // Leave-conflict handling: free occupancyKey so another patient can book; patient must reschedule.
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "NEEDS_RESCHEDULE", occupancyKey: null },
      });
      await calendar.deleteEvents(appointment.id).catch(() => undefined);
      await email
        .sendLeaveNotification(appointment.patient.email, reason)
        .catch((err) => console.error("Leave email failed", err));
    }
    return affected.length;
  }
}

export default new DoctorService();
