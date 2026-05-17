import { useEffect, useState, Fragment } from "react";
import { Plus, Trash2, Edit2, History, AlertTriangle } from "lucide-react";
import { apiCreateFixedCost, apiDeleteFixedCost, apiGetFixedCostHistory, apiGetFixedCosts, apiGetUsers, apiUpdateFixedCost } from "../api/client";
import type { FixedCostHistoryEntry } from "../api/client";
import { useAuth } from "../api/AuthContext";
import { formatCurrency, countPaymentsInMonth } from "../utils/format";
import { useCategories } from "../hooks/useCategories";
import type { User } from "../types";
import { FixedCostFormModal, EMPTY_FORM, formatFrequency } from "../components/FixedCostFormModal";

interface FixedCost {
  id: string;
  ownerId: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  frequencyEvery: number;
  startDate: string;
  isShared: boolean;
  sharedWith: string[];
  endDate: string | null;
  hasHistory: boolean;
}

function parseSharedWith(defaultSplits: unknown): string[] {
  if (!defaultSplits) return [];
  try {
    const parsed = JSON.parse(defaultSplits as string);
    if (Array.isArray(parsed)) return parsed.map((s: any) => s.userId).filter(Boolean);
  } catch { /* ignore */ }
  return [];
}

// ── Main Component ───────────────────────────────────────────────────────────

