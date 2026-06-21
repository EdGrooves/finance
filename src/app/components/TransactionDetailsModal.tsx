import { useState } from "react";
import { X, Calendar, Tag, User, Users, DollarSign, Pencil, Euro } from "lucide-react";
import type { Transaction, User as AppUser } from "../types";
import { formatCurrency } from "../utils/format";
import { apiUpdateTransaction } from "../api/client";
import { useCategories } from "../hooks/useCategories";

interface TransactionDetailsModalProps {
  transaction: Transaction;
  users: AppUser[];
  onClose: () => void;
  onUpdated?: (tx: Transaction) => void;
}

export function TransactionDetailsModal({
  transaction,
  users,
  onClose,
  onUpdated,
}: TransactionDetailsModalProps) {
  const { transactionCategories: categories } = useCategories();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    description: transaction.description,
    amount: String(transaction.amount),
    category: transaction.category,
    date: transaction.date.slice(0, 10),
    paidBy: transaction.paidBy,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserById = (id: string) => users.find(u => u.id === id);
  const payer = getUserById(transaction.paidBy);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateSplitAmount = (split: { amount?: number; percentage?: number }) => {
    return split.amount || (transaction.amount * (split.percentage || 0)) / 100;
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.description || !form.category || !amount || amount <= 0) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await apiUpdateTransaction(transaction.id, {
        description: form.description,
        amount,
        category: form.category,
        date: form.date,
        paidBy: form.paidBy,
      });
      onUpdated?.(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update transaction");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!form.description && !!form.category && parseFloat(form.amount) > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
            {isEditing ? "Edit Transaction" : "Transaction Details"}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit"
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Paid by</label>
                <select
                  value={form.paidBy}
                  onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {transaction.isShared && (
              <p className="text-xs text-gray-500">Splits cannot be edited here. Delete and recreate the expense to change splits.</p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Amount */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Total Amount</p>
              <p className="text-4xl text-gray-900" style={{ fontWeight: 600 }}>
                {formatCurrency(transaction.amount)}
              </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Date</span>
                </div>
                <p className="text-gray-900" style={{ fontWeight: 500 }}>
                  {new Date(transaction.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm">Category</span>
                </div>
                <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {transaction.category}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Tag className="w-4 h-4" />
                <span className="text-sm">Description</span>
              </div>
              <p className="text-gray-900" style={{ fontWeight: 500 }}>
                {transaction.description}
              </p>
            </div>

            {/* Paid By */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-3">
                <User className="w-4 h-4" />
                <span className="text-sm">Paid by</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: payer?.color || '#6b7280', fontWeight: 500 }}
                >
                  {payer ? getInitials(payer.name) : '?'}
                </div>
                <div>
                  <p className="text-gray-900" style={{ fontWeight: 500 }}>
                    {payer?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">{payer?.email}</p>
                </div>
              </div>
            </div>

            {/* Split Details */}
            {transaction.isShared && transaction.splits && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 text-gray-700 mb-4">
                  <Users className="w-4 h-4" />
                  <span className="text-sm" style={{ fontWeight: 600 }}>
                    Split Details
                  </span>
                </div>
                <div className="space-y-3">
                  {transaction.splits.map((split, index) => {
                    const user = getUserById(split.userId);
                    const splitAmount = calculateSplitAmount(split);

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                            style={{
                              backgroundColor: user?.color || '#6b7280',
                              fontWeight: 500,
                            }}
                          >
                            {user ? getInitials(user.name) : '?'}
                          </div>
                          <span className="text-sm text-gray-700">{user?.name || 'Unknown'}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                            {formatCurrency(splitAmount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {split.percentage
                              ? `${split.percentage.toFixed(0)}%`
                              : `${((splitAmount / transaction.amount) * 100).toFixed(0)}%`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!transaction.isShared && (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <DollarSign className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">This is a personal expense</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                  setForm({
                    description: transaction.description,
                    amount: String(transaction.amount),
                    category: transaction.category,
                    date: transaction.date.slice(0, 10),
                    paidBy: transaction.paidBy,
                  });
                }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 500 }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
