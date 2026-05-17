import type express from "express";
import { verifyToken } from "../lib/auth.js";

export interface AuthRequest extends express.Request {
  userId?: string;
}

export function requireAuth(
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction,
) {
  const header = req.header("authorization");
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ error: "Invalid Authorization header" });
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
