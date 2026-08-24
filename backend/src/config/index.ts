import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  jwtExpiry: process.env.JWT_EXPIRY || "30d",
  redisUrl: process.env.REDIS_URL || "",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "gemini-2.0-flash",
  emailSmtpHost: process.env.EMAIL_SMTP_HOST || "",
  emailSmtpPort: parseInt(process.env.EMAIL_SMTP_PORT || "587", 10),
  emailSmtpUser: process.env.EMAIL_SMTP_USER || "",
  emailSmtpPass: process.env.EMAIL_SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM_ADDRESS || "noreply@healthcare.local",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri:
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:4000/api/v1/calendar/callback",
  googleAuthClientId: process.env.GOOGLE_AUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
  googleAuthClientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
  googleAuthRedirectUri:
    process.env.GOOGLE_AUTH_REDIRECT_URI ||
    "http://localhost:4000/api/v1/auth/google/callback",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
  holdMinutes: parseInt(process.env.SLOT_HOLD_MINUTES || "10", 10),
};

export default config;
