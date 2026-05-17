import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Upload } from "./pages/Upload";
import { FixedCosts } from "./pages/FixedCosts";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { index: true, Component: Login },
    ],
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "upload", Component: Upload },
      { path: "fixed-costs", Component: FixedCosts },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
