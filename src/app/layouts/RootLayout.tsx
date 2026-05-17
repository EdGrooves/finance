import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Upload,
  Receipt,
  Wallet,
  ChevronUp,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../api/AuthContext";
import { apiGetUsers, apiSelectUser } from "../api/client";
import type { User } from "../types";

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    void apiGetUsers().then(setAllUsers).catch(() => {});
  }, []);

  const switchUser = (userId: string) => {
    void apiSelectUser(userId).then(() => {
      window.location.href = "/";
    });
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Upload", href: "/upload", icon: Upload },
    { name: "Fixed Costs", href: "/fixed-costs", icon: Receipt },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const otherUsers = allUsers.filter(u => u.id !== user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-20">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg text-gray-900" style={{ fontWeight: 600 }}>Money Tracker</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${active
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span style={{ fontWeight: active ? 500 : 400 }}>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200">
            {/* Other users (shown when switcher open) */}
            {showSwitcher && otherUsers.length > 0 && (
              <div className="mb-2 space-y-1">
                {otherUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => switchUser(u.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: u.color }}
                    >
                      <span className="text-white text-xs" style={{ fontWeight: 500 }}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{u.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Current user */}
            <button
              onClick={() => setShowSwitcher(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: user.color }}
              >
                <span className="text-white text-sm" style={{ fontWeight: 500 }}>
                  {user.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{user.name}</p>
              </div>
              <ChevronUp
                className={`w-4 h-4 text-gray-400 transition-transform ${showSwitcher ? "" : "rotate-180"}`}
              />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay to close switcher */}
      {showSwitcher && (
        <div className="fixed inset-0 z-10" onClick={() => setShowSwitcher(false)} />
      )}

      {/* Main Content */}
      <main className="pl-64">
        <Outlet />
      </main>
    </div>
  );
}
