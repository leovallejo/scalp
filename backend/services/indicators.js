export function ema(values, period) {
  if (!values || values.length < period) return null;

  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }

  return result;
}

export function rsi(values, period = 14) {
  if (!values || values.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function atr(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;

  const trs = [];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];

    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    );

    trs.push(tr);
  }

  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

export function macd(values) {
  if (!values || values.length < 35) return null;

  const ema12 = ema(values.slice(-35), 12);
  const ema26 = ema(values.slice(-35), 26);

  if (!ema12 || !ema26) return null;

  const hist = ema12 - ema26;
  return { hist };
}
