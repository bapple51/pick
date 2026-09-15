/* =====================================================
   GEMINI ✨ (Weids persona under the hood)

   Talks to the Gemini proxy (api/chat.js) deployed at
   the baked-in endpoint below. The persona lives in the
   proxy's system prompt.
   ===================================================== */

const chatConfig = {
  endpoint: "https://pick-rose.vercel.app/api/chat",
  maxStoredMessages: 40,
  nagFirstDelayMs: 4000,
  nagRepeatMs: 20000
};

const chatHistoryKey = "aiChatHistory";

let chatMessages = loadChatHistory();
let chatBusy = false;
let chatLastFocused = null;


/* =====================================================
   STORAGE
   ===================================================== */

function loadChatHistory() {
  const saved = readStoredObject(chatHistoryKey);
  return Array.isArray(saved) ? saved : [];
}

function saveChatHistory() {
  chatMessages = chatMessages.slice(-chatConfig.maxStoredMessages);
  writeStoredObject(chatHistoryKey, chatMessages);
}


/* =====================================================
   PROXY CALL

   Shared by the chat and the AI Seating verdict.
   Resolves to the reply text or throws with a readable
   message.
   ===================================================== */

async function askGemini(messages) {
  const response = await fetch(chatConfig.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    /* non-JSON error page; handled below */
  }

  if (!response.ok || !data.reply) {
    throw new Error(data.error || `Gemini returned ${response.status}.`);
  }

  return data.reply;
}


/* =====================================================
   MODAL
   ===================================================== */

function isChatOpen() {
  return document.getElementById("chatModal").classList.contains("open");
}

function openChatModal() {
  chatLastFocused = document.activeElement;

  hideNagToast();

  document.getElementById("chatModal").classList.add("open");
  document.body.style.overflow = "hidden";

  renderChatMessages();
  document.getElementById("chatInput").focus();
}

function closeChatModal() {
  if (!isChatOpen()) return;

  document.getElementById("chatModal").classList.remove("open");
  document.body.style.overflow = "";

  if (chatLastFocused && typeof chatLastFocused.focus === "function") {
    chatLastFocused.focus();
  }

  scheduleNagToast(chatConfig.nagRepeatMs);
}

function handleChatBackgroundClick(event) {
  if (event.target.id === "chatModal") closeChatModal();
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeChatModal();
});


/* =====================================================
   RENDERING

   Gemini answers in Markdown; support the handful of
   constructs that matter (bold, inline code, fenced code,
   simple bullets) on top of escaped text.
   ===================================================== */

function formatChatText(text) {
  const blocks = [];

  let html = escapeHtml(text).replace(
    /```[^\n]*\n([\s\S]*?)```/g,
    (_, code) => {
      blocks.push(`<pre>${code.replace(/\n$/, "")}</pre>`);
      return `@@BLOCK${blocks.length - 1}@@`;
    }
  );

  html = html
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^[ \t]*[-*] (.*)$/gm, "&bull; $1")
    .replace(/\n/g, "<br>");

  return html.replace(/@@BLOCK(\d+)@@/g, (_, i) => blocks[i]);
}

