import { Router } from "express";
import { authMiddleware, AuthRequest, roleMiddleware } from "../middleware/auth";
import appointmentService from "../services/appointmentService";
import { asyncHandler } from "../utils/errorHandler";
import prisma from "../prismaClient";

const router = Router();
router.use(authMiddleware);

router.get(
  "/available-slots",
  asyncHandler(async (req, res) => {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "doctorId and date required" } });
    }
    const slots = await appointmentService.getAvailableSlots(String(doctorId), new Date(String(date)));
    res.json({ slots });
  })
);

router.post(
  "/holds",
  roleMiddleware(["PATIENT"]),
  asyncHandler(async (req: AuthRequest, res) => {
    const hold = await appointmentService.createHold(req.user!.id, req.body);
    res.status(201).json({ hold });
  })
);

router.post(
  "/book",
  roleMiddleware(["PATIENT"]),
  asyncHandler(async (req: AuthRequest, res) => {
    const appointment = req.body.holdId
      ? await appointmentService.bookFromHold(req.user!.id, req.body)
      : await appointmentService.bookDirect(req.user!.id, req.body);
    res.status(201).json({ appointment });
  })
);

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const appointments = await appointmentService.getForUser(req.user!.id, req.user!.role);
    res.json({ appointments });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const appointment = await appointmentService.getById(req.params.id, req.user!.id, req.user!.role);
    res.json({ appointment });
  })
);

router.post(
  "/:id/cancel",
  asyncHandler(async (req: AuthRequest, res) => {
    const appointment = await appointmentService.cancel(req.params.id, req.user!.id, req.user!.role);
    res.json({ appointment });
  })
);

router.post(
  "/:id/reschedule",
  asyncHandler(async (req: AuthRequest, res) => {
    const appointment = await appointmentService.reschedule(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body
    );
    res.json({ appointment });
  })
);

router.post(
  "/:id/post-visit-notes",
  roleMiddleware(["DOCTOR"]),
  asyncHandler(async (req: AuthRequest, res) => {
    const note = await appointmentService.submitNotes(req.params.id, req.user!.id, req.body);
    res.json({ note });
  })
);

router.post(
  "/:id/pre-visit/regenerate",
  roleMiddleware(["DOCTOR", "ADMIN"]),
  asyncHandler(async (req: AuthRequest, res) => {
    const appointment = await appointmentService.getById(req.params.id, req.user!.id, req.user!.role);
    const symptoms = appointment.symptomForm?.symptoms;
    if (!symptoms) {
      return res.status(400).json({ error: { code: "NO_SYMPTOMS", message: "No symptom form on file" } });
    }
    await prisma.preVisitSummary.upsert({
      where: { appointmentId: appointment.id },
      create: { appointmentId: appointment.id, status: "PENDING" },
      update: { status: "PENDING" },
    });
    await appointmentService.generatePreVisit(appointment.id, symptoms);
    const preVisit = await prisma.preVisitSummary.findUnique({ where: { appointmentId: appointment.id } });
    res.json({ preVisit });
  })
);

router.post(
  "/:id/post-visit/regenerate",
  roleMiddleware(["DOCTOR", "ADMIN"]),
  asyncHandler(async (req: AuthRequest, res) => {
    const appointment = await appointmentService.getById(req.params.id, req.user!.id, req.user!.role);
    const notes = appointment.postVisitNote?.notes;
    if (!notes) {
      return res.status(400).json({ error: { code: "NO_NOTES", message: "No post-visit notes on file" } });
    }
    await appointmentService.generatePostVisit(appointment.id, notes);
    const postVisit = await prisma.postVisitSummary.findUnique({ where: { appointmentId: appointment.id } });
    res.json({ postVisit });
  })
);

router.get(
  "/:id/pre-visit",
  asyncHandler(async (req: AuthRequest, res) => {
    await appointmentService.getById(req.params.id, req.user!.id, req.user!.role);
    const preVisit = await prisma.preVisitSummary.findUnique({ where: { appointmentId: req.params.id } });
    if (!preVisit) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Summary not found" } });
    }
    res.json({ preVisit });
  })
);

router.get(
  "/:id/post-visit",
  asyncHandler(async (req: AuthRequest, res) => {
    await appointmentService.getById(req.params.id, req.user!.id, req.user!.role);
    const postVisit = await prisma.postVisitSummary.findUnique({ where: { appointmentId: req.params.id } });
    if (!postVisit) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Summary not found" } });
    }
    res.json({ postVisit });
  })
);

export default router;
