import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../prismaClient";
import { config } from "../config";
import { AppError } from "../utils/errorHandler";
import { Role } from "@prisma/client";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["PATIENT"]).default("PATIENT"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthService {
  generateToken(user: { id: string; email: string; role: Role; name: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry as jwt.SignOptions["expiresIn"] }
    );
  }

  publicUser(user: { id: string; email: string; role: Role; name: string }) {
    return { id: user.id, email: user.email, role: user.role, name: user.name };
  }

  async register(data: unknown) {
    const validated = RegisterSchema.parse(data);
    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      throw new AppError("USER_EXISTS", "Email already registered", 400);
    }
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        name: validated.name,
        role: "PATIENT",
      },
    });
    return { user: this.publicUser(user), token: this.generateToken(user) };
  }

  async login(data: unknown) {
    const validated = LoginSchema.parse(data);
    const user = await prisma.user.findUnique({ where: { email: validated.email } });
    if (!user) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }
    const ok = await bcrypt.compare(validated.password, user.password);
    if (!ok) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }
    return { user: this.publicUser(user), token: this.generateToken(user) };
  }
}

export default new AuthService();
