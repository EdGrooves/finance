import { X } from "lucide-react";
import type { User } from "../types";

export const EMPTY_FORM = {
  name: "", amount: "", category: "",
  frequencyUnit: "MONTH", frequencyEvery: "1",
  startDate: "", effectiveDate: "", endDate: "",
  isShared: false, sharedWith: [] as string[],
};

const FREQUENCY_UNITS = ["WEEK", "MONTH", "YEAR"];

const unitLabel: Record<string, [string, string]> = {
  WEEK:  ["week",  "weeks"],
  MONTH: ["month", "months"],
  YEAR:  ["year",  "years"],
};

export function formatFrequency(unit: string, every: number): string {
  const u = unit.replace(/LY$/, "").replace(/S$/, "");
  const [singular, plural] = unitLabel[u] ?? [unit.toLowerCase(), unit.toLowerCase()];
  return every === 1 ? `Every ${singular}` : `Every ${every} ${plural}`;
}

export interface FixedCostFormModalProps {
  mode: "add" | "edit";
  values: typeof EMPTY_FORM;
  onChange: (v: typeof EMPTY_FORM) => void;
  onSave: () => void;
  onCancel: () => void;
  otherUsers: User[];
  categories: string[];
}

export function FixedCostFormModal({ mode, values, onChange, onSave, onCancel, otherUsers, categories }: FixedCostFormModalProps) {
  const set = (patch: Partial<typeof EMPTY_FORM>) => onChange({ ...values, ...patch });
  const every = parseInt(values.frequencyEvery, 10) || 1;

  const inputCls = "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${mode === "add" ? "bg-green-50" : "bg-yellow-50"}`}>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === "add" ? "Add Fixed Cost" : "Edit Fixed Cost"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {mode === "add" ? "Set up a new recurring expense" : "Changes take effect from the date you specify"}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className={labelCls}>Name</label>
            <input
              type="text"
              value={values.name}
              onChange={e => set({ name: e.target.value })}
              placeholder="e.g. Netflix, Rent, Internet"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Amount + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (€)</label>
              <input
                type="text"
                inputMode="decimal"
                value={values.amount}
                onChange={e => set({ amount: e.target.value })}
                placeholder="0.00"
                className={inputCls + " text-right font-semibold"}
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={values.category}
                onChange={e => set({ category: e.target.value })}
                className={inputCls}
              >
                <option value="">Select…</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className={labelCls}>Frequency</label>
            <div className="flex gap-2">
              <div className="w-20">
                <input
                  type="text"
                  inputMode="numeric"
                  value={values.frequencyEvery}
                  onChange={e => set({ frequencyEvery: e.target.value })}
                  className={inputCls + " text-center"}
                />
              </div>
              <div className="flex-1">
                <select
                  value={values.frequencyUnit}
                  onChange={e => set({ frequencyUnit: e.target.value })}
                  className={inputCls}
                >
                  {FREQUENCY_UNITS.map(u => (
                    <option key={u} value={u}>{unitLabel[u][every === 1 ? 0 : 1]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates */}
          {mode === "add" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date</label>
                <input
                  type="date"
                  value={values.startDate}
                  onChange={e => set({ startDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={values.endDate}
                  onChange={e => set({ endDate: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Effective From</label>
                <input
                  type="date"
                  value={values.effectiveDate}
                  onChange={e => set({ effectiveDate: e.target.value })}
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1">Old values archived on this date</p>
              </div>
              <div>
                <label className={labelCls}>End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={values.endDate}
                  onChange={e => set({ endDate: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Shared */}
          <div>
            <label className={labelCls}>Sharing</label>
            <button
              type="button"
              onClick={() => set({ isShared: !values.isShared, sharedWith: [] })}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                values.isShared
                  ? "bg-orange-50 text-orange-700 border-orange-300"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {values.isShared ? "Shared — tap to unshare" : "Not shared — tap to share"}
            </button>
            {values.isShared && otherUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {otherUsers.map(u => {
                  const selected = values.sharedWith.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => set({
                        sharedWith: selected
                          ? values.sharedWith.filter(id => id !== u.id)
                          : [...values.sharedWith, u.id],
                      })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selected ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                      style={selected ? { backgroundColor: u.color, borderColor: u.color } : {}}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selected ? "rgba(255,255,255,0.7)" : u.color }} />
                      {u.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            onClick={onSave}
            className={`flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors ${
              mode === "add" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            {mode === "add" ? "Add Fixed Cost" : "Save Changes"}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
