/* =====================================================
   PICKER CONFIGURATION
   ===================================================== */

/*
 * Optional pick weights. Keys are matched case-insensitively
 * as substrings of the student's name. 1.0 is the normal
 * weight; 0.2 makes a student five times less likely to be
 * picked. Remove an entry (or empty the object) to restore
 * equal odds. Note that the wheel always draws equal slices.
 */
const pickWeights = {
  alejandro: 0.2,
  isaac: 0.2,
  landon: 0.2
};

const SPIN_DURATION_MS = 3000;


/* =====================================================
   WHEEL STATE
   ===================================================== */

const pickedStorageKey = "pickedStudents";

let allPickedData = readStoredObject(pickedStorageKey);

let pickedStudents = [];

let currentRotation = 0;

let wheelSpinning = false;

let lastFocusedElement = null;

let aiPickPending = false;

/*
 * Identical to spinWheel(). Gemini simply agrees with the result.
 */
function aiSpinWheel() {
  if (wheelSpinning) return;
  aiPickPending = true;
  spinWheel();
}

function setPickerAiNote(text) {
  const note = document.getElementById("pickerAiNote");
  if (note) note.textContent = isAiEnabled() ? text : "";
}

function loadPickedStudents() {
  const saved = allPickedData[getCurrentPeriod()];
  pickedStudents = Array.isArray(saved) ? [...saved] : [];
}

function savePickedStudents() {
  allPickedData[getCurrentPeriod()] = pickedStudents;
  writeStoredObject(pickedStorageKey, allPickedData);
}


/* =====================================================
   MODAL
   ===================================================== */

function isPickerOpen() {
  return document.getElementById("pickerModal").classList.contains("open");
}

function resetWheelPosition() {
  const wheel = document.getElementById("studentWheel");
  if (!wheel) return;
  wheel.style.transition = "none";
  wheel.style.transform = "rotate(0deg)";
  currentRotation = 0;
}

function openPickerModal() {
  lastFocusedElement = document.activeElement;

  document.getElementById("pickerModal").classList.add("open");
  document.body.style.overflow = "hidden";

  if (!wheelSpinning) resetWheelPosition();

  drawWheel();
  document.getElementById("spinButton").focus();
}

function closePickerModal() {
  if (wheelSpinning || !isPickerOpen()) return;

  document.getElementById("pickerModal").classList.remove("open");
  document.body.style.overflow = "";

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function handleModalBackgroundClick(event) {
  if (event.target.id === "pickerModal") closePickerModal();
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePickerModal();
});


/* =====================================================
   HELPERS
   ===================================================== */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}


/* =====================================================
   GET ACTIVE STUDENTS

   The absence checklist wins when it is visible;
   otherwise the typed names are used.
   ===================================================== */

function getActiveStudents() {
  const rosterSection = document.getElementById("rosterSection");

  if (rosterSection.style.display === "block") {
    return Array.from(
      document.querySelectorAll("#rosterList input[type='checkbox']")
    )
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);
  }

  return parseNames(document.getElementById("studentInput").value);
}

function getAvailableStudents() {
  const noRepeat = document.getElementById("noRepeat").checked;
  const students = getActiveStudents();

  return noRepeat
    ? students.filter(student => !pickedStudents.includes(student))
    : students;
}


/* =====================================================
   PICKED LIST
   ===================================================== */

function renderPickedList() {
  const container = document.getElementById("pickedList");
  if (!container) return;

  container.innerHTML = "";

  if (pickedStudents.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";

  const label = document.createElement("span");
  label.className = "picked-label";
  label.textContent = "Picked so far:";
  container.appendChild(label);

  pickedStudents.forEach((student, index) => {
    const chip = document.createElement("span");
    chip.className = "picked-chip";
    chip.textContent = `${index + 1}. ${student}`;
    container.appendChild(chip);
  });
}


/* =====================================================
   DRAW WHEEL
   ===================================================== */

function drawWheel() {
  const canvas = document.getElementById("studentWheel");
  if (!canvas) return;

  /*
   * Draw at device resolution so the wheel is crisp on HiDPI
   * screens; all geometry below uses the logical size.
   */
  const size = 600;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (canvas.width !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const students = getAvailableStudents();
  const center = size / 2;
  const radius = size / 2 - 8;

  ctx.clearRect(0, 0, size, size);
  renderPickedList();

  /* ---- no students ---- */

  if (students.length === 0) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#eeeeee";
    ctx.fill();
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#666";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      pickedStudents.length ? "Everyone picked" : "No students",
      center,
      center
    );

    document.getElementById("wheelStatus").innerText = pickedStudents.length
      ? "Press Reset Picks to start again."
      : "Add students to create the wheel.";
    return;
  }

  /* ---- slices ---- */

  const slice = (Math.PI * 2) / students.length;
  const startOffset = -Math.PI / 2;

  const font =
    students.length > 25 ? "10px Arial" :
    students.length > 15 ? "12px Arial" :
    "14px Arial";

  students.forEach((student, index) => {
    const start = startOffset + index * slice;
    const end = start + slice;
    const hue = (index * 47) % 360;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = `hsl(${hue}, 75%, 72%)`;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + slice / 2);
    ctx.fillStyle = "#222";
    ctx.font = font;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const displayName =
      student.length > 18 ? student.substring(0, 17) + "…" : student;

    ctx.fillText(displayName, radius - 15, 0);
    ctx.restore();
  });

  /* ---- center hub ---- */

  ctx.beginPath();
  ctx.arc(center, center, 35, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SPIN", center, center);

  document.getElementById("wheelStatus").innerText =
    `${plural(students.length, "student")} available`;
}


