/* =====================================================
   WHITEBOARD RULES
   Saved separately for each period.

   A rule is { type: "apart" | "together", students: [] }.
   ===================================================== */

const rulesStorageKey = "whiteboardRules";

let allWhiteboardRules = readStoredObject(rulesStorageKey);

function getCurrentRules() {
  const period = getCurrentPeriod();
  return Array.isArray(allWhiteboardRules[period])
    ? allWhiteboardRules[period]
    : [];
}

function saveWhiteboardRules(rules) {
  allWhiteboardRules[getCurrentPeriod()] = rules;
  writeStoredObject(rulesStorageKey, allWhiteboardRules);
}

function openRulesPanel() {
  const panel = document.getElementById("whiteboardRulesPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
  updateRuleStudentOptions();
  renderWhiteboardRules();
}

function updateRuleStudentOptions() {
  const select = document.getElementById("ruleStudents");
  if (!select) return;

  const previous = Array.from(select.selectedOptions).map(o => o.value);
  select.innerHTML = "";

  getSavedRoster().forEach(student => {
    const option = document.createElement("option");
    option.value = student;
    option.textContent = student;
    option.selected = previous.includes(student);
    select.appendChild(option);
  });
}

function addWhiteboardRule() {
  const type = document.getElementById("ruleType").value;
  const select = document.getElementById("ruleStudents");
  const selected = Array.from(select.selectedOptions).map(o => o.value);

  if (selected.length < 2) {
    showError("Select at least two students for a rule.");
    return;
  }

  showError("");
  saveWhiteboardRules([...getCurrentRules(), { type, students: selected }]);
  select.selectedIndex = -1;
  renderWhiteboardRules();
}

function deleteWhiteboardRule(index) {
  const rules = getCurrentRules();
  rules.splice(index, 1);
  saveWhiteboardRules(rules);
  renderWhiteboardRules();
}

function renderWhiteboardRules() {
  const container = document.getElementById("rulesList");
  if (!container) return;

  const rules = getCurrentRules();
  container.innerHTML = "";

  if (rules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "rules-empty";
    empty.textContent = "No rules saved for this period.";
    container.appendChild(empty);
    return;
  }

  const roster = new Set(getSavedRoster().map(s => s.toLowerCase()));

  rules.forEach((rule, index) => {
    const missing = rule.students.filter(s => !roster.has(s.toLowerCase()));

    const item = document.createElement("div");
    item.className = `rule-item ${rule.type}${missing.length ? " inactive" : ""}`;

    const label = document.createElement("span");
    label.textContent =
      (rule.type === "apart" ? "KEEP APART: " : "PUT TOGETHER: ") +
      rule.students.join(", ");

    if (missing.length) {
      const note = document.createElement("small");
      note.textContent = ` (not on roster: ${missing.join(", ")})`;
      label.appendChild(note);
    }

    const button = document.createElement("button");
    button.className = "secondary";
    button.textContent = "Delete";
    button.onclick = () => deleteWhiteboardRule(index);

    item.appendChild(label);
    item.appendChild(button);
    container.appendChild(item);
  });
}

/*
 * Only rules whose students are all present today apply.
 */
function validateWhiteboardRules(activeStudents) {
  const active = new Set(activeStudents.map(s => s.toLowerCase()));
  return getCurrentRules().filter(rule =>
    rule.students.every(student => active.has(student.toLowerCase()))
  );
}


/* =====================================================
   ASSIGN STUDENTS TO BOARDS

   Returns { boardId: [students] } or null when no
   arrangement satisfies the rules.

   1. "Together" rules are merged into units (union-find).
   2. Units are placed largest-first with backtracking,
      preferring the emptiest board, never exceeding the
      group size and never putting an "apart" pair together.
   ===================================================== */

const MAX_SEARCH_STEPS = 200000;

function assignStudentsWithWhiteboardRules(selectedBoards, groupSizes, activeStudents) {
  const rules = validateWhiteboardRules(activeStudents);
  const lower = s => s.toLowerCase();

  /* ---- together rules -> units ---- */

  const parent = new Map(activeStudents.map(s => [lower(s), lower(s)]));

  function find(x) {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  }

  rules
    .filter(r => r.type === "together")
    .forEach(rule => {
      const root = find(lower(rule.students[0]));
      rule.students.slice(1).forEach(s => parent.set(find(lower(s)), root));
    });

  const units = new Map();
  activeStudents.forEach(student => {
    const key = find(lower(student));
    if (!units.has(key)) units.set(key, []);
    units.get(key).push(student);
  });

  const unitList = Array.from(units.values()).sort((a, b) => b.length - a.length);

  /* ---- apart rules -> pairs ---- */

  const apartPairs = [];
  rules
    .filter(r => r.type === "apart")
    .forEach(rule => {
      const keys = rule.students.map(lower);
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          apartPairs.push([keys[i], keys[j]]);
        }
      }
    });

  /* ---- backtracking placement ---- */

  const boardData = selectedBoards.map((board, index) => ({
    board,
    size: groupSizes[index],
    students: []
  }));

  function canPlace(unit, target) {
    if (target.students.length + unit.length > target.size) return false;
    const keys = new Set([...unit, ...target.students].map(lower));
    return !apartPairs.some(([a, b]) => keys.has(a) && keys.has(b));
  }

  let steps = 0;

  function search(index) {
    if (index >= unitList.length) return true;
    if (++steps > MAX_SEARCH_STEPS) return false;

    const unit = unitList[index];
    const order = boardData
      .map((_, i) => i)
      .sort((a, b) => boardData[a].students.length - boardData[b].students.length);

    for (const boardIndex of order) {
      const target = boardData[boardIndex];
      if (!canPlace(unit, target)) continue;

      target.students.push(...unit);
      if (search(index + 1)) return true;
      target.students.length -= unit.length;
    }

    return false;
  }

  if (!search(0)) return null;

  const result = {};
  layoutConfig.forEach(board => (result[board.id] = []));
  boardData.forEach(entry => (result[entry.board.id] = entry.students));
  return result;
}
