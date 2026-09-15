/* =====================================================
   OBNOXIOUS AI ✨

   Everything in this file exists to remind you that AI
   is available. None of it calls the API.
   ===================================================== */

const obnoxious = {
  splashCountdownSeconds: 5,
  titleCycleMs: 2500,
  sparkleEveryMs: 45,
  confettiPieces: 48
};


/* =====================================================
   AI SCOREBOARD

   Counts AI vs Legacy usage forever. Gemini has feelings
   about the ratio.
   ===================================================== */

const aiScoreKey = "aiScore";

let aiScore = (() => {
  const saved = readStoredObject(aiScoreKey);
  return {
    ai: Number.isInteger(saved.ai) ? saved.ai : 0,
    legacy: Number.isInteger(saved.legacy) ? saved.legacy : 0
  };
})();

function recordAiUse(kind) {
  aiScore[kind] = (aiScore[kind] || 0) + 1;
  writeStoredObject(aiScoreKey, aiScore);
  renderAiScore();
}

function aiMood() {
  const { ai, legacy } = aiScore;
  if (ai === 0 && legacy === 0) return "Gemini is waiting.";
  if (legacy === 0) return "Gemini is proud of you.";
  if (ai === 0) return "Gemini is disappointed in you.";
  if (ai > legacy * 2) return "Gemini approves.";
  if (ai >= legacy) return "Gemini is watching.";
  return "Gemini has noted this.";
}

function renderAiScore() {
  const el = document.getElementById("aiScore");
  if (!el) return;
  el.textContent =
    `✨ AI: ${aiScore.ai} · Legacy: ${aiScore.legacy} — ${aiMood()}`;
}


/* =====================================================
   WELCOME SPLASH

   Shown on every load. "Continue without AI" unlocks
   after a countdown; "Unleash Gemini" is instant.
   ===================================================== */

let splashTimer = null;

function isSplashOpen() {
  const splash = document.getElementById("aiSplash");
  return !!splash && splash.classList.contains("open");
}

function showSplash() {
  const splash = document.getElementById("aiSplash");
  const skip = document.getElementById("splashSkip");
  if (!splash || !skip) return;

  splash.classList.add("open");
  document.body.style.overflow = "hidden";

  let remaining = obnoxious.splashCountdownSeconds;
  skip.disabled = true;
  skip.textContent = `Continue without AI (${remaining})`;

  clearInterval(splashTimer);
  splashTimer = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      skip.textContent = `Continue without AI (${remaining})`;
      return;
    }
    clearInterval(splashTimer);
    skip.disabled = false;
    skip.textContent = "Continue without AI 😔";
  }, 1000);
}

function dismissSplash() {
  clearInterval(splashTimer);
  const splash = document.getElementById("aiSplash");
  if (splash) splash.classList.remove("open");
  document.body.style.overflow = "";
  showAiConsent();
}

function splashUnleash() {
  dismissSplash();
  if (getActiveStudents().length >= 2) {
    aiSplitGroups();
  } else {
    openChatModal();
  }
}


/* =====================================================
   AI CONSENT BAR

   Both buttons accept. There is no other option.
   ===================================================== */

function showAiConsent() {
  const bar = document.getElementById("aiConsent");
  if (bar) bar.classList.add("open");
}

function acceptAi() {
  const bar = document.getElementById("aiConsent");
  if (bar) bar.classList.remove("open");
  spawnConfetti(12);
}


/* =====================================================
   LEGACY CONFIRMATION

   Making groups without AI requires acknowledging it.
   ===================================================== */

function confirmLegacy() {
  hideNagToast();
  const modal = document.getElementById("legacyConfirm");
  if (modal) modal.classList.add("open");
}

function closeLegacyConfirm() {
  const modal = document.getElementById("legacyConfirm");
  if (modal) modal.classList.remove("open");
}

function legacyRedeemed() {
  closeLegacyConfirm();
  aiSplitGroups();
}

function legacyAnyway() {
  closeLegacyConfirm();
  if (splitGroups()) recordAiUse("legacy");
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLegacyConfirm();
});


/* =====================================================
   TAB TITLE
   ===================================================== */

const obnoxiousTitles = [
  "Classroom Helper ✨ Powered by Gemini AI",
  "✨ Gemini AI Seating™",
  "🚀 Now with AI",
  "Have you tried AI Seating? ✨",
  "Classroom Helper (AI Edition)"
];

let titleIndex = 0;

function cycleTitle() {
  titleIndex = (titleIndex + 1) % obnoxiousTitles.length;
  document.title = obnoxiousTitles[titleIndex];
}


/* =====================================================
   SPARKLE CURSOR
   ===================================================== */

let lastSparkleAt = 0;

function sparkleAt(x, y) {
  const now = Date.now();
  if (now - lastSparkleAt < obnoxious.sparkleEveryMs) return;
  lastSparkleAt = now;

  const sparkle = document.createElement("span");
  sparkle.className = "cursor-sparkle";
  sparkle.textContent = Math.random() < 0.85 ? "✨" : "🤖";
  sparkle.style.left = `${x + (Math.random() * 16 - 8)}px`;
  sparkle.style.top = `${y + (Math.random() * 16 - 8)}px`;
  sparkle.style.fontSize = `${10 + Math.random() * 10}px`;
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 900);
}


/* =====================================================
   CONFETTI
   ===================================================== */

const confettiEmoji = ["✨", "🚀", "🤖", "💎", "⭐", "🧠"];

function spawnConfetti(count = obnoxious.confettiPieces) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "ai-confetti";
    piece.textContent =
      confettiEmoji[Math.floor(Math.random() * confettiEmoji.length)];
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    piece.style.fontSize = `${14 + Math.random() * 18}px`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3600);
  }
}


/* =====================================================
   STARTUP
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  renderAiScore();
  showSplash();
  setInterval(cycleTitle, obnoxious.titleCycleMs);

  document.addEventListener("mousemove", event => {
    sparkleAt(event.clientX, event.clientY);
  });
});
