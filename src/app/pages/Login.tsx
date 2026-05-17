import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Wallet } from "lucide-react";
import { apiGetUsers, apiSelectUser } from "../api/client";
import { useAuth } from "../api/AuthContext";
import type { User } from "../types";

export function Login() {
  const navigate = useNavigate();
  const { setUserFromAuth } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGetUsers()
      .then(setUsers)
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (userId: string) => {
    setSubmitting(userId);
    setError(null);
    void apiSelectUser(userId)
      .then((user) => {
        setUserFromAuth(user as any);
        navigate("/", { replace: true });
      })
      .catch((err: any) => setError(err?.message || "Login failed"))
      .finally(() => setSubmitting(null));
  };

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
            <Wallet className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl text-gray-900" style={{ fontWeight: 600 }}>Who are you?</h1>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user.id)}
                disabled={submitting !== null}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-gray-100 hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                  style={{ backgroundColor: user.color, fontWeight: 600 }}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-gray-900 text-lg" style={{ fontWeight: 500 }}>
                  {user.name}
                </span>
                {submitting === user.id && (
                  <span className="ml-auto text-xs text-gray-400">...</span>
                )}
              </button>
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
      </div>
    </div>
  );
}
