import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { computeBalances } from "../lib/balances.js";

const router = Router();

router.get("/balances", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [users, transactions, settlements] = await Promise.all([
    prisma.user.findMany(),
    prisma.transaction.findMany({
      where: {
        OR: [{ paidById: userId }, { splits: { some: { userId } } }],
        isShared: true,
      },
      include: { splits: true },
    }),
    prisma.settlement.findMany({
      where: { OR: [{ payerId: userId }, { payeeId: userId }] },
      include: { payer: true, payee: true },
    }),
  ]);

  return res.json(computeBalances(userId, users, transactions, settlements));
});

router.post("/settlements", requireAuth, async (req: AuthRequest, res) => {
  const payerId = req.userId!;
  const body = req.body as { payeeId: string; amount: number; date?: string; description?: string };

  if (!body.payeeId || typeof body.amount !== "number" || body.amount <= 0)
    return res.status(400).json({ error: "Invalid settlement payload" });
  if (body.payeeId === payerId)
    return res.status(400).json({ error: "Cannot settle with yourself" });

  const payee = await prisma.user.findUnique({ where: { id: body.payeeId } });
  if (!payee) return res.status(400).json({ error: "Payee does not exist" });

  const settlement = await prisma.settlement.create({
    data: {
      payerId,
      payeeId: body.payeeId,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      description: body.description,
    },
  });

  return res.status(201).json({
    id: settlement.id,
    payerId: settlement.payerId,
    payeeId: settlement.payeeId,
    amount: settlement.amount.toNumber(),
    date: settlement.date.toISOString(),
    description: settlement.description,
  });
});

export default router;
