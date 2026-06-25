import express from "express";
import { fetchKlines } from "../services/binancePublic.js";
import { runAutoBacktest } from "../services/backtestEngine.js";

const router = express.Router();

function parseLimit(value, fallback = 800) {
  const n = Number(value);
  const maxBars = Number(process.env.MAX_BACKTEST_BARS || 1000);

  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, maxBars);
}

router.post("/", async (req, res) => {
  try {
    const {
      symbol = "BTCUSDT",
      interval = "1m",
      limit = 800,
      holdBars = 20,
      minConfidence = 0.62,
    } = req.body || {};

    const bars = parseLimit(limit, 800);
    const candles = await fetchKlines(symbol, interval, bars);

    const result = runAutoBacktest(candles, {
      warmupBars: 60,
      holdBars: Number(holdBars),
      minConfidence: Number(minConfidence),
    });

    res.json({
      symbol,
      interval,
      bars,
      result,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;
