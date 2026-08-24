import { Router } from "express";
import { config } from "../config";
import { getEmailService } from "../services/emailService";
import { getCalendarService } from "../services/calendarService";

const router = Router();

router.get("/", (_req, res) => res.json({ status: "ok" }));

router.get("/diagnostics", (_req, res) => {
  res.json({
    status: "ok",
    email: {
      configured: Boolean(config.sendgridApiKey || config.emailSmtpHost),
      provider: config.sendgridApiKey ? "sendgrid" : config.emailSmtpHost ? "smtp" : "console",
      from: config.emailFrom,
    },
    calendar: {
      configured: Boolean(config.googleClientId && config.googleClientSecret),
      redirectUri: config.googleRedirectUri,
    },
    redis: {
      configured: Boolean(config.redisUrl),
    },
    llm: {
      configured: Boolean(config.llmApiKey),
      model: config.llmModel,
    },
    nodeEnv: config.nodeEnv,
  });
});

export default router;
