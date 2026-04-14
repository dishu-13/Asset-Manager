import { NextFunction, Request, Response } from "express";
import { getUserById, verifyToken } from "../services/authService";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const { userId } = verifyToken(token);
    const user = getUserById(userId);
    if (!user) { res.status(401).json({ success: false, error: "User not found." }); return; }
    (req as any).userId = userId;
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Session expired. Please log in again." });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { userId } = verifyToken(authHeader.slice(7));
      const user = getUserById(userId);
      if (user) { (req as any).userId = userId; (req as any).user = user; }
    } catch {}
  }
  next();
}
