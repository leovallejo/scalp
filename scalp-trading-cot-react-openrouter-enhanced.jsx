import { useState, useEffect, useRef, useMemo } from "react";
const API_DEFAULT = "http://localhost:3001";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
const COLORS = {
bg: "#05080a",
surface: "#090f14",
border: "#152230",
green: "#00ff88",
red: "#ff3b5c",
amber: "#ffb700",
text: "#cce8ff",
muted: "#5a8aaa",
};
export default function ScalpEngine() {
const [apiBase, setApiBase] = useState(API_DEFAULT);
const [symbol, setSymbol] = useState("BTCUSDT");
const [price, setPrice] = useState(null);
const [change, setChange] = useState(null);
const [result, setResult] = useState(null);
const [aiText, setAiText] = useState("");
const [backtest, setBacktest] = useState(null);
const [journal, setJournal] = useState([]);
const [tab, setTab] = useState("trace");
const [loading, setLoading] = useState(false);
const wsRef = useRef(null);
// =========================
// ✅ Live Binance WebSocket
// =========================
useEffect(() => {
if (wsRef.current) wsRef.current.close();
const ws = new WebSocket(
`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@miniTicker`
);
wsRef.current = ws;
ws.onmessage = (event) => {
const data = JSON.parse(event.data);
setPrice(Number(data.c));
setChange(Number(data.P));
};
return () => ws.close();
}, [symbol]);
// =========================
// ✅ Run Analysis
// =========================
async function runAnalysis() {
setLoading(true);
// Fake simplified indicators (frontend-safe)
const payload = {
symbol,
price,
rsi: 44,
stochRsi: { k: 33, d: 41 },
macd: { hist: 0.001 },
ema9: price + 10,
ema21: price - 5,
ema50: price - 30,
atr: 120,
bbPctB: 40,
bbWidth: 1.1,
fundingRate: 0.0005,
fearGreed: 55,
regime: "trending",
mtf: { bias: "LONG", strength: 65 },
orderBook: { bias: "LONG", imbalance: 12 },
model: {
direction: "LONG",
probLong: 0.66,
probShort: 0.34,
confidence: 0.66,
topSignals: [],
},
};
try {
const res = await fetch(`${apiBase}/api/ai-analysis`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
});
const data = await res.json();
setResult(payload.model);
setAiText(data.text);
} catch (err) {
setAiText("Error connecting to backend");
}
setLoading(false);
setTab("ai");
}
// =========================
// ✅ Backtest
// =========================
async function runBacktest() {
const res = await fetch(`${apiBase}/api/backtest`, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ symbol }),
});
const data = await res.json();
setBacktest(data.result);
setTab("backtest");
}
// =========================
// ✅ Paper Trade
// =========================
async function createTrade() {
if (!result) return;
const res = await fetch(`${apiBase}/api/trade`, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
symbol,
direction: result.direction,
confidence: result.confidence,
}),
});
const data = await res.json();
await loadJournal();
alert(data.message);
}
async function loadJournal() {
const res = await fetch(`${apiBase}/api/trade/journal`);
const data = await res.json();
setJournal(data.trades || []);
}
useEffect(() => {
loadJournal();
}, []);
// =========================
// ✅ UI
// =========================
return (
<div
style={{
background: COLORS.bg,
color: COLORS.text,
minHeight: "100vh",
padding: 20,
fontFamily: "monospace",
}}
>
{/* HEADER */}
<div style={{ display: "flex", justifyContent: "space-between" }}>
<div>
<h2 style={{ color: COLORS.green }}>Precision Scalp Engine</h2>
<small style={{ color: COLORS.muted }}>
OpenRouter · Backtest · Paper Trading
</small>
</div>
{price && (
<div>
<div style={{ fontSize: 24 }}>
${price.toLocaleString()}
</div>
<div style={{ color: change > 0 ? COLORS.green : COLORS.red }}>
{change?.toFixed(2)}%
</div>
</div>
)}
</div>
{/* API INPUT */}
<input
value={apiBase}
onChange={(e) => setApiBase(e.target.value)}
style={{ width: "100%", marginTop: 10, padding: 6 }}
/>
{/* SYMBOLS */}
<div style={{ marginTop: 10 }}>
{SYMBOLS.map((s) => (
<button
key={s}
onClick={() => setSymbol(s)}
style={{ marginRight: 5 }}
>
{s}
</button>
))}
</div>
{/* ACTIONS */}
<div style={{ marginTop: 10 }}>
<button onClick={runAnalysis}>
{loading ? "Running..." : "Run Analysis"}
</button>
<button onClick={runBacktest}>Backtest</button>
<button onClick={createTrade}>Paper Trade</button>
</div>
{/* RESULT */}
{result && (
<div style={{ marginTop: 20 }}>
<h3>{result.direction}</h3>
<p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
</div>
)}
{/* TABS */}
<div style={{ marginTop: 20 }}>
{["trace", "ai", "backtest", "journal"].map((t) => (
<button key={t} onClick={() => setTab(t)}>
{t}
</button>
))}
</div>
{/* AI TAB */}
{tab === "ai" && (
<pre style={{ marginTop: 10 }}>{aiText}</pre>
)}
{/* BACKTEST TAB */}
{tab === "backtest" && backtest && (
<div style={{ marginTop: 10 }}>
<p>Total Trades: {backtest.summary.totalTrades}</p>
<p>Winrate: {backtest.summary.winRate.toFixed(2)}%</p>
<p>Net R: {backtest.summary.netR.toFixed(2)}</p>
</div>
)}
{/* JOURNAL TAB */}
{tab === "journal" && (
<div style={{ marginTop: 10 }}>
{journal.map((j) => (
<div key={j.id}>
{j.symbol} {j.direction} @ {j.entryPrice}
</div>
))}
</div>
)}
</div>
);
}
