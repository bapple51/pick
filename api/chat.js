/* =====================================================
   GEMINI CHAT PROXY  (Vercel serverless function)

   The browser never sees the API key: it POSTs the
   conversation here and this function forwards it to
   Gemini.

   Environment variables (Vercel → Settings → Environment
   Variables):

     GEMINI_API_KEY    required
     GEMINI_MODEL      optional, default "gemini-3.6-flash"
     ALLOWED_ORIGINS   optional, comma-separated origins
                       allowed to call this endpoint, e.g.
                       "https://bapple51.github.io". Leave
                       unset to allow any origin.

   Request:  { messages: [{ role: "user"|"assistant",
                            content: "..." }, ...] }
   Response: { reply: "..." }  or  { error: "..." }
   ===================================================== */

const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 1024;

const SYSTEM_PROMPT =
  require("./weids-prompt.js") +
  "\n\n## Name\n\nIn this app you are presented to users as \"Gemini\". " +
  "Answer to that name. Everything else about the persona is unchanged.";

function parseAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = parseAllowedOrigins();
  const originAllowed = allowed.length === 0 || allowed.includes(origin);

  if (allowed.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (originAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  return originAllowed;
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    return JSON.parse(req.body);
  }
  return {};
}

/*
 * Convert the app's { role, content } messages into Gemini's
 * { role, parts } format, trimming history and long messages.
 */
function toGeminiContents(messages) {
  if (!Array.isArray(messages)) return null;

  const contents = messages
    .filter(
      m =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_MESSAGES)
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_MESSAGE_CHARS) }]
    }));

  if (contents.length === 0) return null;
  if (contents[contents.length - 1].role !== "user") return null;

  return contents;
}

module.exports = async (req, res) => {
  const originAllowed = applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  if (!originAllowed) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    return;
  }

  let contents;
  try {
    contents = toGeminiContents(readBody(req).messages);
  } catch (error) {
    res.status(400).json({ error: "Request body must be JSON." });
    return;
  }

  if (!contents) {
    res.status(400).json({
      error: "Send { messages: [{ role, content }] } ending with a user message."
    });
    return;
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";

  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS }
      })
    });
  } catch (error) {
    res.status(502).json({ error: "Could not reach Gemini." });
    return;
  }

  let data;
  try {
    data = await upstream.json();
  } catch (error) {
    data = {};
  }

  if (!upstream.ok) {
    const message =
      (data.error && data.error.message) || `Gemini returned ${upstream.status}.`;
    res.status(502).json({ error: message });
    return;
  }

  const candidate = data.candidates && data.candidates[0];
  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  const reply = parts.map(part => part.text || "").join("").trim();

  if (!reply) {
    const reason = (candidate && candidate.finishReason) || "no content";
    res.status(502).json({ error: `Gemini gave an empty reply (${reason}).` });
    return;
  }

  res.status(200).json({ reply });
};
