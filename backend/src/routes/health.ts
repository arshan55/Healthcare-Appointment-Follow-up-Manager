import { Router } from "express";
import { config } from "../config";
import { getEmailService } from "../services/emailService";

const router = Router();

router.get("/", (_req, res) => res.json({ status: "ok" }));

router.get("/diagnostics", (_req, res) => {
  res.json({
    status: "ok",
    email: {
      configured: Boolean(config.sendgridApiKey || config.emailSmtpHost),
      provider: config.sendgridApiKey ? "sendgrid" : config.emailSmtpHost ? "smtp" : "console",
      from: config.emailFrom,
      smtpHost: config.emailSmtpHost || null,
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

router.post("/test-email", async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: "to email required" } });
  }
  const email = getEmailService();
  try {
    await email.send(to, "Northwell Test Email", "<p>This is a test email from Northwell Clinic.</p>");
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
