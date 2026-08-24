import prisma from "../prismaClient";
import { getEmailService } from "./emailService";

export interface OutboxPayload {
  to: string;
  subject: string;
  body: string;
  type: string;
}

export async function publishEvent(eventType: string, payload: OutboxPayload) {
  await prisma.outboxEvent.create({
    data: {
      eventType,
      payload: payload as unknown as object,
      status: "PENDING",
    },
  });
}

export async function processOutboxEvents() {
  const events = await prisma.outboxEvent.findMany({
    where: { status: "PENDING", attempts: { lt: 3 } },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  if (events.length > 0) {
    console.log(`[outbox] Processing ${events.length} pending events`);
  }

  const email = getEmailService();

  for (const event of events) {
    try {
      const payload = event.payload as unknown as OutboxPayload;
      await email.send(payload.to, payload.subject, payload.body);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      console.log(`[outbox] Sent ${event.eventType} to ${payload.to}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed";
      console.error(`[outbox] Failed ${event.eventType} to ${event.payload ? (event.payload as unknown as OutboxPayload).to : "unknown"}: ${message}`);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { attempts: { increment: 1 }, lastError: message },
      });
    }
  }

  // Mark events that exceeded max attempts as FAILED
  const failed = await prisma.outboxEvent.updateMany({
    where: { status: "PENDING", attempts: { gte: 3 } },
    data: { status: "FAILED" },
  });
  if (failed.count > 0) {
    console.error(`[outbox] Marked ${failed.count} events as FAILED`);
  }
}
