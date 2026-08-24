import { google } from "googleapis";
import { config } from "../config";
import prisma from "../prismaClient";

export interface CalendarService {
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<{ access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }>;
  createEvents(params: {
    appointmentId: string;
    summary: string;
    slotStart: Date;
    slotEnd: Date;
    patientId: string;
    doctorUserId: string;
  }): Promise<void>;
  updateEvents(appointmentId: string, slotStart: Date, slotEnd: Date): Promise<void>;
  deleteEvents(appointmentId: string): Promise<void>;
}

function oauthClient() {
  return new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);
}

async function calendarForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.googleRefreshToken && !user?.googleAccessToken) return null;
  const client = oauthClient();
  client.setCredentials({
    access_token: user.googleAccessToken || undefined,
    refresh_token: user.googleRefreshToken || undefined,
    expiry_date: user.googleTokenExpiry?.getTime(),
  });
  return google.calendar({ version: "v3", auth: client });
}

export class GoogleCalendarService implements CalendarService {
  getAuthUrl(state: string): string {
    const client = oauthClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      state,
    });
  }

  async exchangeCode(code: string) {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  async createEvents(params: {
    appointmentId: string;
    summary: string;
    slotStart: Date;
    slotEnd: Date;
    patientId: string;
    doctorUserId: string;
  }) {
    // Idempotency check: skip if events already exist for this appointment
    const existing = await prisma.calendarEvent.findUnique({
      where: { appointmentId: params.appointmentId },
    });
    if (existing?.patientEventId && existing?.doctorEventId) {
      return; // Events already created, skip duplicate
    }
    try {
      const body = {
        summary: params.summary,
        description: "Healthcare appointment",
        start: { dateTime: params.slotStart.toISOString() },
        end: { dateTime: params.slotEnd.toISOString() },
      };
      const patientCal = await calendarForUser(params.patientId);
      const doctorCal = await calendarForUser(params.doctorUserId);
      const patientEventId = patientCal
        ? (await patientCal.events.insert({ calendarId: "primary", requestBody: body })).data.id
        : null;
      const doctorEventId = doctorCal
        ? (await doctorCal.events.insert({ calendarId: "primary", requestBody: body })).data.id
        : null;
      await prisma.calendarEvent.upsert({
        where: { appointmentId: params.appointmentId },
        create: {
          appointmentId: params.appointmentId,
          patientEventId: patientEventId || undefined,
          doctorEventId: doctorEventId || undefined,
        },
        update: {
          patientEventId: patientEventId || undefined,
          doctorEventId: doctorEventId || undefined,
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "calendar create failed";
      console.error("Calendar create failed:", message);
      await prisma.calendarEvent.upsert({
        where: { appointmentId: params.appointmentId },
        create: { appointmentId: params.appointmentId, lastError: message },
        update: { lastError: message },
      });
    }
  }

  async updateEvents(appointmentId: string, slotStart: Date, slotEnd: Date) {
    try {
      const row = await prisma.calendarEvent.findUnique({
        where: { appointmentId },
        include: { appointment: { include: { patient: true, doctor: true } } },
      });
      if (!row) return;
      const patch = {
        start: { dateTime: slotStart.toISOString() },
        end: { dateTime: slotEnd.toISOString() },
      };
      if (row.patientEventId) {
        const cal = await calendarForUser(row.appointment.patientId);
        await cal?.events.patch({ calendarId: "primary", eventId: row.patientEventId, requestBody: patch });
      }
      if (row.doctorEventId) {
        const cal = await calendarForUser(row.appointment.doctor.userId);
        await cal?.events.patch({ calendarId: "primary", eventId: row.doctorEventId, requestBody: patch });
      }
    } catch (error) {
      console.error("Calendar update failed:", error);
    }
  }

  async deleteEvents(appointmentId: string) {
    try {
      const row = await prisma.calendarEvent.findUnique({
        where: { appointmentId },
        include: { appointment: { include: { doctor: true } } },
      });
      if (!row) return;
      if (row.patientEventId) {
        const cal = await calendarForUser(row.appointment.patientId);
        await cal?.events.delete({ calendarId: "primary", eventId: row.patientEventId }).catch(() => undefined);
      }
      if (row.doctorEventId) {
        const cal = await calendarForUser(row.appointment.doctor.userId);
        await cal?.events.delete({ calendarId: "primary", eventId: row.doctorEventId }).catch(() => undefined);
      }
    } catch (error) {
      console.error("Calendar delete failed:", error);
    }
  }
}

export class NoopCalendarService implements CalendarService {
  getAuthUrl() {
    return "";
  }
  async exchangeCode() {
    return {};
  }
  async createEvents() {}
  async updateEvents() {}
  async deleteEvents() {}
}

export function getCalendarService(): CalendarService {
  if (config.nodeEnv === "test" || !config.googleClientId) {
    return new NoopCalendarService();
  }
  return new GoogleCalendarService();
}

export default getCalendarService();
