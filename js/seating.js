/* =====================================================
   CREATE BOARD HTML
   ===================================================== */

function createBoardHtml(cell, students = []) {
  const items = students
    .map((student, index) => {
      const uniqueId = `student-${cell.id}-${index}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      return `
        <li id="${uniqueId}" draggable="true" ondragstart="drag(event)">
          ${escapeHtml(student)}
        </li>`;
    })
    .join("");

  return `
    <div id="board-${cell.id}" class="board ${cell.class}" data-max="${cell.max}">
      <h3>
        ${escapeHtml(cell.name)}
        <span class="limit">(MAX ${cell.max})</span>
      </h3>
      <ul
        id="list-${cell.id}"
        ondragover="allowDrop(event)"
        ondragleave="dragLeave(event)"
        ondrop="drop(event)"
      >${items}</ul>
    </div>`;
}


/* =====================================================
   RENDER ROOM
   ===================================================== */

function formatWhen(timestamp) {
  const d = new Date(timestamp);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay
    ? `today at ${time}`
    : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

function renderRoom(boardsData = {}, options = {}) {
  const boards = layoutConfig
    .map(cell => createBoardHtml(cell, boardsData[cell.id] || []))
    .join("");

  const hasStudents = Object.values(boardsData).some(list => list.length > 0);

  const actions = hasStudents
    ? `
      <div class="results-actions">
        <button class="secondary" onclick="copyGroups()">Copy Groups <span class="mini-ai inverse">✨</span></button>
        <button class="secondary" onclick="window.print()">Print</button>
        <span id="copyStatus" class="copy-status" aria-live="polite"></span>
      </div>`
    : "";

  const restoredNote = options.restored
    ? `<span class="restored-note">Restored from ${formatWhen(options.restored)}.</span> `
    : "";

  const aiOn = typeof isAiEnabled !== "function" || isAiEnabled();

  const badge = options.ai
    ? `<span class="ai-badge" title="Identical to the legacy button, but AI.">✨ Gemini-Optimized</span>`
    : hasStudents && aiOn
      ? `<span class="legacy-badge" title="Not AI. Gemini is disappointed.">Legacy</span>`
      : "";

  const verdict = options.ai
    ? `<div class="ai-verdict"><span class="ai-verdict-label">✨ Gemini says:</span> <span id="aiVerdict">${escapeHtml(options.verdict || "…")}</span></div>`
    : hasStudents && aiOn
      ? `<div class="ai-verdict muted">Psst — ✨ Gemini AI Seating would have done this with 100% more AI.</div>`
      : "";

  document.getElementById("results").innerHTML = `
    <div class="card results-card${options.ai ? " ai-card" : ""}">
      <div class="results-header">
        <h3>Room Layout Grouping: ${badge}</h3>
        ${actions}
      </div>
      ${verdict}
      <p class="hint">
        ${restoredNote}Drag a name — or tap a name, then tap a board — to move a student.
      </p>
      <div class="classroom-grid">${boards}</div>
    </div>`;

  selectedStudentId = null;
  checkAllLimits();
  if (typeof refreshTimerControls === "function") refreshTimerControls();
}

function renderEmptyLayout() {
  renderRoom({});
}

function renderGroups(boardsData, options) {
  renderRoom(boardsData, options);
}


/* =====================================================
   GROUP HISTORY

   The last few groupings per period are kept so the
   current arrangement survives a reload and so "avoid
   recent partners" has something to avoid.
   ===================================================== */

const groupHistoryKey = "groupHistory";
const GROUP_HISTORY_LIMIT = 6;
const RECENT_PARTNER_LOOKBACK = 3;

let allGroupHistory = readStoredObject(groupHistoryKey);

function getGroupHistory(period = getCurrentPeriod()) {
  return Array.isArray(allGroupHistory[period]) ? allGroupHistory[period] : [];
}

function writeGroupHistory(list, period = getCurrentPeriod()) {
  allGroupHistory[period] = list.slice(-GROUP_HISTORY_LIMIT);
  writeStoredObject(groupHistoryKey, allGroupHistory);
}

function compactGroups(boardsData) {
  const groups = {};
  Object.keys(boardsData).forEach(id => {
    if (boardsData[id] && boardsData[id].length) groups[id] = [...boardsData[id]];
  });
  return groups;
}

function pushGroupHistory(boardsData, meta = {}) {
  const list = getGroupHistory();
  list.push({
    at: Date.now(),
    ai: !!meta.ai,
    verdict: meta.verdict || "",
    groups: compactGroups(boardsData)
  });
  writeGroupHistory(list);
}

/*
 * Drag/tap edits change the latest grouping in place.
 */
function updateLatestGrouping() {
  const list = getGroupHistory();
  if (!list.length) return;
  const groups = {};
  getGroupsFromDom().forEach(group => {
    const cell = layoutConfig.find(c => c.name === group.name);
    if (cell) groups[cell.id] = group.students;
  });
  list[list.length - 1].groups = groups;
  writeGroupHistory(list);
}

function updateLatestVerdict(verdict) {
  const list = getGroupHistory();
  if (!list.length) return;
  list[list.length - 1].verdict = verdict;
  writeGroupHistory(list);
}

function restoreGrouping() {
  const list = getGroupHistory();
  const latest = list[list.length - 1];

  if (!latest || !latest.groups) {
    renderEmptyLayout();
    return;
  }

  renderRoom(latest.groups, {
    ai: latest.ai,
    verdict: latest.verdict,
    restored: latest.at
  });
}

function clearGrouping() {
  writeGroupHistory(getGroupHistory().slice(0, -1));
  restoreGrouping();
}

function pairKey(a, b) {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("|");
}

/*
 * Every pair of students who shared a board in the last few
 * groupings for this period.
 */
function recentPartnerPairs() {
  const pairs = new Set();
  getGroupHistory()
    .slice(-RECENT_PARTNER_LOOKBACK)
    .forEach(entry => {
      Object.values(entry.groups || {}).forEach(names => {
        for (let i = 0; i < names.length; i++) {
          for (let j = i + 1; j < names.length; j++) {
            pairs.add(pairKey(names[i], names[j]));
          }
        }
      });
    });
  return pairs;
}

function countRepeatedPairs(boardsData, pairs) {
  let repeats = 0;
  Object.values(boardsData).forEach(names => {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (pairs.has(pairKey(names[i], names[j]))) repeats++;
      }
    }
  });
  return repeats;
}

function shouldAvoidRepeats() {
  const box = document.getElementById("avoidRepeats");
  return !box || box.checked;
}


/* =====================================================
   COPY GROUPS

   Reads the current DOM so drag-and-drop edits are
   included.
   ===================================================== */

function getGroupsFromDom() {
  return layoutConfig
    .map(cell => ({
      name: cell.name,
      students: Array.from(
        document.querySelectorAll(`#list-${cell.id} li`)
      ).map(li => li.textContent.trim())
    }))
    .filter(group => group.students.length > 0);
}