/* =====================================================
   SPIN WHEEL
   ===================================================== */

function pickWeightedIndex(students) {
  const weights = students.map(student => {
    const name = student.toLowerCase();
    const match = Object.keys(pickWeights).find(key => name.includes(key));
    return match ? pickWeights[match] : 1.0;
  });

  const totalWeight = weights.reduce((total, w) => total + w, 0);
  let randomValue = Math.random() * totalWeight;

  for (let i = 0; i < students.length; i++) {
    randomValue -= weights[i];
    if (randomValue <= 0) return i;
  }

  return students.length - 1;
}

function spinWheel() {
  if (wheelSpinning) return;

  const wheel = document.getElementById("studentWheel");
  const button = document.getElementById("spinButton");
  const noRepeat = document.getElementById("noRepeat").checked;

  /*
   * Redraw from 0deg BEFORE choosing the winner so the slice
   * positions and winnerIndex describe exactly the same wheel.
   */
  resetWheelPosition();
  drawWheel();

  const students = getAvailableStudents();

  if (students.length === 0) {
    document.getElementById("winnerDisplay").innerText =
      "Everyone has been picked.";
    document.getElementById("wheelStatus").innerText =
      "Press Reset Picks to start again.";
    return;
  }

  /*
   * The winner is fully determined here; the animation
   * merely lands on it.
   */
  const winnerIndex = pickWeightedIndex(students);
  const selected = students[winnerIndex];

  document.getElementById("winnerDisplay").innerText = "Spinning...";
  document.getElementById("wheelStatus").innerText = "Choosing a student...";

  /* ---- target rotation ---- */

  const slice = 360 / students.length;

  /*
   * Land at a random point inside the winning slice, away
   * from its edges, so the pointer never sits on a boundary.
   */
  const padding = Math.min(slice * 0.15, 8);
  const randomInsideSlice = padding + Math.random() * (slice - padding * 2);
  const selectedAngle = winnerIndex * slice + randomInsideSlice;
  const targetAngle = 360 - selectedAngle;

  const currentMod = ((currentRotation % 360) + 360) % 360;
  const extraSpins = 360 * (6 + Math.floor(Math.random() * 3));

  let rotationDelta = targetAngle - currentMod;
  if (rotationDelta < 0) rotationDelta += 360;

  const finalRotation = currentRotation + extraSpins + rotationDelta;
  currentRotation = finalRotation;

  /* ---- animate ---- */

  wheelSpinning = true;
  button.disabled = true;
  button.style.opacity = "0.6";

  const aiButton = document.getElementById("aiSpinButton");
  if (aiButton) aiButton.disabled = true;

  const aiPick = aiPickPending;
  aiPickPending = false;
  setPickerAiNote(aiPick ? "✨ Gemini is deliberating…" : "");

  wheel.style.transition =
    `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.12, 0.78, 0.18, 1)`;

  void wheel.offsetWidth; // commit the 0deg start before animating

  wheel.style.transform = `rotate(${finalRotation}deg)`;

  setTimeout(() => {
    /*
     * Do NOT redraw here: the wheel must stay where it landed.
     */
    document.getElementById("winnerDisplay").innerText = selected;

    if (noRepeat && !pickedStudents.includes(selected)) {
      pickedStudents.push(selected);
      savePickedStudents();
    }

    renderPickedList();

    wheelSpinning = false;
    button.disabled = false;
    button.style.opacity = "1";
    if (aiButton) aiButton.disabled = false;

    setPickerAiNote(
      aiPick
        ? "✨ Gemini concurs with this selection."
        : "Legacy pick. Gemini would have chosen the same, but with AI."
    );

    document.getElementById("wheelStatus").innerText = noRepeat
      ? `${plural(students.length - 1, "student")} remaining`
      : `${plural(students.length, "student")} available`;
  }, SPIN_DURATION_MS + 100);
}


/* =====================================================
   RESET PICKS
   ===================================================== */

function resetPickedStudents() {
  if (wheelSpinning) return;

  pickedStudents = [];
  savePickedStudents();

  resetWheelPosition();

  document.getElementById("winnerDisplay").innerText = "No student selected";
  setPickerAiNote("");

  drawWheel();
}
