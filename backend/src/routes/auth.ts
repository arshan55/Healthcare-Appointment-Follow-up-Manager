import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import authService from "../services/authService";
import { asyncHandler, AppError } from "../utils/errorHandler";
import prisma from "../prismaClient";
import { config } from "../config";
import { OAuth2Client } from "google-auth-library";

const router = Router();

const googleClient = new OAuth2Client(
  config.googleAuthClientId,
  config.googleAuthClientSecret,
  config.googleAuthRedirectUri
);

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  })
);

router.get(
  "/google",
  asyncHandler(async (_req, res) => {
    if (!config.googleAuthClientId) {
      throw new AppError("GOOGLE_AUTH_DISABLED", "Google login is not configured", 400);
    }
    const state = Buffer.from(JSON.stringify({ nonce: Date.now().toString() })).toString("base64url");
    const url = googleClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "profile", "email"],
      state,
    });
    if (!url || url.includes("undefined")) {
      throw new AppError("GOOGLE_AUTH_DISABLED", "Google OAuth credentials are incomplete", 400);
    }
    res.redirect(url);
  })
);

router.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code) {
      throw new AppError("INVALID_INPUT", "Missing authorization code", 400);
    }

    const { tokens } = await googleClient.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new AppError("GOOGLE_AUTH_FAILED", "No ID token from Google", 400);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.googleAuthClientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.email_verified) {
      throw new AppError("GOOGLE_AUTH_FAILED", "Email not verified with Google", 400);
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: await require("bcrypt").hash(googleId, 10),
          role: "PATIENT",
        },
      });
    } else if (!user.googleAccessToken && !user.googleRefreshToken) {
      // Existing user without Google tokens - update their Google tokens for calendar
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: tokens.access_token || undefined,
          googleRefreshToken: tokens.refresh_token || undefined,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        },
      });
    }

    const token = authService.generateToken(user);
    res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
  })
);

router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        googleRefreshToken: true,
        googleAccessToken: true,
        doctorProfile: { select: { id: true } },
      },
    });
    res.json({
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        role: user?.role,
        calendarConnected: Boolean(user?.googleRefreshToken || user?.googleAccessToken),
        doctorProfileId: user?.doctorProfile?.id || null,
      },
    });
  })
);

export default router;
