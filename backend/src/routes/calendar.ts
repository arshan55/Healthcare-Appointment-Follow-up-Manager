import { Router } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { getCalendarService } from "../services/calendarService";
import { config } from "../config";
import prisma from "../prismaClient";
import { asyncHandler, AppError } from "../utils/errorHandler";

const router = Router();

router.get(
  "/connect",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const service = getCalendarService();
    const state = jwt.sign({ id: req.user!.id }, config.jwtSecret, { expiresIn: "10m" });
    const url = service.getAuthUrl(state);
    if (!url) {
      throw new AppError("CALENDAR_DISABLED", "Google Calendar is not configured", 400);
    }
    res.json({ url });
  })
);

router.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state) {
      throw new AppError("INVALID_INPUT", "Missing OAuth code", 400);
    }
    const payload = jwt.verify(state, config.jwtSecret) as { id: string };
    const tokens = await getCalendarService().exchangeCode(code);
    await prisma.user.update({
      where: { id: payload.id },
      data: {
        googleAccessToken: tokens.access_token || undefined,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
    res.redirect(`${config.frontendUrl}/settings/calendar?connected=1`);
  })
);

export default router;
