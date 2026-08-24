import { Router } from "express";
import { authMiddleware, AuthRequest, roleMiddleware } from "../middleware/auth";
import doctorService from "../services/doctorService";
import prisma from "../prismaClient";
import { asyncHandler } from "../utils/errorHandler";
import { z } from "zod";

const router = Router();
router.use(authMiddleware, roleMiddleware(["ADMIN"]));

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  })
);

router.get(
  "/appointments",
  asyncHandler(async (_req, res) => {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { select: { email: true, name: true } },
        doctor: { include: { user: { select: { email: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ appointments });
  })
);

router.post(
  "/doctors",
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.createDoctor(req.body);
    res.status(201).json({ doctor });
  })
);

router.get(
  "/doctors",
  asyncHandler(async (_req, res) => {
    const doctors = await doctorService.getAllDoctors();
    res.json({ doctors });
  })
);

router.patch(
  "/doctors/:doctorId",
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.updateDoctor(req.params.doctorId, req.body);
    res.json({ doctor });
  })
);

router.delete(
  "/doctors/:doctorId",
  asyncHandler(async (req, res) => {
    await doctorService.deleteDoctor(req.params.doctorId);
    res.status(204).send();
  })
);

router.post(
  "/doctors/:doctorId/leave",
  asyncHandler(async (req: AuthRequest, res) => {
    const body = z.object({ date: z.string(), reason: z.string().optional() }).parse(req.body);
    const leaveDay = await doctorService.addLeaveDay(req.params.doctorId, new Date(body.date), body.reason);
    res.status(201).json({ leaveDay });
  })
);

router.delete(
  "/doctors/leave/:leaveDayId",
  asyncHandler(async (req, res) => {
    await doctorService.removeLeaveDay(req.params.leaveDayId);
    res.status(204).send();
  })
);

router.get(
  "/statistics",
  asyncHandler(async (_req, res) => {
    const [totalUsers, totalDoctors, totalPatients, totalAppointments, completedAppointments, cancelledAppointments] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "DOCTOR" } }),
        prisma.user.count({ where: { role: "PATIENT" } }),
        prisma.appointment.count(),
        prisma.appointment.count({ where: { status: "COMPLETED" } }),
        prisma.appointment.count({ where: { status: { in: ["CANCELLED", "CANCELLED_DUE_TO_LEAVE"] } } }),
      ]);
    res.json({
      statistics: {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
      },
    });
  })
);

export default router;
