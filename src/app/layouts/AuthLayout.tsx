import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
