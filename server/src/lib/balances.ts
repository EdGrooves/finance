import type { ExpenseSplit, Transaction, User, Settlement } from "@prisma/client";

export interface BalanceDTO {
  userId: string;
  userName: string;
  amount: number;
  type: "owes" | "owed";
}

interface TransactionWithSplits extends Transaction {
  splits: ExpenseSplit[];
}

interface SettlementWithUsers extends Settlement {
  payer: User;
  payee: User;
}

export function computeBalances(
  currentUserId: string,
  users: User[],
  transactions: TransactionWithSplits[],
  settlements: SettlementWithUsers[],
): BalanceDTO[] {
  const owed: Record<string, Record<string, number>> = {};

  const ensure = (a: string, b: string) => {
    if (!owed[a]) owed[a] = {};
    if (!owed[a][b]) owed[a][b] = 0;
  };

  // Shared transactions: participant owes payer their share
  for (const tx of transactions) {
    if (!tx.isShared) continue;
    for (const split of tx.splits) {
      if (split.userId === tx.paidById) continue;
      const splitAmount = split.amount?.toNumber() ?? (tx.amount.toNumber() * (split.percentage ?? 0)) / 100;
      if (splitAmount <= 0) continue;
      ensure(split.userId, tx.paidById);
      owed[split.userId][tx.paidById] += splitAmount;
    }
  }

  // Settlements: payer pays payee, reducing payer's debt to payee
  for (const s of settlements) {
    const amount = s.amount.toNumber();
    ensure(s.payerId, s.payeeId);
    owed[s.payerId][s.payeeId] -= amount;
  }

  const result: BalanceDTO[] = [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  for (const other of users) {
    if (other.id === currentUserId) continue;
    const owedByOtherToMe = owed[other.id]?.[currentUserId] ?? 0;
    const owedByMeToOther = owed[currentUserId]?.[other.id] ?? 0;
    const net = owedByOtherToMe - owedByMeToOther;
    if (Math.abs(net) < 0.01) continue;

    result.push({
      userId: other.id,
      userName: userMap.get(other.id)?.name ?? "Unknown",
      amount: Math.abs(Number(net.toFixed(2))),
      type: net > 0 ? "owed" : "owes",
    });
  }

  return result;
}
