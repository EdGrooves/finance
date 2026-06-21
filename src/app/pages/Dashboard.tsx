import { useEffect, useState } from "react";
import {
  DollarSign,
  CreditCard,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { SplitExpenseModal } from "../components/SplitExpenseModal";
import { TransactionDetailsModal } from "../components/TransactionDetailsModal";
import type { Transaction, User } from "../types";
import { useAuth } from "../api/AuthContext";
import { apiGetFixedCosts, apiGetTransactions, apiGetUsers, apiDeleteTransaction } from "../api/client";
import { formatCurrency, countPaymentsInMonth } from "../utils/format";
import { useCategories } from "../hooks/useCategories";

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "#10b981",
  "Dining Out": "#3b82f6",
  Utilities: "#8b5cf6",
  Entertainment: "#f59e0b",
  Transportation: "#ec4899",
  Shopping: "#6b7280",
};

export function Dashboard() {
  const { user } = useAuth();
  const { transactionCategories } = useCategories();
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [sharedFilter, setSharedFilter] = useState<"all" | "personal" | "shared">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [fixedCosts, setFixedCosts] = useState<{ id: string; name: string; category: string; amount: number; frequency: string; frequencyEvery: number; isShared: boolean; startDate: string; endDate: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = user?.id || "";
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const prevMonth = () => setSelectedMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => {
    const n = new Date();
    setSelectedMonth(({ year, month }) => {
      if (year === n.getFullYear() && month === n.getMonth()) return { year, month };
      return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
    });
  };
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const [txs, allUsers] = await Promise.all([
          apiGetTransactions(),
          apiGetUsers(),
        ]);
        setTransactions(txs);
        setUsers(allUsers);
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const now = new Date();
    const isCurrent = selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();
    const asOf = isCurrent
      ? undefined
      : new Date(selectedMonth.year, selectedMonth.month + 1, 0).toISOString().slice(0, 10);

    void apiGetFixedCosts(asOf)
      .then((costs) =>
        setFixedCosts(costs.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          amount: c.amount,
          frequency: c.frequency,
          frequencyEvery: c.frequencyEvery,
          isShared: c.isShared,
          startDate: c.startDate,
          endDate: c.endDate ?? null,
        })))
      )
      .catch(() => {});
  }, [currentUserId, selectedMonth]);

  // Returns this user's effective cost on a transaction:
  // own transactions = full amount; split transactions paid by others = split amount
  const getUserAmount = (t: Transaction): number => {
    const mySplit = t.splits?.find((s) => s.userId === currentUserId);
    if (mySplit?.amount != null) return mySplit.amount;
    if (mySplit?.percentage != null) return t.amount * mySplit.percentage / 100;
    if (t.isShared) return t.amount * 0.5;
    return t.paidBy === currentUserId ? t.amount : 0;
  };

  const monthTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month;
  });

  const displayedTransactions = monthTransactions
    .filter((t) => sharedFilter === "all" || (sharedFilter === "shared" ? t.isShared : !t.isShared))
    .filter((t) => categoryFilter === "all" || t.category === categoryFilter)
    .slice()
    .sort((a, b) => {
      const diff = sortBy === "amount"
        ? getUserAmount(a) - getUserAmount(b)
        : new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === "asc" ? diff : -diff;
    });

  // Calculate KPIs for selected month
  const totalSpending = monthTransactions.reduce((sum, t) => sum + getUserAmount(t), 0);
  const ownFixedCostsMonthly = fixedCosts
    .filter((c) => !c.isShared)
    .reduce((sum, c) => sum + countPaymentsInMonth(c.startDate, c.frequency, c.frequencyEvery, selectedMonth.year, selectedMonth.month, c.endDate) * c.amount, 0);
  const sharedFixedCostsFull = fixedCosts
    .filter((c) => c.isShared)
    .reduce((sum, c) => sum + countPaymentsInMonth(c.startDate, c.frequency, c.frequencyEvery, selectedMonth.year, selectedMonth.month, c.endDate) * c.amount, 0);
  const sharedFixedCostsMonthly = sharedFixedCostsFull * 0.5;

  const variablePersonal = monthTransactions
    .filter((t) => !t.isShared)
    .reduce((sum, t) => sum + t.amount, 0);
  const variableSharedFull = monthTransactions
    .filter((t) => t.isShared)
    .reduce((sum, t) => sum + t.amount, 0);
  const variableShared = monthTransactions
    .filter((t) => t.isShared)
    .reduce((sum, t) => sum + getUserAmount(t), 0);

  const handleDeleteTransaction = (id: string) => {
    void apiDeleteTransaction(id).catch(() => {});
    setTransactions(prev => prev.filter(t => t.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => void apiDeleteTransaction(id).catch(() => {}));
    setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const monthlyData = (() => {
    const byMonth = new Map<string, number>();
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth.set(key, (byMonth.get(key) || 0) + getUserAmount(t));
    });

    const entries = Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const lastFive = entries.slice(-5);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return lastFive.map(([key, spending]) => {
      const monthIndex = Number(key.split("-")[1]);
      return { month: monthNames[monthIndex] || "", spending };
    });
  })();

  const categoryData = (() => {
    const byCat = new Map<string, number>();
    monthTransactions.forEach((t) => {
      byCat.set(t.category, (byCat.get(t.category) || 0) + getUserAmount(t));
    });
    return Array.from(byCat.entries()).map(([name, value]: [string, number]) => ({
      name, value, color: CATEGORY_COLORS[name] || "#6b7280",
    }));
  })();

  const dailyData = (() => {
    const byDay = new Map<number, number>();
    monthTransactions.forEach((t) => {
      const day = new Date(t.date).getDate();
      byDay.set(day, (byDay.get(day) || 0) + getUserAmount(t));
    });
    const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      spending: byDay.get(i + 1) || 0,
    }));
  })();

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl text-gray-900" style={{ fontWeight: 600 }}>Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <button onClick={prevMonth} className="p-0.5 hover:text-green-600 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={`${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, "0")}`}
                max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`}
                onChange={e => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  if (y && m) setSelectedMonth({ year: y, month: m - 1 });
                }}
                className="text-gray-900 text-sm font-medium bg-transparent border-none outline-none cursor-pointer mx-1 w-36 text-center"
              />
              <button onClick={nextMonth} className="p-0.5 hover:text-green-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowSplitModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </div>
        </div>
        <p className="text-gray-500">Overview of your personal and shared finances</p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Total Spending */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">Total Spending</p>
          {(() => {
            const total = ownFixedCostsMonthly + sharedFixedCostsMonthly + totalSpending;
            const fixedPct = total > 0 ? ((ownFixedCostsMonthly + sharedFixedCostsMonthly) / total) * 100 : 0;
            const varPct = total > 0 ? (totalSpending / total) * 100 : 0;
            return (
              <>
                <p className="text-2xl text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                  {formatCurrency(total)}
                </p>
                <p className="text-xs text-gray-400 mb-3">Your total · this month</p>
                <div>
                  <div className="flex rounded-full overflow-hidden h-1.5 mb-2">
                    <div className="bg-blue-400 transition-all" style={{ width: `${fixedPct}%` }} />
                    <div className="bg-purple-400 transition-all" style={{ width: `${varPct}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Fixed</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Variable</span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Fixed Costs — personal + shared split */}
        {(() => {
          const total = ownFixedCostsMonthly + sharedFixedCostsFull;
          const ownPct = total > 0 ? (ownFixedCostsMonthly / total) * 100 : 50;
          const sharedPct = 100 - ownPct;
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-1">Fixed Costs</p>
              <p className="text-2xl text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                {formatCurrency(total)}
              </p>
              {/* Split bar */}
              <div className="flex rounded-full overflow-hidden h-1.5 mb-3">
                <div className="bg-blue-500 transition-all" style={{ width: `${ownPct}%` }} />
                <div className="bg-indigo-300 transition-all" style={{ width: `${sharedPct}%` }} />
              </div>
              {/* Two columns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-500 mb-0.5">Personal</p>
                  <p className="text-sm text-blue-900" style={{ fontWeight: 600 }}>{formatCurrency(ownFixedCostsMonthly)}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-indigo-400 mb-0.5">Shared (50%)</p>
                  <p className="text-sm text-indigo-900" style={{ fontWeight: 600 }}>{formatCurrency(sharedFixedCostsMonthly)}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Variable Costs — personal + shared split */}
        {(() => {
          const total = variablePersonal + variableSharedFull;
          const personalPct = total > 0 ? (variablePersonal / total) * 100 : 50;
          const sharedPct = 100 - personalPct;
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-1">Variable Costs</p>
              <p className="text-2xl text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                {formatCurrency(total)}
              </p>
              {/* Split bar */}
              <div className="flex rounded-full overflow-hidden h-1.5 mb-3">
                <div className="bg-purple-500 transition-all" style={{ width: `${personalPct}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${sharedPct}%` }} />
              </div>
              {/* Two columns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-purple-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-purple-500 mb-0.5">Personal</p>
                  <p className="text-sm text-purple-900" style={{ fontWeight: 600 }}>{formatCurrency(variablePersonal)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-500 mb-0.5">Shared (your share)</p>
                  <p className="text-sm text-amber-900" style={{ fontWeight: 600 }}>{formatCurrency(variableShared)}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Monthly Trend */}
        <div className="col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>
              Monthly Spending Trend
            </h2>
            <p className="text-sm text-gray-500">Last 5 months</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: "12px" }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <Line
                type="monotone"
                dataKey="spending"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>
              Spending by Category
            </h2>
            <p className="text-sm text-gray-500">This month</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
              <PieChart>
               <Pie
                  data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                 {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
               <Tooltip
                 formatter={(value: any) => formatCurrency(Number(value))}
                 contentStyle={{
                   backgroundColor: "white",
                   border: "1px solid #e5e7eb",
                   borderRadius: "8px",
                   fontSize: "14px",
                 }}
               />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryData.slice(0, 3).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-gray-700">{cat.name}</span>
                </div>
                <span className="text-gray-900" style={{ fontWeight: 500 }}>
                  {formatCurrency(cat.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Spending */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="mb-4">
          <h2 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>Spending by Day</h2>
          <p className="text-sm text-gray-500">{MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: "11px" }} tickLine={false} />
            <YAxis stroke="#9ca3af" style={{ fontSize: "11px" }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value: any) => formatCurrency(Number(value))}
              contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px" }}
            />
            <Bar dataKey="spending" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fixed Costs This Month */}
      {fixedCosts.length > 0 && (() => {
        const rows = fixedCosts
          .map((c) => {
            const hits = countPaymentsInMonth(c.startDate, c.frequency, c.frequencyEvery, selectedMonth.year, selectedMonth.month, c.endDate);
            const share = c.isShared ? 0.5 : 1;
            return { ...c, hits, yourCost: hits * c.amount * share };
          })
          .sort((a, b) => (a.hits === 0 ? 1 : 0) - (b.hits === 0 ? 1 : 0));
        const unitLabels: Record<string, [string, string]> = {
          WEEK: ["week", "weeks"], MONTH: ["month", "months"], YEAR: ["year", "years"],
        };
        const fmtFreq = (freq: string, every: number) => {
          const u = freq.replace(/LY$/, "").replace(/S$/, "");
          const [s, p] = unitLabels[u] ?? [freq.toLowerCase(), freq.toLowerCase()];
          return every === 1 ? `Every ${s}` : `Every ${every} ${p}`;
        };
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>Fixed Costs</h2>
              <p className="text-sm text-gray-500">{MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Name</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Category</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Frequency</th>
                  <th className="px-6 py-3 text-center text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Payments</th>
                  <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Per Payment</th>
                  <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Your Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className={r.hits === 0 ? "opacity-40" : ""}>
                    <td className="px-6 py-3 text-sm text-gray-900" style={{ fontWeight: 500 }}>
                      {r.name}
                      {r.isShared && <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">shared</span>}
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{r.category}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{fmtFreq(r.frequency, r.frequencyEvery)}</td>
                    <td className="px-6 py-3 text-sm text-center text-gray-700">{r.hits === 0 ? "—" : r.hits}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(r.amount)}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-900" style={{ fontWeight: 600 }}>
                      {r.hits === 0 ? <span className="text-gray-400 font-normal">not due</span> : formatCurrency(r.yourCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={displayedTransactions.length > 0 && displayedTransactions.every(t => selectedIds.has(t.id))}
                ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && !displayedTransactions.every(t => selectedIds.has(t.id)); }}
                onChange={e => {
                  if (e.target.checked) setSelectedIds(new Set(displayedTransactions.map(t => t.id)));
                  else setSelectedIds(new Set());
                }}
                className="w-4 h-4 rounded border-gray-300 text-green-600 cursor-pointer"
              />
              <div>
                <h2 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>Transactions</h2>
                <p className="text-sm text-gray-500">{displayedTransactions.length} transaction{displayedTransactions.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete {selectedIds.size} selected
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {(["all", "personal", "shared"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSharedFilter(opt)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all capitalize ${
                    sharedFilter === opt ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
              >
                <option value="all">All categories</option>
                {transactionCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "amount")}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                {sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
           <div className="space-y-3">
            {displayedTransactions.map((transaction) => {
              const payer = getUserById(transaction.paidBy);
              const isYourExpense = transaction.paidBy === currentUserId;

              const isSelected = selectedIds.has(transaction.id);
              return (
                <div
                  key={transaction.id}
                  className={`w-full flex items-center gap-2 py-3 border-b border-gray-100 last:border-0 rounded-lg px-2 transition-colors ${isSelected ? "bg-red-50/40" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(transaction.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-red-500 cursor-pointer flex-shrink-0"
                  />
                  <button
                    onClick={() => setSelectedTransaction(transaction)}
                    className="flex items-center justify-between flex-1 text-left"
                  >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{
                        backgroundColor: payer?.color || '#6b7280',
                        fontWeight: 500,
                      }}
                    >
                      {payer ? getInitials(payer.name) : '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900" style={{ fontWeight: 500 }}>
                          {transaction.description}
                        </p>
                        {transaction.isShared && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Shared
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {transaction.category} • {transaction.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className="text-lg text-gray-900"
                        style={{ fontWeight: 600 }}
                      >
                        -{formatCurrency(getUserAmount(transaction))}
                      </p>
                      {!isYourExpense && (
                        <p className="text-xs text-gray-500">Paid by {payer?.name}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(transaction.id); }}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

       {showSplitModal && (
         <SplitExpenseModal
           onClose={() => setShowSplitModal(false)}
           users={users}
           currentUserId={currentUserId}
           onCreated={(tx) => setTransactions((prev) => [tx, ...prev])}
         />
       )}
       {selectedTransaction && (
         <TransactionDetailsModal
           transaction={selectedTransaction}
           users={users}
           onClose={() => setSelectedTransaction(null)}
           onUpdated={(tx) => {
             setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
             setSelectedTransaction(tx);
           }}
         />
       )}
    </div>
  );
}
