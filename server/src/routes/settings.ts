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
    defaultCategories: string;
    defaultSplitPercentage: number;
  }>;

  const existing = await prisma.userSettings.findUnique({ where: { userId } });

  const updated = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      currency: body.currency ?? "EUR",
      dateFormat: body.dateFormat ?? "yyyy-MM-dd",
      defaultMonthRange: body.defaultMonthRange ?? 1,
      defaultCategories: body.defaultCategories ? String(body.defaultCategories) : null,
      defaultSplitPercentage: body.defaultSplitPercentage ?? 50,
    },
    update: {
      currency: body.currency ?? existing?.currency,
      dateFormat: body.dateFormat ?? existing?.dateFormat,
      defaultMonthRange: body.defaultMonthRange ?? existing?.defaultMonthRange,
      defaultCategories: body.defaultCategories ? String(body.defaultCategories) : existing?.defaultCategories,
      defaultSplitPercentage: body.defaultSplitPercentage ?? existing?.defaultSplitPercentage,
    },
  });

  return res.json(updated);
});

router.get("/settings/categories-in-use", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [txCats, fcCats] = await Promise.all([
    prisma.transaction.findMany({ where: { paidById: userId }, select: { category: true }, distinct: ["category"] }),
    prisma.fixedCost.findMany({ where: { userId }, select: { category: true }, distinct: ["category"] }),
  ]);
  return res.json({
    transaction: txCats.map(t => t.category),
    fixedCost: fcCats.map(c => c.category),
  });
});

export default router;
