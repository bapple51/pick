/* =====================================================
       CLASS SWITCHER
       ===================================================== */

    const classStorageKey = "selectedClass";

    function switchClass() {
      const classSelect = document.getElementById("classSelect");

      if (!classSelect) {
        return;
      }

      localStorage.setItem(
        classStorageKey,
        classSelect.value
      );
    }

    function loadSelectedClass() {
      const classSelect = document.getElementById("classSelect");

      if (!classSelect) {
        return;
      }

      const savedClass =
        localStorage.getItem(classStorageKey);

      if (savedClass &&
          Array.from(classSelect.options).some(
            option => option.value === savedClass
          )) {
        classSelect.value = savedClass;
      }
    }


    /* =====================================================
       ROOM CONFIGURATION
       ===================================================== */

    const layoutConfig = [

      {
        id: "l-smartboard",
        name: "L Smartboard",
        max: 2,
        class: "l-smartboard"
      },

      {
        id: "r-smartboard",
        name: "R Smartboard",
        max: 2,
        class: "r-smartboard"
      },

      {
        id: "easel",
        name: "Easel",
        max: 3,
        class: "easel"
      },

      {
        id: "casteel",
        name: "Casteel",
        max: 3,
        class: "casteel"
      },

      {
        id: "bird",
        name: "Bird",
        max: 3,
        class: "bird"
      },

      {
        id: "printer",
        name: "Printer",
        max: 3,
        class: "printer"
      },

      {
        id: "sink",
        name: "Sink",
        max: 3,
        class: "sink"
      },

      {
        id: "tv",
        name: "TV",
        max: 3,
        class: "tv"
      },

      {
        id: "thermostat",
        name: "Thermostat",
        max: 3,
        class: "thermostat"
      },

      {
        id: "b6",
        name: "6",
        max: 2,
        class: "b6"
      },

      {
        id: "b5",
        name: "5",
        max: 2,
        class: "b5"
      },

      {
        id: "b4",
        name: "4",
        max: 2,
        class: "b4"
      },

      {
        id: "b3",
        name: "3",
        max: 2,
        class: "b3"
      },

      {
        id: "b2",
        name: "2",
        max: 2,
        class: "b2"
      },

      {
        id: "b1",
        name: "1",
        max: 2,
        class: "b1"
      }

    ];



    /* =====================================================
       PERIOD STORAGE
       ===================================================== */

    let allPeriodData =
      JSON.parse(
        localStorage.getItem(
          "whiteboardRosters"
        ) || "{}"
      );



    /* =====================================================
       SAVE PERIOD
       ===================================================== */

    function savePeriodRoster() {

      const input =
        document.getElementById(
          "studentInput"
        ).value;

      const period =
        document.getElementById(
          "periodSelect"
        ).value;

      const students =
        input
          .split(/\r?\n/)
          .map(
            name => name.trim()
          )
          .filter(
            name =>
              name.length > 0
          );

      if (
        students.length === 0
      ) {

        alert(
          "Please enter some names before saving."
        );

        return;

      }

      allPeriodData[period] =
        students;

      localStorage.setItem(
        "whiteboardRosters",
        JSON.stringify(
          allPeriodData
        )
      );

      loadPeriodRoster();

      pickedStudents = [];

      drawWheel();

    }



    /* =====================================================
       LOAD PERIOD
       ===================================================== */

    function loadPeriodRoster() {

      const period =
        document.getElementById(
          "periodSelect"
        ).value;

      const rosterSection =
        document.getElementById(
          "rosterSection"
        );

      const rosterList =
        document.getElementById(
          "rosterList"
        );

      const textarea =
        document.getElementById(
          "studentInput"
        );

      const students =
        allPeriodData[period] || [];

      rosterList.innerHTML = "";

      if (
        students.length === 0
      ) {

        textarea.value = "";

        rosterSection.style.display =
          "none";

        pickedStudents = [];

        updateRuleStudentOptions();
        renderWhiteboardRules();
        drawWheel();

        return;

      }

      textarea.value =
        students.join("\n");

      updateRuleStudentOptions();
      renderWhiteboardRules();

      rosterSection.style.display =
        "block";

      students.forEach(
        (student, index) => {

          const item =
            document.createElement(
              "div"
            );

          item.className =
            "roster-item";

          const checkbox =
            document.createElement(
              "input"
            );

          checkbox.type =
            "checkbox";

          checkbox.checked =
            true;

          checkbox.value =
            student;

          checkbox.id =
            `student-period-{index}`;

          checkbox.addEventListener(
            "change",
            drawWheel
          );

          const label =
            document.createElement(
              "label"
            );

          label.htmlFor =
            checkbox.id;

          label.textContent =
            student;

          item.appendChild(
            checkbox
          );

          item.appendChild(
            label
          );

          rosterList.appendChild(
            item
          );

        }
      );

      drawWheel();

    }
