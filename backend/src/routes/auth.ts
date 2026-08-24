import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import authService from "../services/authService";
import { asyncHandler } from "../utils/errorHandler";
import prisma from "../prismaClient";

const router = Router();

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
