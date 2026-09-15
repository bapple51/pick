/* =====================================================
   BACKUP

   Everything lives in localStorage, which a cleared cache
   or a new device wipes. Export writes it all to a JSON
   file; Import restores it.
   ===================================================== */

const backupKeys = [
  "whiteboardRosters",
  "whiteboardRules",
  "pickedStudents",
  "groupHistory",
  "absences",
  "aiChatHistory",
  "aiScore",
  "selectedClass"
];

function exportData() {
  const data = {};
  backupKeys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = raw;
  });

  const payload = {
    app: "classroom-helper",
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `classroom-helper-backup-${todayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importDataPrompt() {
  document.getElementById("importFile").click();
}

async function importData(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (error) {
    showError("That file is not a Classroom Helper backup.");
    return;
  }

  if (!payload || payload.app !== "classroom-helper" || typeof payload.data !== "object") {
    showError("That file is not a Classroom Helper backup.");
    return;
  }

  const when = payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : "unknown date";
  if (!confirm(`Replace all rosters, rules and history with the backup from ${when}?`)) {
    return;
  }

  backupKeys.forEach(key => {
    if (typeof payload.data[key] === "string") {
      localStorage.setItem(key, payload.data[key]);
    } else {
      localStorage.removeItem(key);
    }
  });

  location.reload();
}
