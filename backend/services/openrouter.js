const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callOpenRouter({
  model,
  messages,
  temperature = 0.2,
  top_p = 0.9,
  max_tokens = 280,
  retries = 1,
}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const payload = {
    model: model || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.6",
    messages,
    temperature,
    top_p,
    max_tokens,
    stream: false,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-OpenRouter-Title":
            process.env.OPENROUTER_APP_NAME || "Precision Scalp Engine",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errMsg =
          data?.error?.message ||
          data?.message ||
          `OpenRouter request failed with status ${response.status}`;
        throw new Error(errMsg);
      }

      return {
        text:
          data?.choices?.[0]?.message?.content ||
          data?.choices?.[0]?.text ||
          "OpenRouter analysis unavailable.",
        model: data?.model || payload.model,
        usage: data?.usage || null,
        raw: data,
      };
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(700);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Unexpected OpenRouter failure");
}
