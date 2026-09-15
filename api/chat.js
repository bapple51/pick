/* =====================================================
   GEMINI PROXY  (Vercel serverless function)

   The browser never sees the API key: it POSTs here and
   this function forwards to Gemini.

   Environment variables (Vercel → Settings → Environment
   Variables):

     GEMINI_API_KEY    required
     GEMINI_MODEL      optional; tried first, before the
                       cheapest-first list below
     ALLOWED_ORIGINS   optional, comma-separated origins
                       allowed to call this endpoint, e.g.
                       "https://bapple51.github.io". Leave
                       unset to allow any origin.

   Two request shapes:

   Chat:     { messages: [{ role: "user"|"assistant",
                            content: "..." }, ...] }
             → { reply: "..." }

   Seating:  { mode: "seating",
               students: ["..."],
               boards: [{ id, name, size }],
               rules: [{ type: "apart"|"together",
                         students: ["..."] }] }
             → { assignments: [{ board, students }],
                 comment: "..." }

   Errors:   { error: "..." }
   ===================================================== */

/*
 * Cheapest first. If Google rejects a model for this key
 * (retired / not available to new users) the next one is
 * tried and the winner is remembered for the warm instance.
 */
const MODEL_CANDIDATES = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash"
];

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_CHAT_OUTPUT_TOKENS = 1024;
const MAX_SEATING_OUTPUT_TOKENS = 4096;
const MAX_SEATING_STUDENTS = 60;

const PERSONA = require("./weids-prompt.js");

const CHAT_SYSTEM_PROMPT =
  PERSONA +
  "\n\n## Name\n\nIn this app you are presented to users as \"Gemini\". " +
  "Answer to that name. Everything else about the persona is unchanged.";

const SEATING_SYSTEM_PROMPT =
  "You are the seating planner inside a classroom app. You will receive a " +
  "list of students, a list of whiteboards each with an exact group size, " +
  "and optional rules. Produce an assignment and respond with ONLY a JSON " +
  "object of the form:\n" +
  '{"assignments":[{"board":"<board id>","students":["<name>", ...]}, ...],' +
  '"comment":"<one sentence>"}\n\n' +
  "Hard requirements:\n" +
  "- Use every student exactly once, spelled exactly as given.\n" +
  "- Every board listed must appear exactly once with exactly `size` students.\n" +
  "- \"apart\" rules: those students must not share a board.\n" +
  "- \"together\" rules: those students must all share one board.\n" +
  "- Mix students up; do not keep them in the given order.\n\n" +
  "The \"comment\" is a single sentence delivered in character as the persona " +
  "described below, judging your own seating chart. Do not mention any " +
  "student names in the comment.\n\n" +
  "## Persona for the comment\n\n" +
  PERSONA;

let workingModel = null;


/* =====================================================
   HELPERS
   ===================================================== */

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

function cleanNames(list, max) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(name => typeof name === "string")
    .map(name => name.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, max);
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

/*
 * Google's "model not available" answers come back as 400/404
 * with a message naming the model; those are worth retrying on
 * the next candidate. Anything else (bad key, quota) is not.
 */
function isModelUnavailable(status, message) {
  if (status !== 400 && status !== 404) return false;
  return /model|not found|no longer available|not supported/i.test(message || "");
}


/* =====================================================
   GEMINI CALL WITH MODEL FALLBACK

   Resolves to { ok: true, text, model } or
   { ok: false, status, error }.
   ===================================================== */

async function callGemini(apiKey, systemPrompt, contents, generationConfig) {
  const preferred = (process.env.GEMINI_MODEL || "").trim();
  const candidates = [];

  if (workingModel) candidates.push(workingModel);
  if (preferred) candidates.push(preferred);
  candidates.push(...MODEL_CANDIDATES);

  const tried = new Set();
  let lastError = { status: 502, error: "No model available." };

  for (const model of candidates) {
    if (tried.has(model)) continue;
    tried.add(model);

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
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig
        })
      });
    } catch (error) {
      return { ok: false, status: 502, error: "Could not reach Gemini." };
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

      if (isModelUnavailable(upstream.status, message)) {
        if (workingModel === model) workingModel = null;
        lastError = { status: 502, error: message };
        continue;
      }

      return { ok: false, status: 502, error: message };
    }

    const candidate = data.candidates && data.candidates[0];
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const text = parts
      .filter(part => !part.thought)
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!text) {
      const reason = (candidate && candidate.finishReason) || "no content";
      return { ok: false, status: 502, error: `Gemini gave an empty reply (${reason}).` };
    }

    workingModel = model;
    return { ok: true, text, model };
  }

  return { ok: false, ...lastError };
}