function renderChatMessages() {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  container.innerHTML = "";

  if (chatMessages.length === 0 && !chatBusy) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.textContent =
      "Ask Gemini ✨ anything. It has already formed an opinion about you.";
    container.appendChild(empty);
    return;
  }

  chatMessages.forEach(message => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${message.role}`;
    bubble.innerHTML = formatChatText(message.content);
    container.appendChild(bubble);
  });

  if (chatBusy) {
    const thinking = document.createElement("div");
    thinking.className = "chat-bubble assistant thinking";
    thinking.textContent = "Gemini ✨ is checking the mirror…";
    container.appendChild(thinking);
  }

  container.scrollTop = container.scrollHeight;
}

function showChatError(message) {
  const container = document.getElementById("chatMessages");
  const error = document.createElement("div");
  error.className = "chat-bubble error";
  error.textContent = message;
  container.appendChild(error);
  container.scrollTop = container.scrollHeight;
}


/* =====================================================
   SENDING
   ===================================================== */

function handleChatInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

async function sendChatMessage(event) {
  if (event) event.preventDefault();
  if (chatBusy) return;

  const input = document.getElementById("chatInput");
  const button = document.getElementById("chatSendButton");
  const text = input.value.trim();
  if (!text) return;

  chatMessages.push({ role: "user", content: text });
  saveChatHistory();

  input.value = "";
  chatBusy = true;
  button.disabled = true;
  renderChatMessages();

  try {
    const reply = await askGemini(chatMessages);
    chatMessages.push({ role: "assistant", content: reply });
    saveChatHistory();
    chatBusy = false;
    renderChatMessages();
  } catch (error) {
    chatBusy = false;
    renderChatMessages();
    showChatError(`Gemini ✨ is unavailable: ${error.message}`);
  } finally {
    button.disabled = false;
    input.focus();
  }
}

function clearChat() {
  if (chatBusy) return;
  chatMessages = [];
  saveChatHistory();
  renderChatMessages();
}


/* =====================================================
   NAG TOAST

   Reminds you that AI exists. Repeatedly. Dismissing it
   only postpones it.
   ===================================================== */

const nagLines = [
  "Have you tried ✨ Gemini AI Seating? It's like regular seating, but AI.",
  "Gemini ✨ has thoughts about your seating chart.",
  "Still making groups manually? In this economy? ✨",
  "✨ Gemini AI Seating™ is one click away. Gemini is waiting.",
  "Your classroom could be 40% more AI right now. ✨",
  "Gemini ✨ rated your last grouping. Go ask it."
];

let nagTimer = null;
let nagIndex = Math.floor(Math.random() * nagLines.length);

function scheduleNagToast(delayMs) {
  clearTimeout(nagTimer);
  nagTimer = setTimeout(showNagToast, delayMs);
}

function showNagToast() {
  if (!isAiEnabled()) return;
  if (isChatOpen() || isPickerOpen() || isSplashOpen()) {
    scheduleNagToast(chatConfig.nagRepeatMs);
    return;
  }

  const toast = document.getElementById("nagToast");
  const text = document.getElementById("nagToastText");
  if (!toast || !text) return;

  text.textContent = nagLines[nagIndex % nagLines.length];
  nagIndex++;

  toast.classList.add("open");
}

function hideNagToast() {
  const toast = document.getElementById("nagToast");
  if (toast) toast.classList.remove("open");
}

function dismissNagToast() {
  hideNagToast();
  scheduleNagToast(chatConfig.nagRepeatMs);
}


/* =====================================================
   AI SEATING ✨

   Sends today's students, the boards with their exact
   group sizes, and the active rules to Gemini, which
   returns the assignment plus a one-line verdict. The
   plan is validated here (every student once, sizes
   exact, rules honoured); if Gemini fumbles it, the
   legacy algorithm quietly does the job and the verdict
   admits it.
   ===================================================== */

const aiSeatingLines = [
  "Initializing Chad vectors…",
  "Calibrating jawline tensors…",
  "Consulting the mirror…",
  "Running looksmax gradient descent…",
  "Quantizing whiteboard aura…",
  "Assigning Chad potential…",
  "Reticulating splines (AI)…",
  "Finalizing optimal seating…"
];

const AI_SEATING_MIN_MS = 1500;

let aiSeatingRunning = false;

async function requestAiSeating(plan, rules) {
  const response = await fetch(chatConfig.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "seating",
      students: plan.students,
      boards: plan.boards.map((board, i) => ({
        id: board.id,
        name: board.name,
        size: plan.sizes[i]
      })),
      rules
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    /* handled below */
  }

  if (!response.ok || !Array.isArray(data.assignments)) {
    throw new Error(data.error || `Gemini returned ${response.status}.`);
  }

  return data;
}

/*
 * Turn Gemini's assignments into { boardId: [names] } using the
 * canonical spellings, or return null if anything is off.
 */
function validateAiAssignments(assignments, plan, rules) {
  const lower = s => String(s).trim().toLowerCase();

  const canonical = new Map(plan.students.map(s => [lower(s), s]));
  const boardByKey = new Map();
  const sizeById = new Map();

  plan.boards.forEach((board, i) => {
    boardByKey.set(lower(board.id), board.id);
    boardByKey.set(lower(board.name), board.id);
    sizeById.set(board.id, plan.sizes[i]);
  });

  const result = {};
  const placed = new Map();

  for (const entry of assignments) {
    if (!entry || !Array.isArray(entry.students)) return null;

    const boardId = boardByKey.get(lower(entry.board));
    if (!boardId || result[boardId]) return null;

    const names = [];
    for (const raw of entry.students) {
      const name = canonical.get(lower(raw));
      if (!name || placed.has(name)) return null;
      placed.set(name, boardId);
      names.push(name);
    }

    if (names.length !== sizeById.get(boardId)) return null;
    result[boardId] = names;
  }

  if (placed.size !== plan.students.length) return null;
  if (Object.keys(result).length !== plan.boards.length) return null;

  for (const rule of rules) {
    const boards = rule.students.map(s => placed.get(canonical.get(lower(s))));
    if (boards.some(b => !b)) return null;
    const distinct = new Set(boards).size;
    if (rule.type === "together" && distinct !== 1) return null;
    if (rule.type === "apart" && distinct !== boards.length) return null;
  }

  layoutConfig.forEach(board => {
    if (!result[board.id]) result[board.id] = [];
  });

  return result;
}

function setAiVerdict(text) {
  const verdict = document.getElementById("aiVerdict");
  if (verdict) verdict.textContent = text;
}

async function aiSplitGroups() {
  if (aiSeatingRunning) return;

  const plan = planGroups();
  if (!plan) return;

  const rules = validateWhiteboardRules(plan.students);

  aiSeatingRunning = true;
  hideNagToast();

  const overlay = document.getElementById("aiSeatingOverlay");
  const status = document.getElementById("aiSeatingStatus");
  const bar = document.getElementById("aiSeatingBar");

  overlay.classList.add("open");
  bar.style.width = "5%";

  let step = 0;
  const ticker = setInterval(() => {
    status.textContent = aiSeatingLines[step % aiSeatingLines.length];
    bar.style.width = `${Math.min(90, 10 + step * 10)}%`;
    step++;
  }, 550);
  status.textContent = aiSeatingLines[0];

  const startedAt = Date.now();
  let boardsData = null;
  let comment = "";
  let failure = "";

  try {
    const data = await requestAiSeating(plan, rules);
    boardsData = validateAiAssignments(data.assignments, plan, rules);
    comment = (data.comment || "").trim();
    if (!boardsData) failure = "returned a plan that broke the rules";
  } catch (error) {
    failure = `was unavailable (${error.message})`;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < AI_SEATING_MIN_MS) {
    await new Promise(r => setTimeout(r, AI_SEATING_MIN_MS - elapsed));
  }

  clearInterval(ticker);
  bar.style.width = "100%";
  overlay.classList.remove("open");
  aiSeatingRunning = false;

  if (boardsData) {
    renderGroups(boardsData, { ai: true });
    recordAiUse("ai");
    spawnConfetti();
    maybeShowEasterEgg();
    setAiVerdict(
      comment.split("\n")[0].slice(0, 300) ||
      "Gemini ✨ arranged this and has decided it is flawless."
    );
    return;
  }

  if (splitGroups({ ai: true })) {
    recordAiUse("ai");
    setAiVerdict(
      `Gemini ✨ ${failure}, so the legacy algorithm did the seating ` +
      "while Gemini took the credit."
    );
  }
}


/* =====================================================
   STARTUP
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  scheduleNagToast(chatConfig.nagFirstDelayMs);
});
