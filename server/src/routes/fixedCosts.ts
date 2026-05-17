import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

function serializeFixedCost(c: any, hasHistory = false) {
  return {
    id: c.id,
    ownerId: c.userId,
    name: c.name,
    amount: c.amount.toNumber(),
    category: c.category,
    frequency: c.frequency,
    frequencyEvery: c.frequencyEvery,
    startDate: c.startDate.toISOString(),
    nextDueDate: c.nextDueDate.toISOString(),
    endDate: c.endDate ? c.endDate.toISOString() : null,
    isShared: c.isShared,
    defaultSplits: c.defaultSplits,
    hasHistory,
  };
}

function buildActiveFilter(asOf?: string) {
  if (asOf) {
    const asOfDate = new Date(asOf);
    asOfDate.setHours(23, 59, 59, 999);
    const monthStart = new Date(asOf.slice(0, 7) + "-01");
    return {
      AND: [
        { startDate: { lte: asOfDate } },
        { OR: [{ archivedAt: null }, { archivedAt: { gt: asOfDate } }] },
        { OR: [{ endDate: null }, { endDate: { gte: monthStart } }] },
      ],
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    AND: [
      { archivedAt: null },
      { OR: [{ endDate: null }, { endDate: { gte: today } }] },
    ],
  };
}

router.get("/fixed-costs", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { asOf } = req.query as { asOf?: string };
  const activeFilter = buildActiveFilter(asOf);

  const [ownCosts, sharedCosts] = await Promise.all([
    (prisma.fixedCost as any).findMany({ where: { userId, ...activeFilter }, orderBy: { startDate: "asc" } }),
    (prisma.fixedCost as any).findMany({ where: { isShared: true, NOT: { userId }, ...activeFilter }, orderBy: { startDate: "asc" } }),
  ]);

  const sharedWithMe = sharedCosts.filter((c: any) => {
    if (!c.defaultSplits) return false;
    try {
      const splits = JSON.parse(c.defaultSplits);
      return Array.isArray(splits) && splits.some((s: any) => s.userId === userId);
    } catch { return false; }
  });

  const allCosts = [...ownCosts, ...sharedWithMe];
  const effectiveChainIds = allCosts.map((c: any) => c.chainId ?? c.id);

  const archivedInChains: any[] = await (prisma.fixedCost as any).findMany({
    where: {
      archivedAt: { not: null },
      OR: [{ id: { in: effectiveChainIds } }, { chainId: { in: effectiveChainIds } }],
    },
    select: { id: true, chainId: true },
  });

  const chainIdsWithHistory = new Set<string>(
    archivedInChains.map((r) => r.chainId ?? r.id),
  );

  return res.json(
    allCosts.map((c: any) => serializeFixedCost(c, chainIdsWithHistory.has(c.chainId ?? c.id))),
  );
});

router.post("/fixed-costs", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const body = req.body as {
    name: string;
    amount: number;
    category: string;
    frequency: string;
    frequencyEvery?: number;
    startDate: string;
    nextDueDate: string;
    endDate?: string;
    isShared?: boolean;
    defaultSplits?: unknown;
  };

  if (!body.name || !body.category || !body.frequency || !body.startDate || typeof body.amount !== "number")
    return res.status(400).json({ error: "Missing required fixed cost fields" });

  const startDate = new Date(body.startDate);
  const cost = await (prisma.fixedCost as any).create({
    data: {
      userId,
      name: body.name,
      amount: body.amount,
      category: body.category,
      frequency: body.frequency,
      frequencyEvery: body.frequencyEvery ?? 1,
      startDate,
      nextDueDate: startDate,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isShared: body.isShared ?? false,
      defaultSplits: body.defaultSplits as string | undefined,
    },
  });

  return res.status(201).json(serializeFixedCost(cost));
});

router.put("/fixed-costs/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const body = req.body as {
    name?: string;
    amount?: number;
    category?: string;
    frequency?: string;
    frequencyEvery?: number;
    startDate?: string;
    effectiveDate?: string;
    endDate?: string | null;
    isShared?: boolean;
    defaultSplits?: unknown;
  };

  const existing = await prisma.fixedCost.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Fixed cost not found" });
  if (existing.userId !== userId) return res.status(403).json({ error: "Forbidden" });

  const effectiveDate = body.effectiveDate ? new Date(body.effectiveDate) : new Date();

  await (prisma.fixedCost as any).update({ where: { id: existing.id }, data: { archivedAt: effectiveDate } });

  const newCost = await (prisma.fixedCost as any).create({
    data: {
      userId,
      name: body.name ?? existing.name,
      amount: body.amount ?? existing.amount,
      category: body.category ?? existing.category,
      frequency: body.frequency ?? existing.frequency,
      frequencyEvery: body.frequencyEvery ?? existing.frequencyEvery,
      startDate: effectiveDate,
      nextDueDate: effectiveDate,
      isShared: body.isShared ?? existing.isShared,
      defaultSplits: (body.defaultSplits ?? existing.defaultSplits) as string | undefined,
      endDate: body.endDate !== undefined
        ? (body.endDate ? new Date(body.endDate) : null)
        : ((existing as any).endDate ?? null),
      chainId: (existing as any).chainId ?? existing.id,
    },
  });

  return res.json(serializeFixedCost(newCost));
});

router.get("/fixed-costs/:id/history", requireAuth, async (req: AuthRequest, res) => {
  const record = await prisma.fixedCost.findUnique({ where: { id: req.params.id } });
  if (!record) return res.status(404).json({ error: "Fixed cost not found" });

  const effectiveChainId = (record as any).chainId ?? record.id;

  const history: any[] = await (prisma.fixedCost as any).findMany({
    where: {
      archivedAt: { not: null },
      OR: [{ id: effectiveChainId }, { chainId: effectiveChainId }],
    },
    orderBy: { startDate: "asc" },
  });

  return res.json(
    history.map((h) => ({
      id: h.id,
      amount: h.amount.toNumber(),
      frequency: h.frequency,
      frequencyEvery: h.frequencyEvery,
      startDate: h.startDate.toISOString(),
      archivedAt: h.archivedAt.toISOString(),
    })),
  );
});

router.delete("/fixed-costs/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { deleteHistory } = req.query as { deleteHistory?: string };

  const record = await prisma.fixedCost.findUnique({ where: { id: req.params.id } });
  if (!record) return res.status(404).json({ error: "Fixed cost not found" });
  if (record.userId !== userId) return res.status(403).json({ error: "Forbidden" });

  if (deleteHistory === "true") {
    const effectiveChainId = (record as any).chainId ?? record.id;
    await (prisma.fixedCost as any).deleteMany({
      where: { OR: [{ id: effectiveChainId }, { chainId: effectiveChainId }] },
    });
  } else {
    await prisma.fixedCost.delete({ where: { id: req.params.id } });
  }

  return res.status(204).send();
});

export default router;
