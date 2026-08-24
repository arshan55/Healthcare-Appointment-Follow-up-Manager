import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "No token provided" } });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Invalid token" } });
  }
}

export function roleMiddleware(roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
    }
    next();
  };
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, config.jwtSecret) as AuthUser;
  } catch {
    // ignore
  }
  next();
}
