import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { validateAndNormalizeSplits, type SplitInput } from "../lib/splits.js";

const router = Router();

function serializeTransaction(t: any) {
  return {
    id: t.id,
    description: t.description,
    amount: t.amount.toNumber(),
    category: t.category,
    date: t.date.toISOString().slice(0, 10),
    paidBy: t.paidById,
    isShared: t.isShared,
    splits: t.splits.map((s: any) => ({
      userId: s.userId,
      amount: s.amount?.toNumber(),
      percentage: s.percentage ?? undefined,
    })),
  };
}

router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { startDate, endDate, category, isShared } = req.query as Record<string, string | undefined>;

  const where: any = { OR: [{ paidById: userId }, { splits: { some: { userId } } }] };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  if (category) where.category = category;
  if (isShared === "true") where.isShared = true;
  if (isShared === "false") where.isShared = false;

  const txs = await prisma.transaction.findMany({
    where,
    include: { splits: true },
    orderBy: { date: "desc" },
  });

  return res.json(txs.map(serializeTransaction));
});

// Import must be registered before /:id to avoid route conflict
router.post("/transactions/import", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const rows = req.body?.rows as
    | { Date: string; Description: string; Category: string; Amount: number; isShared?: boolean }[]
    | undefined;

  if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: "rows array is required" });

  const valid: typeof rows = [];
  const errors: { index: number; error: string }[] = [];

  rows.forEach((row, index) => {
    const date = row.Date ? new Date(row.Date) : null;
    if (!date || isNaN(date.getTime())) { errors.push({ index, error: "Invalid date" }); return; }
    if (!row.Description) { errors.push({ index, error: "Missing description" }); return; }
    if (!row.Category) { errors.push({ index, error: "Missing category" }); return; }
    if (typeof row.Amount !== "number" || !isFinite(row.Amount)) { errors.push({ index, error: "Invalid amount" }); return; }
    valid.push(row);
  });

  if (valid.length === 0) return res.status(400).json({ error: "No valid rows", errors });

  const partner = await prisma.user.findFirst({ where: { id: { not: userId } }, select: { id: true } });

  for (const row of valid) {
    const shared = row.isShared ?? false;
    await prisma.transaction.create({
      data: {
        description: row.Description,
        amount: row.Amount,
        category: row.Category,
        date: new Date(row.Date),
        paidById: userId,
        isShared: shared,
        isFixed: false,
        origin: "CSV_IMPORT",
        ...(shared && partner
          ? { splits: { create: [{ userId: partner.id, amount: row.Amount / 2, percentage: 50 }] } }
          : {}),
      },
    });
  }

  return res.status(201).json({ imported: valid.length, failed: errors.length, errors });
});

router.post("/transactions", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const body = req.body as {
    description: string;
    amount: number;
    category: string;
    date: string;
    paidBy?: string;
    isShared?: boolean;
    splits?: SplitInput[];
    origin?: "CSV_IMPORT" | "MANUAL_ENTRY" | "SYSTEM_SETTLEMENT";
    isFixed?: boolean;
  };

  if (!body.description || !body.category || !body.date || typeof body.amount !== "number")
    return res.status(400).json({ error: "Missing required transaction fields" });

  const paidById = body.paidBy || userId;
  const isShared = !!body.isShared;

  let normalizedSplits: SplitInput[] | undefined;
  if (isShared) {
    if (!body.splits || body.splits.length === 0)
      return res.status(400).json({ error: "Shared transactions require splits" });
    normalizedSplits = validateAndNormalizeSplits(body.amount, body.splits);
    const userIds = [...new Set(normalizedSplits.map((s) => s.userId))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    if (users.length !== userIds.length)
      return res.status(400).json({ error: "One or more split users do not exist" });
  }

  const tx = await prisma.transaction.create({
    data: {
      description: body.description,
      amount: body.amount,
      category: body.category,
      date: new Date(body.date),
      paidById,
      isShared,
      isFixed: body.isFixed ?? false,
      origin: body.origin ?? "MANUAL_ENTRY",
      splits: normalizedSplits
        ? { create: normalizedSplits.map((s) => ({ userId: s.userId, amount: s.amount, percentage: s.percentage })) }
        : undefined,
    },
    include: { splits: true },
  });

  return res.status(201).json(serializeTransaction(tx));
});

router.put("/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
  const body = req.body as {
    description?: string;
    amount?: number;
    category?: string;
    date?: string;
    paidBy?: string;
    isShared?: boolean;
    splits?: SplitInput[] | null;
    isFixed?: boolean;
  };

  const existing = await prisma.transaction.findUnique({
    where: { id: req.params.id },
    include: { splits: true },
  });
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  const amount = body.amount ?? existing.amount.toNumber();
  const isShared = body.isShared ?? existing.isShared;

  let normalizedSplits: SplitInput[] | undefined | null = undefined;
  if (body.splits === null || (!isShared && body.splits)) {
    await prisma.expenseSplit.deleteMany({ where: { transactionId: existing.id } });
    normalizedSplits = null;
  } else if (isShared && body.splits) {
    normalizedSplits = validateAndNormalizeSplits(amount, body.splits);
    const userIds = [...new Set(normalizedSplits.map((s) => s.userId))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    if (users.length !== userIds.length)
      return res.status(400).json({ error: "One or more split users do not exist" });
    await prisma.expenseSplit.deleteMany({ where: { transactionId: existing.id } });
  }

  const updated = await prisma.transaction.update({
    where: { id: existing.id },
    data: {
      description: body.description ?? existing.description,
      amount,
      category: body.category ?? existing.category,
      date: body.date ? new Date(body.date) : existing.date,
      paidById: body.paidBy ?? existing.paidById,
      isShared,
      isFixed: body.isFixed ?? existing.isFixed,
      splits:
        normalizedSplits && normalizedSplits.length > 0
          ? { create: normalizedSplits.map((s) => ({ userId: s.userId, amount: s.amount, percentage: s.percentage })) }
          : undefined,
    },
    include: { splits: true },
  });

  return res.json(serializeTransaction(updated));
});

router.delete("/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
  await prisma.expenseSplit.deleteMany({ where: { transactionId: req.params.id } });
  await prisma.transaction.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

export default router;
