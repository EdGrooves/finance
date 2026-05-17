import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/settings", requireAuth, async (req: AuthRequest, res) => {
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.userId! } });
  if (!settings) return res.status(404).json({ error: "Settings not found" });
  return res.json(settings);
});

router.put("/settings", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const body = req.body as Partial<{
    currency: string;
    dateFormat: string;
    defaultMonthRange: number;
    defaultCategories: unknown;
    defaultSplitPercentage: number;
  }>;

  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (!existing) return res.status(404).json({ error: "Settings not found" });

  const updated = await prisma.userSettings.update({
    where: { id: existing.id },
    data: {
      currency: body.currency ?? existing.currency,
      dateFormat: body.dateFormat ?? existing.dateFormat,
      defaultMonthRange: body.defaultMonthRange ?? existing.defaultMonthRange,
      defaultCategories: body.defaultCategories ?? existing.defaultCategories,
      defaultSplitPercentage: body.defaultSplitPercentage ?? existing.defaultSplitPercentage,
    },
  });

  return res.json(updated);
});

export default router;
