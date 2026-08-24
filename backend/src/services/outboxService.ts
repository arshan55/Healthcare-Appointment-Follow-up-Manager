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

  const email = getEmailService();

  for (const event of events) {
    try {
      const payload = event.payload as unknown as OutboxPayload;
      await email.send(payload.to, payload.subject, payload.body);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed";
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { attempts: { increment: 1 }, lastError: message },
      });
    }
  }

  // Mark events that exceeded max attempts as FAILED
  await prisma.outboxEvent.updateMany({
    where: { status: "PENDING", attempts: { gte: 3 } },
    data: { status: "FAILED" },
  });
}
