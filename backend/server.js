import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import aiRoute from "./routes/ai.js";
import backtestRoute from "./routes/backtest.js";
import tradeRoute from "./routes/trade.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "Precision Scalp Backend is running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "precision-scalp-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/ai-analysis", aiRoute);
app.use("/api/backtest", backtestRoute);
app.use("/api/trade", tradeRoute);

app.use((err, _req, res, _next) => {
  console.error("[SERVER ERROR]", err);
  res.status(500).json({
    error: "Internal server error",
    details: err?.message || "Unknown error",
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
