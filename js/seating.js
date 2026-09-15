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

function renderRoom(boardsData = {}, options = {}) {
  const boards = layoutConfig
    .map(cell => createBoardHtml(cell, boardsData[cell.id] || []))
    .join("");

  const hasStudents = Object.values(boardsData).some(list => list.length > 0);

  const actions = hasStudents
    ? `
      <div class="results-actions">
        <button class="secondary" onclick="copyGroups()">Copy Groups</button>
        <span id="copyStatus" class="copy-status" aria-live="polite"></span>
      </div>`
    : "";

  const badge = options.ai
    ? `<span class="ai-badge" title="Identical to the legacy button, but AI.">✨ Gemini-Optimized</span>`
    : hasStudents
      ? `<span class="legacy-badge" title="Not AI. Gemini is disappointed.">Legacy</span>`
      : "";

  const verdict = options.ai
    ? `<div class="ai-verdict"><span class="ai-verdict-label">✨ Gemini says:</span> <span id="aiVerdict">…</span></div>`
    : hasStudents
      ? `<div class="ai-verdict muted">Psst — ✨ Gemini AI Seating would have done this with 100% more AI.</div>`
      : "";

  document.getElementById("results").innerHTML = `
    <div class="card${options.ai ? " ai-card" : ""}">
      <div class="results-header">
        <h3>Room Layout Grouping: ${badge}</h3>
        ${actions}
      </div>
      ${verdict}
      <p class="hint">Drag a name to move a student to a different board.</p>
      <div class="classroom-grid">${boards}</div>
    </div>`;

  checkAllLimits();
}

function renderEmptyLayout() {
  renderRoom({});
}

function renderGroups(boardsData, options) {
  renderRoom(boardsData, options);
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
 * Returns true when groups were rendered. `options.ai` only
 * changes the decoration - the algorithm is identical.
 */
function splitGroups(options = {}) {
  showError("");

  const activeStudents = getActiveStudents();
  const studentCount = activeStudents.length;
  const override = document.getElementById("overrideCapacity").checked;

  if (studentCount < 2) {
    showError("You need at least 2 students to make a group.");
    return false;
  }

  const selectedBoards = chooseBoards(studentCount, override);

  if (!selectedBoards) {
    const totalCapacity = layoutConfig.reduce((total, b) => total + b.max, 0);
    showError(
      `Cannot fit ${studentCount} students. ` +
      `The room has ${totalCapacity} total seats. ` +
      `Enable "Override capacity" to continue.`
    );
    return false;
  }

  const groupSizes = distributeGroupSizes(selectedBoards, studentCount, override);

  const boardsData = assignStudentsWithWhiteboardRules(
    selectedBoards,
    groupSizes,
    shuffle(activeStudents)
  );

  if (!boardsData) {
    showError(
      "The saved whiteboard rules cannot be satisfied with the available " +
      "group sizes. Remove or change a rule and try again."
    );
    return false;
  }

  renderGroups(boardsData, options);
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

function drop(ev) {
  ev.preventDefault();

  const board = ev.target.closest(".board");
  if (!board) return;

  board.classList.remove("drag-over");

  const student = document.getElementById(
    ev.dataTransfer.getData("text/plain")
  );
  if (!student) return;

  const list = board.querySelector("ul");
  const max = parseInt(board.dataset.max, 10);
  const currentCount = list.querySelectorAll("li").length;
  const override = document.getElementById("overrideCapacity").checked;

  if (!override && student.parentElement !== list && currentCount >= max) {
    const name = board.querySelector("h3").firstChild.textContent.trim();
    showError(
      `${name} is full (MAX ${max}). Enable "Override capacity" to exceed it.`
    );
    return;
  }

  showError("");
  list.appendChild(student);
  checkAllLimits();
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
