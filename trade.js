import express from "express";
import { fetchBookTicker, fetchTickerPrice } from "../services/binancePublic.js";
import { calculatePaperPositionSize } from "../services/riskManager.js";
import {
  getPaperState,
  addPaperTrade,
  getPaperTrades,
  setPaperBalance,
} from "../services/paperTradeStore.js";

const router = express.Router();

router.get("/journal", (_req, res) => {
  const state = getPaperState();
  res.json({
    paperBalance: state.paperBalance,
    trades: getPaperTrades(),
  });
});

router.post("/balance", (req, res) => {
  const { paperBalance } = req.body || {};
  const nextBalance = setPaperBalance(paperBalance);

  res.json({
    ok: true,
    paperBalance: nextBalance,
  });
});

router.post("/", async (req, res) => {
  try {
    const {
      symbol = "BTCUSDT",
      direction = "LONG",
      confidence = 0.5,
      stopLoss = null,
      takeProfit = null,
      note = "",
    } = req.body || {};

    if (!["LONG", "SHORT"].includes(direction)) {
      return res.status(400).json({ error: "direction must be LONG or SHORT" });
    }

    const conf = Number(confidence);
    if (!Number.isFinite(conf) || conf < 0.62) {
      return res.status(400).json({
        error: "confidence below paper-trade threshold (0.62)",
      });
    }

    const [ticker, book] = await Promise.all([
      fetchTickerPrice(symbol),
      fetchBookTicker(symbol),
    ]);

    const entry =
      direction === "LONG"
        ? Number(book.askPrice || ticker.price)
        : Number(book.bidPrice || ticker.price);

    if (!Number.isFinite(entry)) {
      throw new Error("Unable to determine entry price");
    }

    let sl = Number(stopLoss);
    let tp = Number(takeProfit);

    if (!Number.isFinite(sl) || !Number.isFinite(tp)) {
      const defaultRisk = entry * 0.003; // 0.30%
      sl = direction === "LONG" ? entry - defaultRisk : entry + defaultRisk;
      tp = direction === "LONG" ? entry + defaultRisk * 2 : entry - defaultRisk * 2;
    }

    const state = getPaperState();
    const qty = calculatePaperPositionSize({
      paperBalance: state.paperBalance,
      riskPct: Number(process.env.DEFAULT_RISK_PCT || 0.01),
      entry,
      stopLoss: sl,
    });

    const trade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "PAPER",
      symbol,
      direction,
      confidence: conf,
      entryPrice: entry,
      quantity: Number(qty.toFixed(6)),
      stopLoss: Number(sl.toFixed(8)),
      takeProfit: Number(tp.toFixed(8)),
      status: "OPEN_SIMULATED",
      note: String(note || ""),
      timestamp: new Date().toISOString(),
      executionInfo: {
        bidPrice: book.bidPrice,
        askPrice: book.askPrice,
        spread: Number((book.askPrice - book.bidPrice).toFixed(8)),
      },
    };

    addPaperTrade(trade);

    res.json({
      ok: true,
      message: "Paper trade created. No real-money order was sent.",
      trade,
      paperBalance: state.paperBalance,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;
