import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import prisma from "../prismaClient";
import { config } from "../config";
import { withBackoff } from "../utils/retry";

export interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
  sendBookingConfirmation(email: string, doctorName: string, slotStart: Date): Promise<void>;
  sendReschedule(email: string, doctorName: string, slotStart: Date): Promise<void>;
  sendCancellation(email: string, doctorName: string): Promise<void>;
  sendReminder(email: string, doctorName: string, slotStart: Date): Promise<void>;
  sendMedicationReminder(email: string, medication: string, dosage: string): Promise<void>;
  sendLeaveNotification(email: string, reason: string): Promise<void>;
  sendSummaryPending(email: string, kind: string): Promise<void>;
}

async function logEmail(to: string, subject: string, body: string, success: boolean, error?: string) {
  await prisma.emailLog.create({
    data: { to, subject, body, success, error, attempts: 1 },
  });
}

export class SendGridEmailService implements EmailService {
  constructor() {
    if (config.sendgridApiKey) {
      sgMail.setApiKey(config.sendgridApiKey);
    }
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    try {
      await withBackoff(() =>
        sgMail.send({
          to,
          from: config.emailFrom,
          subject,
          html: body,
        })
      );
      await logEmail(to, subject, body, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await logEmail(to, subject, body, false, message);
      throw error;
    }
  }

  async sendBookingConfirmation(email: string, doctorName: string, slotStart: Date) {
    await this.send(
      email,
      "Appointment confirmed",
      `<p>Your visit with ${doctorName} is confirmed for ${slotStart.toLocaleString()}.</p>`
    );
  }

  async sendReschedule(email: string, doctorName: string, slotStart: Date) {
    await this.send(
      email,
      "Appointment rescheduled",
      `<p>Your visit with ${doctorName} was moved to ${slotStart.toLocaleString()}.</p>`
    );
  }

  async sendCancellation(email: string, doctorName: string) {
    await this.send(email, "Appointment cancelled", `<p>Your visit with ${doctorName} was cancelled.</p>`);
  }

  async sendReminder(email: string, doctorName: string, slotStart: Date) {
    await this.send(
      email,
      "Appointment reminder",
      `<p>Reminder: visit with ${doctorName} at ${slotStart.toLocaleString()}.</p>`
    );
  }

  async sendMedicationReminder(email: string, medication: string, dosage: string) {
    await this.send(
      email,
      "Medication reminder",
      `<p>Time to take ${medication} (${dosage}).</p>`
    );
  }

  async sendLeaveNotification(email: string, reason: string) {
    await this.send(
      email,
      "Your visit needs to be rescheduled",
      `<p>Your doctor is unavailable (${reason}). Please pick a new time in the patient portal.</p>`
    );
  }

  async sendSummaryPending(email: string, kind: string) {
    await this.send(
      email,
      `${kind} summary not ready`,
      `<p>The ${kind} summary could not be generated automatically. It will be available after regeneration.</p>`
    );
  }
}

export class NodemailerEmailService implements EmailService {
  private transporter = nodemailer.createTransport({
    host: config.emailSmtpHost,
    port: config.emailSmtpPort,
    secure: config.emailSmtpPort === 465,
    auth: config.emailSmtpUser
      ? { user: config.emailSmtpUser, pass: config.emailSmtpPass }
      : undefined,
  });

  async send(to: string, subject: string, body: string): Promise<void> {
    try {
      await withBackoff(() =>
        this.transporter.sendMail({
          from: config.emailFrom,
          to,
          subject,
          html: body,
        })
      );
      await logEmail(to, subject, body, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await logEmail(to, subject, body, false, message);
      throw error;
    }
  }

  async sendBookingConfirmation(email: string, doctorName: string, slotStart: Date) {
    await this.send(
      email,
      "Appointment confirmed",
      `<p>Your visit with ${doctorName} is confirmed for ${slotStart.toLocaleString()}.</p>`
    );
  }

  async sendReschedule(email: string, doctorName: string, slotStart: Date) {
    await this.send(
      email,
      "Appointment rescheduled",
      `<p>Your visit with ${doctorName} was moved to ${slotStart.toLocaleString()}.</p>`
    );
  }

  async sendCancellation(email: string, doctorName: string) {
    await this.send(email, "Appointment cancelled", `<p>Your visit with ${doctorName} was cancelled.</p>`);
  }

  async sendReminder(email: string, doctorName: string, slotStart: Date) {
    await this.send(
      email,
      "Appointment reminder",
      `<p>Reminder: visit with ${doctorName} at ${slotStart.toLocaleString()}.</p>`
    );
  }

  async sendMedicationReminder(email: string, medication: string, dosage: string) {
    await this.send(
      email,
      "Medication reminder",
      `<p>Time to take ${medication} (${dosage}).</p>`
    );
  }

  async sendLeaveNotification(email: string, reason: string) {
    await this.send(
      email,
      "Your visit needs to be rescheduled",
      `<p>Your doctor is unavailable (${reason}). Please pick a new time in the patient portal.</p>`
    );
  }

  async sendSummaryPending(email: string, kind: string) {
    await this.send(
      email,
      `${kind} summary not ready`,
      `<p>The ${kind} summary could not be generated automatically. It will be available after regeneration.</p>`
    );
  }
}

export class ConsoleEmailService implements EmailService {
  async send(to: string, subject: string, body: string) {
    console.log(`[email] to=${to} subject=${subject}`);
    await logEmail(to, subject, body, true);
  }
  async sendBookingConfirmation(email: string, doctorName: string, slotStart: Date) {
    await this.send(email, "Appointment confirmed", `${doctorName} ${slotStart.toISOString()}`);
  }
  async sendReschedule(email: string, doctorName: string, slotStart: Date) {
    await this.send(email, "Appointment rescheduled", `${doctorName} ${slotStart.toISOString()}`);
  }
  async sendCancellation(email: string, doctorName: string) {
    await this.send(email, "Appointment cancelled", doctorName);
  }
  async sendReminder(email: string, doctorName: string, slotStart: Date) {
    await this.send(email, "Appointment reminder", `${doctorName} ${slotStart.toISOString()}`);
  }
  async sendMedicationReminder(email: string, medication: string, dosage: string) {
    await this.send(email, "Medication reminder", `${medication} ${dosage}`);
  }
  async sendLeaveNotification(email: string, reason: string) {
    await this.send(email, "Your visit needs to be rescheduled", reason);
  }
  async sendSummaryPending(email: string, kind: string) {
    await this.send(email, `${kind} summary not ready`, kind);
  }
}

export function getEmailService(): EmailService {
  if (config.nodeEnv === "test" || (!config.sendgridApiKey && !config.emailSmtpHost)) {
    console.log("[email] Using console logger (no provider configured)");
    return new ConsoleEmailService();
  }
  if (config.sendgridApiKey) {
    console.log("[email] Using SendGrid provider");
    return new SendGridEmailService();
  }
  console.log("[email] Using SMTP provider:", config.emailSmtpHost);
  return new NodemailerEmailService();
}

export default getEmailService();