async function copyGroups() {
  const text = getGroupsFromDom()
    .map(group => `${group.name}: ${group.students.join(", ")}`)
    .join("\n");

  const status = document.getElementById("copyStatus");

  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Copied!";
  } catch (error) {
    /*
     * The Clipboard API needs a secure context; fall back to a
     * temporary textarea so file:// still works.
     */
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(scratch);
    status.textContent = ok ? "Copied!" : "Copy failed";
  }

  setTimeout(() => (status.textContent = ""), 2000);
}


/* =====================================================
   CHOOSE BOARDS

   Boards are used in priority order: MAX-2 boards first,
   then MAX-3 boards. We use as many boards as possible
   (every board needs at least 2 students) and prefer
   MAX-2 boards over MAX-3 boards.

   In normal mode the chosen boards must fit everyone.
   In override mode we simply take the top boards and
   allow groups to exceed their MAX.
   ===================================================== */

function chooseBoards(studentCount, override) {
  const max2Boards = layoutConfig.filter(board => board.max === 2);
  const max3Boards = layoutConfig.filter(board => board.max === 3);
  const prioritizedBoards = [...max2Boards, ...max3Boards];

  const maxGroups = Math.min(
    Math.floor(studentCount / 2),
    prioritizedBoards.length
  );

  if (override) {
    return prioritizedBoards.slice(0, maxGroups);
  }

  for (let groupCount = maxGroups; groupCount >= 1; groupCount--) {
    /*
     * With `twos` MAX-2 boards and the rest MAX-3, capacity is
     * 2 * twos + 3 * (groupCount - twos). Try the most MAX-2
     * boards first.
     */
    const maxTwos = Math.min(groupCount, max2Boards.length);
    const minTwos = Math.max(0, groupCount - max3Boards.length);

    for (let twos = maxTwos; twos >= minTwos; twos--) {
      const threes = groupCount - twos;
      const capacity = twos * 2 + threes * 3;

      if (studentCount >= groupCount * 2 && studentCount <= capacity) {
        return [
          ...max2Boards.slice(0, twos),
          ...max3Boards.slice(0, threes)
        ];
      }
    }
  }

  return null;
}


