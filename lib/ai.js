import { DEFAULT_MODELS } from "./storage.js";

export async function complete(ai, system, user) {
  const model = ai.model?.trim() || DEFAULT_MODELS[ai.provider];
  switch (ai.provider) {
    case "anthropic":
      return anthropic(ai, model, system, user);
    case "gemini":
      return gemini(ai, model, system, user);
    default:
      return openai(ai, model, system, user);
  }
}

async function openai(ai, model, system, user) {
  const base = (ai.baseUrl?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (!ai.baseUrl?.trim()) body.response_format = { type: "json_object" };

  const headers = { "Content-Type": "application/json" };
  if (ai.apiKey) headers.Authorization = `Bearer ${ai.apiKey}`;

  const data = await postJson(`${base}/chat/completions`, headers, body);
  return data.choices?.[0]?.message?.content ?? "";
}

async function anthropic(ai, model, system, user) {
  const data = await postJson(
    "https://api.anthropic.com/v1/messages",
    {
      "Content-Type": "application/json",
      "x-api-key": ai.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    { model, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }
  );
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

async function gemini(ai, model, system, user) {
  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "Content-Type": "application/json", "x-goog-api-key": ai.apiKey },
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json" },
    }
  );
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text.slice(0, 300) || res.statusText;
    throw new Error(`AI request failed (${res.status}): ${msg}`);
  }
  return data;
}
