import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { apiGetSettings, apiUpdateSettings, apiGetUsedCategories } from "../api/client";
import { DEFAULT_TRANSACTION_CATEGORIES, DEFAULT_FIXED_COST_CATEGORIES } from "../hooks/useCategories";
import { CategoryList } from "../components/CategoryList";

// ── Main ─────────────────────────────────────────────────────────────────────

export function Settings() {
  const [transactionCats, setTransactionCats] = useState<string[]>(DEFAULT_TRANSACTION_CATEGORIES);
  const [fixedCostCats, setFixedCostCats] = useState<string[]>(DEFAULT_FIXED_COST_CATEGORIES);
  // csvMappings stored as array for UI; saved as Record<string,string>
  const [csvMappings, setCsvMappings] = useState<{ from: string; to: string }[]>([]);
  const [newMappingFrom, setNewMappingFrom] = useState("");
  const [newMappingTo, setNewMappingTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedCategories, setUsedCategories] = useState<{ transaction: string[]; fixedCost: string[] }>({ transaction: [], fixedCost: [] });

  useEffect(() => {
    void Promise.all([apiGetSettings(), apiGetUsedCategories()]).then(([settings, used]) => {
      setUsedCategories(used);
      if ((settings as any)?.defaultCategories) {
        try {
          const parsed = JSON.parse((settings as any).defaultCategories);
          if (parsed?.transaction) setTransactionCats(parsed.transaction);
          if (parsed?.fixedCost) setFixedCostCats(parsed.fixedCost);
          if (parsed?.csvMappings && typeof parsed.csvMappings === "object") {
            setCsvMappings(
              Object.entries(parsed.csvMappings as Record<string, string>).map(([from, to]) => ({ from, to }))
            );
          }
        } catch { /* use defaults */ }
      }
    }).catch((err: any) => setError(err?.message || "Failed to load settings")).finally(() => setLoading(false));
  }, []);

  const addMapping = () => {
    const from = newMappingFrom.trim();
    const to = newMappingTo.trim();
    if (!from || !to || csvMappings.some(m => m.from === from)) return;
    setCsvMappings(prev => [...prev, { from, to }]);
    setNewMappingFrom("");
    setNewMappingTo("");
  };

  const removeMapping = (from: string) => setCsvMappings(prev => prev.filter(m => m.from !== from));

  const updateMappingTo = (from: string, to: string) =>
    setCsvMappings(prev => prev.map(m => m.from === from ? { ...m, to } : m));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const csvMappingsRecord = Object.fromEntries(csvMappings.map(m => [m.from, m.to]));
    try {
      await apiUpdateSettings({
        defaultCategories: JSON.stringify({ transaction: transactionCats, fixedCost: fixedCostCats, csvMappings: csvMappingsRecord }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header with save button */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl text-gray-900" style={{ fontWeight: 600 }}>Settings</h1>
          <p className="text-gray-500 mt-1">Manage your preferences</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-red-600">{error}</span>}
            {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Categories — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <CategoryList
              title="Transaction Categories"
              description="Used when adding or editing transactions"
              categories={transactionCats}
              onChange={setTransactionCats}
              accent="blue"
              inUse={usedCategories.transaction}
            />
            <CategoryList
              title="Fixed Cost Categories"
              description="Used when adding or editing fixed costs"
              categories={fixedCostCats}
              onChange={setFixedCostCats}
              accent="purple"
              inUse={usedCategories.fixedCost}
            />
          </div>

          {/* CSV Mapping — full width, compact */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">CSV Category Mapping</h3>
              <p className="text-sm text-gray-500 mt-0.5">Map bank export names to your app categories</p>
            </div>
            <div className="p-4">
              {csvMappings.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {csvMappings.map((m) => (
                    <div key={m.from} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-mono text-gray-700">{m.from}</span>
                      <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      <select
                        value={m.to}
                        onChange={e => updateMappingTo(m.from, e.target.value)}
                        className="text-xs border-0 bg-transparent focus:outline-none text-gray-700 pr-1"
                      >
                        {transactionCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button onClick={() => removeMapping(m.from)} className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMappingFrom}
                  onChange={e => setNewMappingFrom(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addMapping()}
                  placeholder="Bank category (e.g. Lebensmittel)"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <select
                  value={newMappingTo}
                  onChange={e => setNewMappingTo(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category…</option>
                  {transactionCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button
                  onClick={addMapping}
                  disabled={!newMappingFrom.trim() || !newMappingTo}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
