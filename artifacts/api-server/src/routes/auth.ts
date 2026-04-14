import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  changePassword,
  loginUser,
  registerUser,
  toPublicUser,
  updateUserProfile,
} from "../services/authService";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: "Name, email, and password are required." });
      return;
    }
    const { user, token } = await registerUser(name, email, password);
    res.status(201).json({ success: true, user, token });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password are required." });
      return;
    }
    const { user, token } = await loginUser(email, password);
    res.json({ success: true, user, token });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message || "Login failed." });
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({ success: true, user: toPublicUser(user) });
});

router.put("/profile", requireAuth, (req, res) => {
  try {
    const { name, profile } = req.body;
    const userId = (req as any).userId;
    const updated = updateUserProfile(userId, { name, profile });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put("/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: "Both current and new password are required." });
      return;
    }
    const userId = (req as any).userId;
    await changePassword(userId, currentPassword, newPassword);
    res.json({ success: true, message: "Password changed successfully." });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

export default router;
