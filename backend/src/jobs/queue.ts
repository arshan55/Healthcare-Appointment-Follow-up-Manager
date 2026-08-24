import { Queue, Worker, JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config";
import appointmentService from "../services/appointmentService";
import prisma from "../prismaClient";
import { getEmailService } from "../services/emailService";

type JobName = "pre-visit-summary" | "post-visit-summary" | "send-email-retry";

const connection = config.redisUrl
  ? new IORedis(config.redisUrl, { maxRetriesPerRequest: null })
  : null;

const defaultJobOpts: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

const queue = connection ? new Queue("healthcare", { connection, defaultJobOptions: defaultJobOpts }) : null;

const localHandlers: Record<string, (data: Record<string, string>) => Promise<void>> = {};

async function handleJob(name: string, data: Record<string, string>) {
  if (name === "pre-visit-summary") {
    await appointmentService.generatePreVisit(data.appointmentId, data.symptoms);
  } else if (name === "post-visit-summary") {
    await appointmentService.generatePostVisit(data.appointmentId, data.notes);
  }
}

export async function enqueueJob(name: JobName, data: Record<string, string>) {
  if (queue) {
    await queue.add(name, data);
    return;
  }
  setImmediate(() => {
    handleJob(name, data).catch((err) => console.error("Job failed", name, err));
  });
}

export function startBackgroundJobs() {
  if (queue && connection) {
    new Worker(
      "healthcare",
      async (job) => {
        await handleJob(job.name, job.data as Record<string, string>);
      },
      { connection }
    );
    console.log("BullMQ worker started");
  } else {
    console.log("Redis not configured; running in-process jobs");
  }

  const tick = async () => {
    await cleanupHolds();
    await sendAppointmentReminders();
    await sendMedicationReminders();
  };
  void tick();
  setInterval(() => void tick(), 5 * 60 * 1000);
}

async function cleanupHolds() {
  const n = await prisma.slotHold.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  if (n.count) console.log(`Released ${n.count} expired slot holds`);
}

async function sendAppointmentReminders() {
  const now = new Date();
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const upcoming = await prisma.appointment.findMany({
    where: { status: "CONFIRMED", reminderSent: false, slotStart: { gte: from, lte: to } },
    include: { patient: true, doctor: { include: { user: true } } },
  });
  const email = getEmailService();
  for (const apt of upcoming) {
    try {
      await email.sendReminder(apt.patient.email, apt.doctor.user.name, apt.slotStart);
      await prisma.appointment.update({ where: { id: apt.id }, data: { reminderSent: true } });
    } catch (err) {
      console.error("Reminder failed, will retry next tick", err);
    }
  }
}

async function sendMedicationReminders() {
  const due = await prisma.medicationReminder.findMany({
    where: { sent: false, remindAt: { lte: new Date() }, attempts: { lt: 5 } },
    include: { prescription: { include: { appointment: { include: { patient: true } } } } },
  });
  const email = getEmailService();
  for (const reminder of due) {
    try {
      await email.sendMedicationReminder(
        reminder.prescription.appointment.patient.email,
        reminder.prescription.medication,
        reminder.prescription.dosage
      );
      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: { sent: true, lastError: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed";
      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: { attempts: { increment: 1 }, lastError: message },
      });
    }
  }
}

void localHandlers;
