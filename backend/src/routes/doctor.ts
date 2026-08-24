import { Router } from "express";
import { authMiddleware, AuthRequest, optionalAuth, roleMiddleware } from "../middleware/auth";
import doctorService from "../services/doctorService";
import appointmentService from "../services/appointmentService";
import { asyncHandler } from "../utils/errorHandler";

const router = Router();

router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const specialization = req.query.specialization as string | undefined;
    const doctors = await doctorService.getAllDoctors(specialization);
    res.json({ doctors });
  })
);

router.get(
  "/:id/slots",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    const slots = await appointmentService.getAvailableSlots(req.params.id, date);
    res.json({ slots });
  })
);

router.get(
  "/:id/leave-days",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const leaveDays = await doctorService.getLeaveDays(req.params.id);
    res.json({ leaveDays });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.getProfile(req.params.id);
    res.json({ doctor });
  })
);

router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(["DOCTOR", "ADMIN"]),
  asyncHandler(async (req: AuthRequest, res) => {
    if (req.user?.role === "DOCTOR") {
      const mine = await doctorService.getProfileByUserId(req.user.id);
      if (!mine || mine.id !== req.params.id) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot edit this profile" } });
      }
    }
    const doctor = await doctorService.updateDoctor(req.params.id, req.body);
    res.json({ doctor });
  })
);

export default router;
