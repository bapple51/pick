/* =====================================================
   APPLICATION BOOTSTRAP

   Modules are loaded in dependency order from index.html:
   storage -> rules -> seating -> picker -> app.
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadSelectedClass();
  loadPeriodRoster();
  renderEmptyLayout();

  document
    .getElementById("studentInput")
    .addEventListener("input", handleRosterInput);
});