/* =====================================================
   GROUP SIZES

   Every group starts at 2. MAX-3 boards are filled to 3
   first, then any remaining capacity is used. In override
   mode extra students are spread evenly beyond MAX.

   Examples:
     12 -> 2+2+2+2+2+2
     13 -> 2+2+2+2+2+2+3
   ===================================================== */

function distributeGroupSizes(boards, studentCount, override) {
  const sizes = boards.map(() => 2);
  let remaining = studentCount - boards.length * 2;

  for (let i = 0; i < boards.length && remaining > 0; i++) {
    if (boards[i].max >= 3) {
      sizes[i] = 3;
      remaining--;
    }
  }

  /*
   * Fallback for boards with MAX greater than 3.
   */
  let added = true;
  while (remaining > 0 && added) {
    added = false;
    for (let i = 0; i < boards.length && remaining > 0; i++) {
      if (sizes[i] < boards[i].max) {
        sizes[i]++;
        remaining--;
        added = true;
      }
    }
  }

  if (override) {
    for (let i = 0; remaining > 0; i = (i + 1) % boards.length) {
      sizes[i]++;
      remaining--;
    }
  }

  return sizes;
}


/* =====================================================
   SPLIT GROUPS
   ===================================================== */

/*
 * Work out which boards to use and how big each group is for
 * today's students. Returns { students, boards, sizes } or
 * shows an error and returns null. Shared by the legacy and
 * AI paths so both produce the same shape of plan.
 */
function planGroups() {
  showError("");

  const students = getActiveStudents();
  const studentCount = students.length;
  const override = document.getElementById("overrideCapacity").checked;

  if (studentCount < 2) {
    showError("You need at least 2 students to make a group.");
    return null;
  }

  const boards = chooseBoards(studentCount, override);

  if (!boards) {
    const totalCapacity = layoutConfig.reduce((total, b) => total + b.max, 0);
    showError(
      `Cannot fit ${studentCount} students. ` +
      `The room has ${totalCapacity} total seats. ` +
      `Enable "Override capacity" to continue.`
    );
    return null;
  }

  const sizes = distributeGroupSizes(boards, studentCount, override);

  return { students, boards, sizes };
}

/*
 * Legacy path: local random assignment. Returns true when
 * groups were rendered. `options.ai` only changes the
 * decoration (used when the AI path falls back to this).
 */
function splitGroups(options = {}) {
  const plan = planGroups();
  if (!plan) return false;

  /*
   * With "avoid recent partners" on, try a number of shuffles and
   * keep the one that repeats the fewest recent pairs.
   */
  const pairs = shouldAvoidRepeats() ? recentPartnerPairs() : new Set();
  const attempts = pairs.size ? 40 : 1;

  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < attempts; i++) {
    const candidate = assignStudentsWithWhiteboardRules(
      plan.boards,
      plan.sizes,
      shuffle(plan.students)
    );
    if (!candidate) continue;

    const score = countRepeatedPairs(candidate, pairs);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
    if (score === 0) break;
  }

  if (!best) {
    showError(
      "The saved whiteboard rules cannot be satisfied with the available " +
      "group sizes. Remove or change a rule and try again."
    );
    return false;
  }

  renderGroups(best, options);
  pushGroupHistory(best, { ai: !!options.ai });
  maybeShowEasterEgg();
  return true;
}


