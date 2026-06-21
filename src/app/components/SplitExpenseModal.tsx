import { useState } from "react";
import { X, Euro, Percent } from "lucide-react";
import type { User, Transaction } from "../types";
import { apiCreateTransaction } from "../api/client";
import { formatCurrency } from "../utils/format";
import { useCategories } from "../hooks/useCategories";

interface SplitExpenseModalProps {
  onClose: () => void;
  users: User[];
  currentUserId: string;
  onCreated?: (tx: Transaction) => void;
}

export function SplitExpenseModal({ onClose, users, currentUserId, onCreated }: SplitExpenseModalProps) {
  const { transactionCategories: categories } = useCategories();
  const [expense, setExpense] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().slice(0, 10),
    paidBy: currentUserId,
  });

  const [splitMode, setSplitMode] = useState<'percentage' | 'amount'>('percentage');
  // Two-person household: the only other party always gets this share, payer gets the remainder.
  const [otherDisplayValue, setOtherDisplayValue] = useState("50");
  const [isSharedExpense, setIsSharedExpense] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseFloat(expense.amount) || 0;
  const otherUser = users.find(u => u.id !== expense.paidBy);
  const payer = users.find(u => u.id === expense.paidBy);

  const otherRaw = parseFloat(otherDisplayValue) || 0;
  const otherPercentage = splitMode === 'percentage' ? otherRaw : (amount > 0 ? (otherRaw / amount) * 100 : 0);
  const otherAmount = splitMode === 'amount' ? otherRaw : (amount * otherRaw) / 100;
  const payerPercentage = 100 - otherPercentage;
  const payerAmount = amount - otherAmount;

  const isValid = splitMode === 'percentage'
    ? otherPercentage <= 100.01
    : otherAmount <= amount + 0.01;

  const handleSplitModeChange = (mode: 'percentage' | 'amount') => {
    // Carry the current split over when switching units, instead of resetting to 50.
    setOtherDisplayValue(mode === 'percentage' ? String(Math.round(otherPercentage)) : otherAmount.toFixed(2));
    setSplitMode(mode);
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();

    const hasBasicFields = !!expense.description && !!expense.category && amount > 0;
    if (!hasBasicFields) return;
    if (isSharedExpense && (!otherUser || !isValid)) return;

    setError(null);
    setSubmitting(true);

    const run = async () => {
      try {
        let tx: Transaction;

        if (!isSharedExpense) {
          tx = await apiCreateTransaction({
            description: expense.description,
            amount,
            category: expense.category,
            date: expense.date,
            paidBy: expense.paidBy,
            isShared: false,
          } as any);
        } else {
          const payloadSplits = [
            {
              userId: otherUser!.id,
              amount: splitMode === "amount" ? otherAmount : undefined,
              percentage: splitMode === "percentage" ? otherPercentage : undefined,
            },
            {
              userId: expense.paidBy,
              amount: splitMode === "amount" ? payerAmount : undefined,
              percentage: splitMode === "percentage" ? payerPercentage : undefined,
            },
          ];

          tx = await apiCreateTransaction({
            description: expense.description,
            amount,
            category: expense.category,
            date: expense.date,
            paidBy: expense.paidBy,
            isShared: true,
            splits: payloadSplits,
          } as any);
        }

        onCreated?.(tx as Transaction);
        onClose();
      } catch (err: any) {
        setError(err?.message || "Failed to create expense");
      } finally {
        setSubmitting(false);
      }
    };

    void run();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasBasicFields = !!expense.description && !!expense.category && amount > 0;
  const canSubmit = hasBasicFields && (!isSharedExpense || isValid);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
              Add Expense
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Create and split an expense
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

         {/* Form */}
         <form onSubmit={handleSubmit} className="p-6 space-y-6">
             {/* Basic Info */}
          <div className="space-y-4">
               <div>
              <label className="block text-sm text-gray-700 mb-1.5">Description</label>
              <input
                type="text"
                value={expense.description}
                onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                placeholder="What did you spend on?"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={expense.date}
                  onChange={(e) => setExpense({ ...expense, date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={expense.amount}
                    onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Category</label>
                <select
                  value={expense.category}
                  onChange={(e) => setExpense({ ...expense, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isSharedExpense && <div>
              <label className="block text-sm text-gray-700 mb-1.5">Paid by</label>
               <select
                  value={expense.paidBy}
                  onChange={(e) => setExpense({ ...expense, paidBy: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
               >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                     {user.name}
                  </option>
                ))}
              </select>
            </div>}
          </div>

          {/* Expense type: Personal vs Shared */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                  Expense type
                </h3>
                <p className="text-xs text-gray-500">
                  Choose whether this is personal or shared
                </p>
              </div>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsSharedExpense(false)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                    !isSharedExpense ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => setIsSharedExpense(true)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                    isSharedExpense ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  Shared
                </button>
              </div>
            </div>
          </div>

          {/* Split Section — always between payer and the one other person */}
          {isSharedExpense && otherUser && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                  Split with {otherUser.name}
                </h3>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleSplitModeChange('percentage')}
                    className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                      splitMode === 'percentage'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600'
                    }`}
                    style={{ fontWeight: 500 }}
                  >
                    <Percent className="w-3 h-3 inline mr-1" />
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSplitModeChange('amount')}
                    className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                      splitMode === 'amount'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600'
                    }`}
                    style={{ fontWeight: 500 }}
                  >
                    <Euro className="w-3 h-3 inline mr-1" />
                    Amount
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: otherUser.color, fontWeight: 500 }}
                  >
                    {getInitials(otherUser.name)}
                  </div>
                  <span className="flex-1 text-sm text-gray-700">{otherUser.name}</span>

                  {splitMode === 'percentage' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={otherDisplayValue}
                        onChange={(e) => setOtherDisplayValue(e.target.value)}
                        className="w-20 px-2 py-1.5 text-right bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      <span className="text-sm text-gray-400 w-20 text-right">
                        {formatCurrency(otherAmount)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={otherDisplayValue}
                        onChange={(e) => setOtherDisplayValue(e.target.value)}
                        className="w-24 px-2 py-1.5 text-right bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-400 w-16 text-right">
                        {otherPercentage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Payer's implicit share (read-only) */}
                {payer && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: payer.color, fontWeight: 500 }}
                    >
                      {getInitials(payer.name)}
                    </div>
                    <span className="flex-1 text-sm text-gray-700">
                      {payer.name} <span className="text-xs text-blue-500">(paid)</span>
                    </span>
                    {splitMode === 'percentage' ? (
                      <div className="flex items-center gap-2">
                        <span className="w-20 px-2 py-1.5 text-right text-sm text-gray-500">
                          {payerPercentage.toFixed(2)}%
                        </span>
                        <span className="text-sm text-gray-400 w-20 text-right">
                          {formatCurrency(payerAmount)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-gray-300" />
                        <span className="w-24 px-2 py-1.5 text-right text-sm text-gray-500">
                          {payerAmount.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-400 w-16 text-right">
                          {payerPercentage.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!isValid && (
                  <p className="text-xs text-red-600">
                    {splitMode === 'percentage'
                      ? `${otherUser.name} cannot exceed 100% — payer would owe a negative amount`
                      : `${otherUser.name} cannot exceed ${formatCurrency(amount)} — payer would owe a negative amount`}
                  </p>
                )}
              </div>
            </div>
          )}

           {/* Error & Actions */}
           {error && (
             <p className="text-sm text-red-600 mb-2">{error}</p>
           )}
           <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Cancel
            </button>
              <button
               type="submit"
                disabled={!canSubmit || submitting}
                className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 500 }}
              >
               {submitting ? "Creating..." : "Create Expense"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
