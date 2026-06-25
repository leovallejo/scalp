import { ema, rsi, atr, macd } from "./indicators.js";

function buildSimpleSignal(candles) {
  const closes = candles.map((c) => c.close);

  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const rsiVal = rsi(closes);
  const atrVal = atr(candles);
  const macdVal = macd(closes);

  if (!ema9 || !ema21 || !rsiVal || !atrVal || !macdVal) {
    return null;
  }

  let score = 0;

  if (ema9 > ema21) score += 1;
  else score -= 1;

  if (rsiVal < 40) score += 1;
  if (rsiVal > 60) score -= 1;

  if (macdVal.hist > 0) score += 1;
  else score -= 1;

  const direction = score > 0 ? "LONG" : "SHORT";
  const confidence = Math.min(Math.abs(score) / 3, 1);

  return {
    direction,
    confidence,
    atr: atrVal,
  };
}

export function runAutoBacktest(candles, config) {
  const {
    warmupBars = 50,
    holdBars = 20,
    minConfidence = 0.62,
  } = config;

  const trades = [];

  for (let i = warmupBars; i < candles.length - holdBars; i++) {
    const slice = candles.slice(0, i);
    const signal = buildSimpleSignal(slice);

    if (!signal || signal.confidence < minConfidence) continue;

    const entryCandle = candles[i];
    const exitCandle = candles[i + holdBars];

    const entry = entryCandle.close;
    const exit = exitCandle.close;

    let pnl = 0;

    if (signal.direction === "LONG") {
      pnl = exit - entry;
    } else {
      pnl = entry - exit;
    }

    const risk = signal.atr || 1;
    const pnlR = pnl / risk;

    trades.push({
      entryTime: entryCandle.openTime,
      direction: signal.direction,
      entry,
      exit,
      pnlR,
      outcome: pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BE",
    });
  }

  const wins = trades.filter((t) => t.outcome === "WIN").length;
  const losses = trades.filter((t) => t.outcome === "LOSS").length;

  const totalTrades = trades.length;
  const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
  const netR = trades.reduce((sum, t) => sum + t.pnlR, 0);

  let running = 0;
  let peak = 0;
  let maxDD = 0;

  trades.forEach((t) => {
    running += t.pnlR;
    peak = Math.max(peak, running);
    maxDD = Math.min(maxDD, running - peak);
  });

  return {
    summary: {
      totalTrades,
      wins,
      losses,
      winRate,
      netR,
      maxDrawdownR: maxDD,
    },
    trades,
  };
}
