import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { apiGetSettings, apiUpdateSettings } from "../api/client";
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

  useEffect(() => {
    void apiGetSettings().then((settings: any) => {
      if (settings?.defaultCategories) {
        try {
          const parsed = JSON.parse(settings.defaultCategories);
          if (parsed?.transaction) setTransactionCats(parsed.transaction);
          if (parsed?.fixedCost) setFixedCostCats(parsed.fixedCost);
          if (parsed?.csvMappings && typeof parsed.csvMappings === "object") {
            setCsvMappings(
              Object.entries(parsed.csvMappings as Record<string, string>).map(([from, to]) => ({ from, to }))
            );
          }
        } catch { /* use defaults */ }
      }
    }).catch(() => {}).finally(() => setLoading(false));
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
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900" style={{ fontWeight: 600 }}>Settings</h1>
        <p className="text-gray-500 mt-1">Manage your preferences</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Categories</h2>
            <div className="space-y-4">
              <CategoryList
                title="Transaction Categories"
                description="Used when adding or editing transactions"
                categories={transactionCats}
                onChange={setTransactionCats}
                accent="blue"
              />
              <CategoryList
                title="Fixed Cost Categories"
                description="Used when adding or editing fixed costs"
                categories={fixedCostCats}
                onChange={setFixedCostCats}
                accent="purple"
              />
            </div>
          </div>

          {/* CSV Category Mapping */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">CSV Category Mapping</h2>
            <p className="text-sm text-gray-500 mb-3">Map bank export category names to your app categories</p>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {csvMappings.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {csvMappings.map((m) => (
                    <div key={m.from} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex-1 text-sm font-mono text-gray-700 bg-gray-50 px-2.5 py-1 rounded">{m.from}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <select
                        value={m.to}
                        onChange={e => updateMappingTo(m.from, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {transactionCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button onClick={() => removeMapping(m.from)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Add new mapping */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-100">
                <input
                  type="text"
                  value={newMappingFrom}
                  onChange={e => setNewMappingFrom(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addMapping()}
                  placeholder="Bank category (e.g. Lebensmittel)"
                  className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <select
                  value={newMappingTo}
                  onChange={e => setNewMappingTo(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select category…</option>
                  {transactionCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button
                  onClick={addMapping}
                  disabled={!newMappingFrom.trim() || !newMappingTo}
                  className="p-1.5 text-blue-500 hover:text-blue-700 disabled:text-gray-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}
