import { X, Check, Trash2, Users } from "lucide-react";
import type { ReviewRow } from "../utils/csvParser";
import { formatCurrency } from "../utils/format";

export interface ImportReviewModalProps {
  rows: ReviewRow[];
  categories: string[];
  onRowChange: (id: string, patch: Partial<ReviewRow>) => void;
  onToggleAllShared: (shared: boolean) => void;
  onImport: () => void;
  onCancel: () => void;
  importing: boolean;
}

export function ImportReviewModal({ rows, categories, onRowChange, onToggleAllShared, onImport, onCancel, importing }: ImportReviewModalProps) {
  const activeCount = rows.filter(r => !r.skip).length;
  const totalAmount = rows.filter(r => !r.skip).reduce((s, r) => s + r.amount, 0);
  const allActiveShared = rows.filter(r => !r.skip).every(r => r.isShared);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Review Import</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeCount} of {rows.length} rows selected · {formatCurrency(totalAmount)} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleAllShared(!allActiveShared)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                allActiveShared
                  ? "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
              }`}
            >
              <Users className="w-4 h-4" />
              {allActiveShared ? "All Shared" : "Mark All Shared"}
            </button>
            <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Shared</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    row.skip ? "opacity-35 bg-gray-50" : "hover:bg-gray-50/60"
                  }`}
                >
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {new Date(row.date).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.description}
                      onChange={e => onRowChange(row.id, { description: e.target.value })}
                      disabled={row.skip}
                      className={`w-full text-sm font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-0 py-0.5 transition-colors disabled:opacity-50 ${row.skip ? "line-through" : ""}`}
                    />
                    {row.originalCategory !== row.category && (
                      <span className="text-xs text-gray-400">({row.originalCategory})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.category}
                      onChange={e => onRowChange(row.id, { category: e.target.value })}
                      disabled={row.skip}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
                    >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      {!categories.includes(row.category) && (
                        <option value={row.category}>{row.category}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      onChange={e => {
                        const n = parseFloat(e.target.value);
                        if (isFinite(n) && n >= 0) onRowChange(row.id, { amount: n });
                        else if (e.target.value === "" || e.target.value === ".") onRowChange(row.id, { amount: 0 });
                      }}
                      disabled={row.skip}
                      className="w-24 text-sm font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-right px-0 py-0.5 transition-colors disabled:opacity-50"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={row.skip}
                      onClick={() => onRowChange(row.id, { isShared: !row.isShared })}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 ${
                        row.isShared
                          ? "bg-orange-100 text-orange-700 border-orange-300"
                          : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      {row.isShared ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onRowChange(row.id, { skip: !row.skip })}
                      className={`p-1 rounded transition-colors ${
                        row.skip
                          ? "text-blue-400 hover:text-blue-600"
                          : "text-gray-300 hover:text-red-500"
                      }`}
                      title={row.skip ? "Re-include" : "Skip this row"}
                    >
                      {row.skip ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50">
          <p className="text-sm text-gray-500">
            Importing <span className="font-semibold text-gray-800">{activeCount}</span> transactions
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onImport}
              disabled={importing || activeCount === 0}
              className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {importing ? "Importing…" : `Import ${activeCount} rows`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
