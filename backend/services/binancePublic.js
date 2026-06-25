const API_BASE = process.env.BINANCE_API_BASE || "https://api.binance.com";

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.msg || `Binance request failed: ${res.status}`);
  }

  return data;
}

export async function fetchKlines(symbol, interval = "1m", limit = 500) {
  const url = `${API_BASE}/api/v3/klines?symbol=${encodeURIComponent(
    symbol
  )}&interval=${encodeURIComponent(interval)}&limit=${Number(limit)}`;

  const data = await getJson(url);

  if (!Array.isArray(data)) {
    throw new Error("Invalid kline response");
  }

  return data.map((k) => ({
    openTime: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: Number(k[6]),
  }));
}

export async function fetchBookTicker(symbol) {
  const url = `${API_BASE}/api/v3/ticker/bookTicker?symbol=${encodeURIComponent(symbol)}`;
  const data = await getJson(url);

  return {
    symbol: data.symbol,
    bidPrice: Number(data.bidPrice),
    bidQty: Number(data.bidQty),
    askPrice: Number(data.askPrice),
    askQty: Number(data.askQty),
  };
}

export async function fetchTickerPrice(symbol) {
  const url = `${API_BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`;
  const data = await getJson(url);

  return {
    symbol: data.symbol,
    price: Number(data.price),
  };
}
