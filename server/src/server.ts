import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import transactionsRouter from "./routes/transactions.js";
import fixedCostsRouter from "./routes/fixedCosts.js";
import settingsRouter from "./routes/settings.js";
import balancesRouter from "./routes/balances.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4000);
const IS_PROD = process.env.NODE_ENV === "production";

app.use(helmet({ contentSecurityPolicy: false })); // CSP off — frontend uses inline styles

if (!IS_PROD) {
  const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
  app.use(cors({ origin: CORS_ORIGIN }));
}

app.use(express.json());

app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/api/auth/register", rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));

app.use("/api", authRouter);
app.use("/api", usersRouter);
app.use("/api", transactionsRouter);
app.use("/api", fixedCostsRouter);
app.use("/api", settingsRouter);
app.use("/api", balancesRouter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

if (IS_PROD) {
  const publicDir = path.join(__dirname, "../public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
