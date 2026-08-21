/* =====================================================
       WHITEBOARD RULES
       Saved separately for each period.
       ===================================================== */

    let allWhiteboardRules =
      JSON.parse(
        localStorage.getItem(
          "whiteboardRules"
        ) || "{}"
      );

    function getCurrentPeriod() {
      return document.getElementById("periodSelect").value;
    }

    function getCurrentRules() {
      const period = getCurrentPeriod();
      return Array.isArray(allWhiteboardRules[period])
        ? allWhiteboardRules[period]
        : [];
    }

    function saveWhiteboardRules() {
      const period = getCurrentPeriod();
      allWhiteboardRules[period] = getCurrentRules();
      localStorage.setItem(
        "whiteboardRules",
        JSON.stringify(allWhiteboardRules)
      );
    }

    function openRulesPanel() {
      const panel = document.getElementById("whiteboardRulesPanel");
      panel.style.display =
        panel.style.display === "none" ? "block" : "none";
      updateRuleStudentOptions();
      renderWhiteboardRules();
    }

    function updateRuleStudentOptions() {
      const select = document.getElementById("ruleStudents");
      if (!select) return;

      const students = allPeriodData[getCurrentPeriod()] || [];
      const previous = Array.from(select.selectedOptions).map(o => o.value);
      select.innerHTML = "";

      students.forEach(student => {
        const option = document.createElement("option");
        option.value = student;
        option.textContent = student;
        option.selected = previous.includes(student);
        select.appendChild(option);
      });
    }

    function addWhiteboardRule() {
      const type = document.getElementById("ruleType").value;
      const selected = Array.from(
        document.getElementById("ruleStudents").selectedOptions
      ).map(option => option.value);

      if (selected.length < 2) {
        alert("Select at least two students for a rule.");
        return;
      }

      const rules = getCurrentRules();
      rules.push({
        type,
        students: selected
      });

      const period = getCurrentPeriod();
      allWhiteboardRules[period] = rules;
      saveWhiteboardRules();

      document.getElementById("ruleStudents").selectedIndex = -1;
      renderWhiteboardRules();
    }

    function deleteWhiteboardRule(index) {
      const period = getCurrentPeriod();
      const rules = getCurrentRules();
      rules.splice(index, 1);
      allWhiteboardRules[period] = rules;
      saveWhiteboardRules();
      renderWhiteboardRules();
    }

    function renderWhiteboardRules() {
      const container = document.getElementById("rulesList");
      if (!container) return;

      const rules = getCurrentRules();
      container.innerHTML = "";

      if (rules.length === 0) {
        container.innerHTML = '<div style="color:#777;font-size:13px;">No rules saved for this period.</div>';
        return;
      }

      rules.forEach((rule, index) => {
        const item = document.createElement("div");
        item.className = `rule-item ${rule.type}`;

        const label = document.createElement("span");
        label.textContent =
          (rule.type === "apart" ? "KEEP APART: " : "PUT TOGETHER: ") +
          rule.students.join(", ");

        const button = document.createElement("button");
        button.className = "secondary";
        button.textContent = "Delete";
        button.onclick = () => deleteWhiteboardRule(index);

        item.appendChild(label);
        item.appendChild(button);
        container.appendChild(item);
      });
    }

    function validateWhiteboardRules(activeStudents) {
      const active = new Set(activeStudents.map(s => s.toLowerCase()));
      return getCurrentRules().filter(rule =>
        rule.students.every(student => active.has(student.toLowerCase()))
      );
    }

    function assignStudentsWithWhiteboardRules(
      selectedBoards,
      groupSizes,
      activeStudents
    ) {
      const rules = validateWhiteboardRules(activeStudents);
      const studentByKey = new Map(
        activeStudents.map(student => [student.toLowerCase(), student])
      );

      const parent = new Map();
      activeStudents.forEach(student => parent.set(student.toLowerCase(), student.toLowerCase()));

      function find(x) {
        let root = x;
        while (parent.get(root) !== root) root = parent.get(root);
        while (parent.get(x) !== x) {
          const next = parent.get(x);
          parent.set(x, root);
          x = next;
        }
        return root;
      }

      function union(a, b) {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
      }

      rules.filter(r => r.type === "together").forEach(rule => {
        const first = rule.students[0].toLowerCase();
        for (let i = 1; i < rule.students.length; i++) {
          union(first, rule.students[i].toLowerCase());
        }
      });

      const units = new Map();
      activeStudents.forEach(student => {
        const key = find(student.toLowerCase());
        if (!units.has(key)) units.set(key, []);
        units.get(key).push(student);
      });

      const unitList = Array.from(units.values()).sort((a, b) => b.length - a.length);
      const boardData = selectedBoards.map((board, index) => ({
        board,
        size: groupSizes[index],
        students: []
      }));

      const apartPairs = [];
      rules.filter(r => r.type === "apart").forEach(rule => {
        for (let i = 0; i < rule.students.length; i++) {
          for (let j = i + 1; j < rule.students.length; j++) {
            apartPairs.push([
              rule.students[i].toLowerCase(),
              rule.students[j].toLowerCase()
            ]);
          }
        }
      });

      function violatesApart(unit, existing) {
        const existingKeys = new Set(existing.map(s => s.toLowerCase()));
        return apartPairs.some(([a, b]) => {
          const unitKeys = unit.map(s => s.toLowerCase());
          return unitKeys.some(k => k === a || k === b) &&
            unitKeys.some(k => k === a || k === b) &&
            (unitKeys.includes(a) && (existingKeys.has(b) || unitKeys.includes(b)) ||
             unitKeys.includes(b) && (existingKeys.has(a) || unitKeys.includes(a)));
        });
      }

      function canPlace(unit, target) {
        if (target.students.length + unit.length > target.size) return false;
        return !violatesApart(unit, target.students);
      }

      function search(index) {
        if (index >= unitList.length) return true;

        const unit = unitList[index];
        const order = boardData
          .map((_, i) => i)
          .sort((a, b) => boardData[a].students.length - boardData[b].students.length);

        for (const boardIndex of order) {
          const target = boardData[boardIndex];
          if (!canPlace(unit, target)) continue;

          target.students.push(...unit);
          if (search(index + 1)) return true;
          target.students.splice(target.students.length - unit.length, unit.length);
        }

        return false;
      }

      if (!search(0)) return null;

      const result = {};
      layoutConfig.forEach(board => result[board.id] = []);
      boardData.forEach(entry => {
        result[entry.board.id] = entry.students;
      });
      return result;
    }
