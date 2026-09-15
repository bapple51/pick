/* =====================================================
   GROUP TIMER

   A countdown for group work. Controls live in the
   controls card; the running clock is a fixed pill so it
   stays visible while scrolling and on the projector.
   ===================================================== */

let timerEndsAt = null;
let timerTick = null;

function timerDisplayEl() {
  return document.getElementById("timerDisplay");
}

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function refreshTimerControls() {
  const button = document.getElementById("timerButton");
  if (button) button.textContent = timerEndsAt ? "Stop timer" : "Start timer";
}

function renderTimer() {
  const display = timerDisplayEl();
  if (!display || !timerEndsAt) return;

  const remaining = timerEndsAt - Date.now();
  display.textContent = formatClock(remaining);
  display.classList.toggle("warning", remaining <= 60000 && remaining > 0);

  if (remaining <= 0) {
    finishTimer();
  }
}

function startTimer(minutes) {
  stopTimer();

  timerEndsAt = Date.now() + minutes * 60000;

  const display = timerDisplayEl();
  display.classList.remove("done");
  display.classList.add("open");

  renderTimer();
  timerTick = setInterval(renderTimer, 250);
  refreshTimerControls();
}

function stopTimer() {
  clearInterval(timerTick);
  timerTick = null;
  timerEndsAt = null;

  const display = timerDisplayEl();
  if (display) display.classList.remove("open", "warning", "done");

  refreshTimerControls();
}

function finishTimer() {
  clearInterval(timerTick);
  timerTick = null;
  timerEndsAt = null;

  const display = timerDisplayEl();
  display.textContent = "Time's up!";
  display.classList.remove("warning");
  display.classList.add("done");

  refreshTimerControls();
  playTimerChime();
}

function toggleTimer() {
  if (timerEndsAt) {
    stopTimer();
    return;
  }

  const minutes = parseFloat(document.getElementById("timerMinutes").value);
  if (minutes > 0) startTimer(minutes);
}

function dismissTimer() {
  stopTimer();
}

/*
 * Two short beeps via WebAudio. Silently does nothing if the
 * browser blocks audio.
 */
function playTimerChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    [0, 0.35].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.32);
    });
  } catch (error) {
    /* no audio, no problem */
  }
}