/* =====================================================
   EASTER EGG

   Occasionally flashes an image after groups are made.
   Put the image at `easterEgg.image` (see README).
   ===================================================== */

const easterEgg = {
  image: "img/chad-potential.png",
  chance: 1 / 15,
  durationMs: 1000,
  cooldownMs: 10000
};

let easterEggTimer = null;
let lastSplitAt = 0;

/*
 * Only roll the dice when Make Groups hasn't been clicked
 * recently, so spamming the button never reveals the egg.
 */
function maybeShowEasterEgg() {
  const now = Date.now();
  const spamming = now - lastSplitAt < easterEgg.cooldownMs;
  lastSplitAt = now;

  if (spamming) return;
  if (Math.random() >= easterEgg.chance) return;
  showEasterEgg();
}

function showEasterEgg() {
  const overlay = document.getElementById("easterEgg");
  const image = document.getElementById("easterEggImage");
  if (!overlay || !image) return;

  image.src = easterEgg.image;
  overlay.classList.add("open");

  clearTimeout(easterEggTimer);
  easterEggTimer = setTimeout(hideEasterEgg, easterEgg.durationMs);
}

function hideEasterEgg() {
  clearTimeout(easterEggTimer);
  const overlay = document.getElementById("easterEgg");
  if (overlay) overlay.classList.remove("open");
}


/* =====================================================
   DRAG AND DROP
   ===================================================== */

function drag(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.id);
  ev.dataTransfer.effectAllowed = "move";
}

function allowDrop(ev) {
  ev.preventDefault();
  const board = ev.target.closest(".board");
  if (board) board.classList.add("drag-over");
}

function dragLeave(ev) {
  const board = ev.target.closest(".board");
  if (board) board.classList.remove("drag-over");
}

/*
 * Move a student <li> into a board, respecting capacity unless
 * override is on. Returns true when the move happened.
 */
function moveStudentToBoard(student, board) {
  const list = board.querySelector("ul");
  const max = parseInt(board.dataset.max, 10);
  const currentCount = list.querySelectorAll("li").length;
  const override = document.getElementById("overrideCapacity").checked;

  if (!override && student.parentElement !== list && currentCount >= max) {
    const name = board.querySelector("h3").firstChild.textContent.trim();
    showError(
      `${name} is full (MAX ${max}). Enable "Override capacity" to exceed it.`
    );
    return false;
  }

  showError("");
  list.appendChild(student);
  checkAllLimits();
  updateLatestGrouping();
  return true;
}

function drop(ev) {
  ev.preventDefault();

  const board = ev.target.closest(".board");
  if (!board) return;

  board.classList.remove("drag-over");

  const student = document.getElementById(
    ev.dataTransfer.getData("text/plain")
  );
  if (!student) return;

  moveStudentToBoard(student, board);
}


/* =====================================================
   TAP TO MOVE

   HTML5 drag-and-drop does not work on touch screens, so
   tapping a name selects it and tapping a board moves it.
   ===================================================== */

let selectedStudentId = null;

function setSelectedStudent(id) {
  document
    .querySelectorAll(".board li.selected")
    .forEach(li => li.classList.remove("selected"));

  selectedStudentId = id;

  if (id) {
    const li = document.getElementById(id);
    if (li) li.classList.add("selected");
  }

  document
    .querySelector(".classroom-grid")
    ?.classList.toggle("has-selection", !!id);
}

function handleResultsClick(ev) {
  if (ev.target.closest("button, a, input")) return;

  const li = ev.target.closest(".board li");
  if (li) {
    setSelectedStudent(selectedStudentId === li.id ? null : li.id);
    return;
  }

  const board = ev.target.closest(".board");
  if (board && selectedStudentId) {
    const student = document.getElementById(selectedStudentId);
    if (student) moveStudentToBoard(student, board);
    setSelectedStudent(null);
  }
}


/* =====================================================
   CHECK BOARD LIMITS
   ===================================================== */

function checkAllLimits() {
  document.querySelectorAll(".board").forEach(board => {
    const max = parseInt(board.dataset.max, 10);
    const currentCount = board.querySelectorAll("ul li").length;
    board.classList.toggle("over-limit", currentCount > max);
  });
}
