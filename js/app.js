/* =====================================================
   APPLICATION BOOTSTRAP

   Modules are loaded in dependency order from index.html:
   storage -> rules -> seating -> picker -> chat ->
   timer -> backup -> obnoxious -> app.
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadSelectedClass();
  loadPeriodRoster();

  document
    .getElementById("studentInput")
    .addEventListener("input", handleRosterInput);

  document
    .getElementById("results")
    .addEventListener("click", handleResultsClick);
});
