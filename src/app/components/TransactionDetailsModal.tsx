import { X, Calendar, Tag, User, Users, DollarSign } from "lucide-react";
import type { Transaction, User as AppUser } from "../types";
import { formatCurrency } from "../utils/format";

interface TransactionDetailsModalProps {
  transaction: Transaction;
  users: AppUser[];
  onClose: () => void;
}

export function TransactionDetailsModal({
  transaction,
  users,
  onClose,
}: TransactionDetailsModalProps) {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Transaction Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
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

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            style={{ fontWeight: 500 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
