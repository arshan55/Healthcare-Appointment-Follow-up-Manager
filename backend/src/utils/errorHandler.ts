import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  const anyErr = err as { status?: number; code?: string; message?: string };
  if (anyErr?.status && anyErr?.code) {
    return res.status(anyErr.status).json({
      error: { code: anyErr.code, message: anyErr.message || "Request failed" },
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
