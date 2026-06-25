import express from "express";
import { callOpenRouter } from "../services/openrouter.js";

const router = express.Router();

function safeFixed(value, decimals = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : "N/A";
}

function buildTradingPrompt(body) {
  const topSignals = Array.isArray(body?.model?.topSignals)
    ? body.model.topSignals
        .slice(0, 8)
        .map((s, i) => {
          return `${i + 1}. ${s.dir || "N/A"} | ${s.cat || "Signal"} | ${s.label || "No label"} | weight=${s.weight ?? "N/A"} | conf=${s.confidence ?? "N/A"}`;
        })
        .join("\n")
    : "No signals provided.";

  return `
You are an educational crypto trading analysis assistant.

IMPORTANT:
- This is educational analysis only.
- Do not promise profit.
- Do not recommend leverage.
- If the setup is mixed, recommend WAIT.
- Be concise and risk-aware.

Analyze this paper-signal snapshot:

Symbol: ${body.symbol}
Price: ${body.price}

Technical Data:
RSI: ${body.rsi}
StochRSI: K=${body.stochRsi?.k ?? "N/A"} D=${body.stochRsi?.d ?? "N/A"}
MACD histogram: ${body.macd?.hist ?? "N/A"}
EMA9/EMA21/EMA50: ${body.ema9} / ${body.ema21} / ${body.ema50}
ATR: ${body.atr}
BB pctB: ${body.bbPctB ?? "N/A"}
BB width: ${body.bbWidth ?? "N/A"}

Market Context:
Funding rate: ${body.fundingRate}
Fear & Greed: ${body.fearGreed}
Regime: ${body.regime}
MTF bias: ${body.mtf?.bias ?? "N/A"} (${body.mtf?.strength ?? "N/A"}%)
Order book bias: ${body.orderBook?.bias ?? "N/A"} (${body.orderBook?.imbalance ?? "N/A"}%)

Liquidity:
Liquidity sweep: ${body.liquiditySweep?.type ?? "none"}
Fake breakout / trap: ${body.fakeBreakout?.type ?? "none"}

Model Output:
Direction: ${body.model?.direction}
P(LONG): ${safeFixed((body.model?.probLong ?? 0) * 100, 1)}%
P(SHORT): ${safeFixed((body.model?.probShort ?? 0) * 100, 1)}%
Confidence: ${safeFixed((body.model?.confidence ?? 0) * 100, 1)}%

Top weighted signals:
${topSignals}

Return exactly this format:

Direction Bias: LONG / SHORT / WAIT
Strongest Confirmation: one sentence
Biggest Risk: one sentence
Final Call: LONG / SHORT / WAIT
Reason: max 2 sentences
`;
}

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const prompt = buildTradingPrompt(body);

    const result = await callOpenRouter({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a concise, risk-aware trading analysis assistant. You only provide educational market analysis, never guarantees.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 280,
      retries: 1,
    });

    res.json({
      text: result.text,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    res.status(500).json({
      text: `OpenRouter AI error: ${err.message}`,
    });
  }
});

export default router;
