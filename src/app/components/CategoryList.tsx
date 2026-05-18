import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";

export interface CategoryListProps {
  title: string;
  description: string;
  categories: string[];
  onChange: (cats: string[]) => void;
  accent: "blue" | "purple";
  inUse?: string[];
}

export function CategoryList({ title, description, categories, onChange, accent, inUse = [] }: CategoryListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const accentRing = accent === "blue" ? "focus:ring-blue-500" : "focus:ring-purple-500";
  const accentBg = accent === "blue" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700";
  const accentBtn = accent === "blue"
    ? "bg-blue-600 hover:bg-blue-700 text-white"
    : "bg-purple-600 hover:bg-purple-700 text-white";

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditValue(categories[i]);
  };

  const saveEdit = () => {
    if (!editValue.trim() || editingIndex === null) { setEditingIndex(null); return; }
    const updated = [...categories];
    updated[editingIndex] = editValue.trim();
    onChange(updated);
    setEditingIndex(null);
  };

  const remove = (i: number) => {
    onChange(categories.filter((_, idx) => idx !== i));
  };

  const addNew = () => {
    const trimmed = newValue.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    onChange([...categories, trimmed]);
    setNewValue("");
    setShowAdd(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="p-4 space-y-1.5">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
            {editingIndex === i ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingIndex(null); }}
                  className={`flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${accentRing}`}
                  autoFocus
                />
                <button onClick={saveEdit} className="p-1.5 text-green-600 hover:text-green-700">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingIndex(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className={`flex-1 px-2.5 py-1 rounded-full text-sm font-medium ${accentBg} w-fit`}>{cat}</span>
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(i)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {inUse.includes(cat) ? (
                    <span className="px-2 py-0.5 text-xs text-gray-400 rounded" title="In use — cannot delete">in use</span>
                  ) : (
                    <button onClick={() => remove(i)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {showAdd ? (
          <div className="flex items-center gap-2 pt-1">
            <GripVertical className="w-4 h-4 text-gray-200 flex-shrink-0" />
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addNew(); if (e.key === "Escape") { setShowAdd(false); setNewValue(""); } }}
              placeholder="Category name…"
              className={`flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${accentRing}`}
              autoFocus
            />
            <button onClick={addNew} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${accentBtn}`}>
              Add
            </button>
            <button onClick={() => { setShowAdd(false); setNewValue(""); }} className="p-1.5 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50 mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add category
          </button>
        )}
      </div>
    </div>
  );
}
