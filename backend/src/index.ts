import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import prisma from "./prismaClient";
import { errorHandler } from "./utils/errorHandler";
import { config } from "./config";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import appointmentRouter from "./routes/appointment";
import doctorRouter from "./routes/doctor";
import adminRouter from "./routes/admin";
import calendarRouter from "./routes/calendar";
import { startBackgroundJobs } from "./jobs/backgroundJobs";

dotenv.config();

const app = express();
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/appointments", appointmentRouter);
app.use("/api/v1/doctors", doctorRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/calendar", calendarRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Route ${req.path} not found` } });
});
app.use(errorHandler);

export { app };

async function startServer() {
  await prisma.$queryRaw`SELECT 1`;
  startBackgroundJobs();
  app.listen(config.port, () => {
    console.log(`API listening on ${config.port}`);
  });
}

if (config.nodeEnv !== "test") {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