export function FixedCosts() {
  const { user: currentUser } = useAuth();
  const { fixedCostCategories: categories } = useCategories();
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<{ id: string; hasHistory: boolean } | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, FixedCostHistoryEntry[]>>({});
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [apiCosts, apiUsers] = await Promise.all([apiGetFixedCosts(), apiGetUsers()]);
        setCosts(apiCosts.map((c) => ({
          id: c.id,
          ownerId: c.ownerId,
          name: c.name,
          amount: c.amount,
          category: c.category,
          frequency: c.frequency,
          frequencyEvery: c.frequencyEvery,
          startDate: c.startDate,
          isShared: c.isShared,
          sharedWith: parseSharedWith(c.defaultSplits),
          endDate: c.endDate ?? null,
          hasHistory: c.hasHistory ?? false,
        })));
        setUsers(apiUsers);
      } catch (err: any) {
        setError(err?.message || "Failed to load fixed costs");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const now = new Date();
  const totalMonthly = costs.reduce(
    (sum, c) => sum + countPaymentsInMonth(c.startDate, c.frequency, c.frequencyEvery, now.getFullYear(), now.getMonth(), c.endDate) * c.amount * (c.isShared ? 0.5 : 1),
    0,
  );

  const otherUsers = users.filter(u => u.id !== currentUser?.id);
  const userById = (id: string) => users.find(u => u.id === id);

  const openAdd = () => {
    setFormValues(EMPTY_FORM);
    setFormMode("add");
  };

  const openEdit = (cost: FixedCost) => {
    setEditingId(cost.id);
    setFormValues({
      name: cost.name,
      amount: String(cost.amount),
      category: cost.category,
      frequencyUnit: cost.frequency,
      frequencyEvery: String(cost.frequencyEvery),
      startDate: cost.startDate.slice(0, 10),
      effectiveDate: new Date().toISOString().slice(0, 10),
      endDate: cost.endDate ? cost.endDate.slice(0, 10) : "",
      isShared: cost.isShared,
      sharedWith: cost.sharedWith,
    });
    setFormMode("edit");
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setFormValues(EMPTY_FORM);
  };

  const handleAdd = () => {
    if (!formValues.name || !formValues.amount || !formValues.category || !formValues.startDate) return;
    const amount = parseFloat(formValues.amount);
    const frequencyEvery = parseInt(formValues.frequencyEvery, 10) || 1;
    if (!Number.isFinite(amount)) return;

    const defaultSplits = formValues.isShared && formValues.sharedWith.length > 0
      ? JSON.stringify(formValues.sharedWith.map(userId => ({ userId })))
      : undefined;

    void apiCreateFixedCost({
      name: formValues.name,
      amount,
      category: formValues.category,
      frequency: formValues.frequencyUnit,
      frequencyEvery,
      startDate: new Date(formValues.startDate).toISOString(),
      nextDueDate: new Date(formValues.startDate).toISOString(),
      endDate: formValues.endDate ? new Date(formValues.endDate).toISOString() : undefined,
      isShared: formValues.isShared,
      defaultSplits,
    }).then((created) => {
      setCosts(prev => [...prev, {
        id: created.id,
        ownerId: created.ownerId,
        name: created.name,
        amount: created.amount,
        category: created.category,
        frequency: created.frequency,
        frequencyEvery: created.frequencyEvery,
        startDate: created.startDate,
        isShared: created.isShared,
        sharedWith: parseSharedWith(created.defaultSplits),
        endDate: created.endDate ?? null,
        hasHistory: false,
      }]);
      closeForm();
    }).catch((err: any) => setError(err?.message || "Failed to create fixed cost"));
  };

  const handleSave = () => {
    if (!editingId) return;
    const amount = parseFloat(formValues.amount);
    const frequencyEvery = parseInt(formValues.frequencyEvery, 10) || 1;
    if (!formValues.name || !Number.isFinite(amount)) return;

    const defaultSplits = formValues.isShared && formValues.sharedWith.length > 0
      ? JSON.stringify(formValues.sharedWith.map(uid => ({ userId: uid })))
      : undefined;

    void apiUpdateFixedCost(editingId, {
      name: formValues.name,
      amount,
      category: formValues.category,
      frequency: formValues.frequencyUnit,
      frequencyEvery,
      startDate: new Date(formValues.startDate).toISOString(),
      effectiveDate: formValues.effectiveDate ? new Date(formValues.effectiveDate).toISOString() : undefined,
      endDate: formValues.endDate ? new Date(formValues.endDate).toISOString() : null,
      isShared: formValues.isShared,
      defaultSplits,
    }).then((updated) => {
      setCosts(prev => prev
        .filter(c => c.id !== editingId)
        .concat([{
          id: updated.id,
          ownerId: updated.ownerId,
          name: updated.name,
          amount: updated.amount,
          category: updated.category,
          frequency: updated.frequency,
          frequencyEvery: updated.frequencyEvery,
          startDate: updated.startDate,
          isShared: updated.isShared,
          sharedWith: parseSharedWith(updated.defaultSplits),
          endDate: updated.endDate ?? null,
          hasHistory: true,
        }])
      );
      closeForm();
    }).catch((err: any) => setError(err?.message || "Failed to update"));
  };

  const handleDelete = (cost: FixedCost) => {
    setDeletePrompt({ id: cost.id, hasHistory: cost.hasHistory });
  };

  const confirmDelete = (deleteHistory: boolean) => {
    if (!deletePrompt) return;
    const { id } = deletePrompt;
    void apiDeleteFixedCost(id, deleteHistory).catch(() => {});
    setCosts(prev => prev.filter(c => c.id !== id));
    setDeletePrompt(null);
  };

  const toggleHistory = (id: string) => {
    if (expandedHistoryId === id) { setExpandedHistoryId(null); return; }
    setExpandedHistoryId(id);
    if (!historyCache[id]) {
      void apiGetFixedCostHistory(id).then((entries) =>
        setHistoryCache((prev) => ({ ...prev, [id]: entries }))
      ).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl text-gray-900" style={{ fontWeight: 600 }}>Fixed Costs</h1>
            <p className="text-gray-500 mt-1">Manage your recurring expenses</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Monthly Equivalent</p>
            <p className="text-3xl text-gray-900" style={{ fontWeight: 600 }}>{formatCurrency(totalMonthly)}</p>
          </div>
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      <div className="max-w-5xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm text-gray-600" style={{ fontWeight: 600 }}>Name</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600" style={{ fontWeight: 600 }}>Category</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600" style={{ fontWeight: 600 }}>Start Date</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600" style={{ fontWeight: 600 }}>Frequency</th>
                <th className="px-6 py-3 text-left text-sm text-gray-600" style={{ fontWeight: 600 }}>Shared With</th>
                <th className="px-6 py-3 text-right text-sm text-gray-600" style={{ fontWeight: 600 }}>Amount</th>
                <th className="px-6 py-3 text-right text-sm text-gray-600" style={{ fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {costs.map((cost) => {
                const isOwn = cost.ownerId === currentUser?.id;
                const owner = !isOwn ? userById(cost.ownerId) : null;
                const historyEntries = historyCache[cost.id];

                return (
                  <Fragment key={cost.id}>
                    <tr className={`hover:bg-gray-50 transition-colors${!isOwn ? " bg-blue-50/30" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-900" style={{ fontWeight: 500 }}>{cost.name}</span>
                          {!isOwn && owner && (
                            <span className="text-xs text-blue-500">Shared by {owner.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{cost.category}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>{new Date(cost.startDate).toLocaleDateString("de-DE")}</div>
                        {cost.endDate && (
                          <div className="text-xs text-red-400 mt-0.5">
                            ends {new Date(cost.endDate).toLocaleDateString("de-DE")}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {formatFrequency(cost.frequency, cost.frequencyEvery)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isOwn ? (
                          cost.isShared && cost.sharedWith.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {cost.sharedWith.map(uid => {
                                const u = userById(uid);
                                return u ? (
                                  <span key={uid} className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: u.color }}>
                                    {u.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          ) : <span className="text-xs text-gray-400">—</span>
                        ) : (
                          owner
                            ? <span className="px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: owner.color }}>{owner.name}</span>
                            : <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-900" style={{ fontWeight: 600 }}>{formatCurrency(cost.amount)}</span>
                        {(() => {
                          const hits = countPaymentsInMonth(cost.startDate, cost.frequency, cost.frequencyEvery, now.getFullYear(), now.getMonth(), cost.endDate);
                          const share = cost.isShared ? 0.5 : 1;
                          return hits > 0
                            ? <div className="text-xs text-gray-400 mt-0.5">this month: {formatCurrency(hits * cost.amount * share)}</div>
                            : <div className="text-xs text-gray-400 mt-0.5">not due this month</div>;
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {cost.hasHistory && (
                            <button
                              onClick={() => toggleHistory(cost.id)}
                              className={`p-1.5 transition-colors ${expandedHistoryId === cost.id ? "text-amber-500" : "text-gray-400 hover:text-amber-500"}`}
                              title="Show history"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                          {isOwn ? (
                            <>
                              <button onClick={() => openEdit(cost)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(cost)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedHistoryId === cost.id && (
                      <tr className="bg-amber-50/60">
                        <td colSpan={7} className="px-6 py-4">
                          <p className="text-xs text-amber-700 mb-2" style={{ fontWeight: 600 }}>Change History</p>
                          {!historyEntries ? (
                            <p className="text-xs text-gray-400">Loading…</p>
                          ) : historyEntries.length === 0 ? (
                            <p className="text-xs text-gray-400">No history found.</p>
                          ) : (
                            <div className="space-y-1">
                              {historyEntries.map((entry, i) => {
                                const next = historyEntries[i + 1];
                                const current = i === historyEntries.length - 1 ? cost : null;
                                const nextAmount = next?.amount ?? current?.amount;
                                const delta = nextAmount != null ? nextAmount - entry.amount : null;
                                const from = new Date(entry.startDate).toLocaleDateString("de-DE");
                                const to = new Date(entry.archivedAt).toLocaleDateString("de-DE");
                                return (
                                  <div key={entry.id} className="flex items-center gap-4 text-xs text-gray-600">
                                    <span className="text-gray-400 w-36 flex-shrink-0">{from} → {to}</span>
                                    <span style={{ fontWeight: 500 }}>{formatCurrency(entry.amount)}</span>
                                    {delta != null && delta !== 0 && (
                                      <span className={delta > 0 ? "text-red-500" : "text-green-600"}>
                                        {delta > 0 ? "▲" : "▼"} {formatCurrency(Math.abs(delta))}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={openAdd}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 text-green-600 hover:text-green-700 transition-colors"
          style={{ fontWeight: 500 }}
        >
          <Plus className="w-5 h-5" />
          Add Fixed Cost
        </button>

        <div className="mt-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <h3 className="text-lg mb-4" style={{ fontWeight: 600 }}>Monthly Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-green-100 mb-1">Monthly Equivalent</p>
              <p className="text-2xl" style={{ fontWeight: 600 }}>{formatCurrency(totalMonthly)}</p>
            </div>
            <div>
              <p className="text-sm text-green-100 mb-1">Number of Items</p>
              <p className="text-2xl" style={{ fontWeight: 600 }}>{costs.length}</p>
            </div>
            <div>
              <p className="text-sm text-green-100 mb-1">Average Cost</p>
              <p className="text-2xl" style={{ fontWeight: 600 }}>{formatCurrency(costs.length ? totalMonthly / costs.length : 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {formMode && (
        <FixedCostFormModal
          mode={formMode}
          values={formValues}
          onChange={setFormValues}
          onSave={formMode === "add" ? handleAdd : handleSave}
          onCancel={closeForm}
          otherUsers={otherUsers}
          categories={categories}
        />
      )}

      {/* Delete confirmation modal */}

      {deletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletePrompt(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Fixed Cost</h3>
                {deletePrompt.hasHistory ? (
                  <p className="text-sm text-gray-500 mt-1">This cost has previous versions. What would you like to delete?</p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Are you sure? This cannot be undone.</p>
                )}
              </div>
            </div>
            {deletePrompt.hasHistory ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => confirmDelete(true)}
                  className="w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Delete with full history
                </button>
                <button
                  onClick={() => confirmDelete(false)}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Delete current version only
                </button>
                <button
                  onClick={() => setDeletePrompt(null)}
                  className="w-full py-2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => confirmDelete(false)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletePrompt(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
