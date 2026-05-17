import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signToken } from "../lib/auth.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };
  if (!email || !password || !name)
    return res.status(400).json({ error: "Missing email, password or name" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  await prisma.userSettings.create({ data: { userId: user.id } });

  const token = signToken({ userId: user.id });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, color: user.color } });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ userId: user.id });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, color: user.color } });
});

router.post("/auth/demo", async (_req, res) => {
  const email = "demo@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash("demo", 10);
    user = await prisma.user.create({
      data: { email, name: "Demo User", passwordHash, color: "#3b82f6" },
    });
    await prisma.userSettings.create({ data: { userId: user.id } });
  }
  const token = signToken({ userId: user.id });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, color: user.color } });
});

router.post("/auth/select", async (req, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) return res.status(400).json({ error: "userId required" });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const token = signToken({ userId: user.id });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, color: user.color } });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { settings: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, color: user.color },
    settings: user.settings,
  });
});

export default router;