/* =====================================================
   HANDLERS
   ===================================================== */

async function handleChat(apiKey, body, res) {
  const contents = toGeminiContents(body.messages);

  if (!contents) {
    res.status(400).json({
      error: "Send { messages: [{ role, content }] } ending with a user message."
    });
    return;
  }

  const result = await callGemini(apiKey, CHAT_SYSTEM_PROMPT, contents, {
    maxOutputTokens: MAX_CHAT_OUTPUT_TOKENS
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(200).json({ reply: result.text });
}

function extractJson(text) {
  const trimmed = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (inner) {
      return null;
    }
  }
}

async function handleSeating(apiKey, body, res) {
  const students = cleanNames(body.students, MAX_SEATING_STUDENTS);

  const boards = (Array.isArray(body.boards) ? body.boards : [])
    .filter(b => b && typeof b.id === "string" && Number.isInteger(b.size))
    .map(b => ({
      id: b.id.slice(0, 40),
      name: typeof b.name === "string" ? b.name.slice(0, 40) : b.id,
      size: Math.max(1, Math.min(20, b.size))
    }))
    .slice(0, 30);

  const rules = (Array.isArray(body.rules) ? body.rules : [])
    .filter(r => r && (r.type === "apart" || r.type === "together"))
    .map(r => ({ type: r.type, students: cleanNames(r.students, 10) }))
    .filter(r => r.students.length >= 2)
    .slice(0, 30);

  const avoidPairs = (Array.isArray(body.avoidPairs) ? body.avoidPairs : [])
    .filter(p => Array.isArray(p) && p.length === 2)
    .map(p => cleanNames(p, 2))
    .filter(p => p.length === 2)
    .slice(0, 80);

  const totalSize = boards.reduce((n, b) => n + b.size, 0);

  if (students.length < 2 || boards.length === 0 || totalSize !== students.length) {
    res.status(400).json({
      error: "Seating needs students, boards, and board sizes that add up to the student count."
    });
    return;
  }

  const request =
    `Students (${students.length}):\n` +
    students.map(s => `- ${s}`).join("\n") +
    `\n\nBoards (${boards.length}):\n` +
    boards.map(b => `- id "${b.id}" (${b.name}): exactly ${b.size} students`).join("\n") +
    `\n\nRules (${rules.length}):\n` +
    (rules.length
      ? rules.map(r => `- ${r.type.toUpperCase()}: ${r.students.join(", ")}`).join("\n")
      : "- none") +
    (avoidPairs.length
      ? "\n\nSoft preference (not a hard rule): these pairs worked together " +
        "recently, so keep them apart where you can:\n" +
        avoidPairs.map(p => `- ${p[0]} & ${p[1]}`).join("\n")
      : "") +
    "\n\nReturn the JSON object now.";

  const result = await callGemini(
    apiKey,
    SEATING_SYSTEM_PROMPT,
    [{ role: "user", parts: [{ text: request }] }],
    {
      maxOutputTokens: MAX_SEATING_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      temperature: 1.0
    }
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  const parsed = extractJson(result.text);

  if (!parsed || !Array.isArray(parsed.assignments)) {
    res.status(502).json({ error: "Gemini did not return a usable seating plan." });
    return;
  }

  res.status(200).json({
    assignments: parsed.assignments,
    comment: typeof parsed.comment === "string" ? parsed.comment : "",
    model: result.model
  });
}


/* =====================================================
   ENTRY POINT
   ===================================================== */

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

  let body;
  try {
    body = readBody(req);
  } catch (error) {
    res.status(400).json({ error: "Request body must be JSON." });
    return;
  }

  if (body.mode === "seating") {
    await handleSeating(apiKey, body, res);
  } else {
    await handleChat(apiKey, body, res);
  }
};
