/* =====================================================
   CLASS SWITCHER
   ===================================================== */

const classStorageKey = "selectedClass";

function switchClass() {
  const classSelect = document.getElementById("classSelect");
  if (!classSelect) return;
  localStorage.setItem(classStorageKey, classSelect.value);
}

function loadSelectedClass() {
  const classSelect = document.getElementById("classSelect");
  if (!classSelect) return;

  const savedClass = localStorage.getItem(classStorageKey);
  const exists = Array.from(classSelect.options).some(
    option => option.value === savedClass
  );

  if (savedClass && exists) {
    classSelect.value = savedClass;
  }
}


/* =====================================================
   ROOM CONFIGURATION

   Boards are listed in room order. `max` is the normal
   capacity; `class` positions the board in the CSS grid.
   ===================================================== */

const layoutConfig = [
  { id: "l-smartboard", name: "L Smartboard", max: 2, class: "l-smartboard" },
  { id: "r-smartboard", name: "R Smartboard", max: 2, class: "r-smartboard" },
  { id: "easel",        name: "Easel",        max: 3, class: "easel" },
  { id: "casteel",      name: "Casteel",      max: 3, class: "casteel" },
  { id: "bird",         name: "Bird",         max: 3, class: "bird" },
  { id: "printer",      name: "Printer",      max: 3, class: "printer" },
  { id: "sink",         name: "Sink",         max: 3, class: "sink" },
  { id: "tv",           name: "TV",           max: 3, class: "tv" },
  { id: "thermostat",   name: "Thermostat",   max: 3, class: "thermostat" },
  { id: "b6",           name: "6",            max: 2, class: "b6" },
  { id: "b5",           name: "5",            max: 2, class: "b5" },
  { id: "b4",           name: "4",            max: 2, class: "b4" },
  { id: "b3",           name: "3",            max: 2, class: "b3" },
  { id: "b2",           name: "2",            max: 2, class: "b2" },
  { id: "b1",           name: "1",            max: 2, class: "b1" }
];


/* =====================================================
   LOCAL STORAGE HELPERS
   ===================================================== */

function readStoredObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch (error) {
    console.warn(`Ignoring corrupt localStorage entry "${key}".`, error);
    return {};
  }
}

function writeStoredObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/*
 * Turn textarea contents into a clean list of names:
 * one per line, trimmed, blanks removed, duplicates
 * (case-insensitive) dropped.
 */
function parseNames(text) {
  const seen = new Set();
  const names = [];

  text.split(/\r?\n/).forEach(line => {
    const name = line.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });

  return names;
}

function sameNames(a, b) {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}

function showError(message) {
  document.getElementById("errorMsg").innerText = message || "";
}


/* =====================================================
   PERIOD STORAGE
   ===================================================== */

const rosterStorageKey = "whiteboardRosters";

let allPeriodData = readStoredObject(rosterStorageKey);

function getCurrentPeriod() {
  return document.getElementById("periodSelect").value;
}

function getSavedRoster(period = getCurrentPeriod()) {
  return Array.isArray(allPeriodData[period]) ? allPeriodData[period] : [];
}


/* =====================================================
   SAVE PERIOD
   ===================================================== */

function savePeriodRoster() {
  const input = document.getElementById("studentInput").value;
  const period = getCurrentPeriod();
  const students = parseNames(input);

  showError("");

  if (students.length === 0) {
    showError("Please enter some names before saving.");
    return;
  }

  allPeriodData[period] = students;
  writeStoredObject(rosterStorageKey, allPeriodData);

  /*
   * A new roster means old pick history no longer applies.
   */
  pickedStudents = [];
  savePickedStudents();

  loadPeriodRoster();
}


/* =====================================================
   LOAD PERIOD
   ===================================================== */

function loadPeriodRoster() {
  const period = getCurrentPeriod();
  const rosterSection = document.getElementById("rosterSection");
  const rosterList = document.getElementById("rosterList");
  const textarea = document.getElementById("studentInput");
  const students = getSavedRoster(period);

  showError("");
  setRosterHint("");
  loadPickedStudents();

  rosterList.innerHTML = "";
  textarea.value = students.join("\n");

  if (students.length === 0) {
    rosterSection.style.display = "none";
  } else {
    rosterSection.style.display = "block";

    students.forEach((student, index) => {
      const item = document.createElement("div");
      item.className = "roster-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.value = student;
      checkbox.id = `student-${period}-${index}`;
      checkbox.addEventListener("change", drawWheel);

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = student;

      item.appendChild(checkbox);
      item.appendChild(label);
      rosterList.appendChild(item);
    });
  }

  updateRuleStudentOptions();
  renderWhiteboardRules();
  drawWheel();
}


/* =====================================================
   UNSAVED EDITS

   While the textarea differs from the saved roster the
   absence list is hidden and the typed names are used
   directly, so edits are never silently ignored.
   ===================================================== */

function setRosterHint(message) {
  const hint = document.getElementById("rosterHint");
  if (!hint) return;
  hint.textContent = message;
  hint.style.display = message ? "block" : "none";
}

function handleRosterInput() {
  const typed = parseNames(document.getElementById("studentInput").value);
  const saved = getSavedRoster();
  const rosterSection = document.getElementById("rosterSection");

  if (saved.length === 0 || sameNames(typed, saved)) {
    rosterSection.style.display = saved.length ? "block" : "none";
    setRosterHint("");
  } else {
    rosterSection.style.display = "none";
    setRosterHint(
      "Using the names typed above. Click \"Save to Period\" to update the saved roster and absence list."
    );
  }

  drawWheel();
}
