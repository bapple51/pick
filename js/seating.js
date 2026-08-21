/* =====================================================
       CREATE BOARD HTML
       ===================================================== */

    function createBoardHtml(
      cell,
      students = []
    ) {

      let html = `

        <div
          id="board-${cell.id}"
          class="board ${cell.class}"
          data-max="${cell.max}"
        >

          <h3>
            ${escapeHtml(cell.name)}

            <span class="limit">
              (MAX ${cell.max})
            </span>
          </h3>

          <ul
            id="list-${cell.id}"
            ondragover="allowDrop(event)"
            ondragleave="dragLeave(event)"
            ondrop="drop(event)"
          >

      `;

      students.forEach(
        (student, index) => {

          const uniqueId =
            `student-cell.id-{index}-${Math.random()
              .toString(36)
              .substring(2, 8)}`;

          html += `

            <li
              id="${uniqueId}"
              draggable="true"
              ondragstart="drag(event)"
            >
              ${escapeHtml(student)}
            </li>

          `;

        }
      );

      html += `

          </ul>

        </div>

      `;

      return html;

    }



    /* =====================================================
       EMPTY ROOM
       ===================================================== */

    function renderEmptyLayout() {

      const results =
        document.getElementById(
          "results"
        );

      let html = `

        <div class="card">

          <h3>
            Room Layout Grouping:
          </h3>

          <div class="classroom-grid">

      `;

      layoutConfig.forEach(
        cell => {

          html +=
            createBoardHtml(
              cell
            );

        }
      );

      html += `

          </div>

        </div>

      `;

      results.innerHTML =
        html;

    }



    /* =====================================================
       FIND BOARD COMBINATIONS
       ===================================================== */

    function getBoardCombinations(
      boards,
      count
    ) {

      const results = [];

      function generate(
        start,
        current
      ) {

        if (
          current.length ===
          count
        ) {

          results.push(
            [...current]
          );

          return;

        }

        for (
          let i = start;
          i < boards.length;
          i++
        ) {

          current.push(
            boards[i]
          );

          generate(
            i + 1,
            current
          );

          current.pop();

        }

      }

      generate(0, []);

      return results;

    }



    /* =====================================================
       SPLIT GROUPS
       ===================================================== */

    function splitGroups() {
    
      document.getElementById("errorMsg").innerText = "";
    
      const activeStudents = getActiveStudents();
      const studentCount = activeStudents.length;
    
      const override =
        document.getElementById("overrideCapacity").checked;
    
      if (studentCount < 2) {
        document.getElementById("errorMsg").innerText =
          "You need at least 2 students to make a group.";
    
        return;
      }

    
    
      /* =====================================================
         BOARD PRIORITY
    
         MAX 2 boards first.
         MAX 3 boards second.
         ===================================================== */
    
      const max2Boards =
        layoutConfig.filter(
          board => board.max === 2
        );
    
      const max3Boards =
        layoutConfig.filter(
          board => board.max === 3
        );
    
      const prioritizedBoards = [
        ...max2Boards,
        ...max3Boards
      ];

    
    
      /* =====================================================
         NORMAL MODE
         ===================================================== */
    
      if (!override) {
    
        /*
         * We want to use AS MANY BOARDS AS POSSIBLE.
         *
         * A board requires at least 2 students.
         *
         * Therefore:
         *
         * maximum possible groups =
         * floor(students / 2)
         *
         * but we cannot exceed the number of boards.
         */
    
        let groupCount =
          Math.min(
            Math.floor(studentCount / 2),
            prioritizedBoards.length
          );
    
    
        /*
         * Find the largest number of groups that
         * can actually hold everyone.
         *
         * Start with the maximum and decrease
         * only if necessary.
         */
    
        let selectedBoards = null;
    
        while (
          groupCount >= 1
        ) {
    
          /*
           * Try using the first boards in priority order.
           *
           * MAX 2 boards come first.
           */
    
          const boards =
            prioritizedBoards.slice(
              0,
              groupCount
            );
    
    
          const minimumCapacity =
            groupCount * 2;
    
    
          const maximumCapacity =
            boards.reduce(
              (total, board) =>
                total + board.max,
              0
            );
    
    
          /*
           * Can these boards hold everyone?
           */
    
          if (
            studentCount >= minimumCapacity &&
            studentCount <= maximumCapacity
          ) {
    
            selectedBoards = boards;
    
            break;
          }
    
    
          /*
           * If not, use one fewer group.
           */
    
          groupCount--;
    
        }
    
    
        /*
         * If the priority boards couldn't make
         * the arrangement work, search for another
         * valid combination with the SAME group count.
         */
    
        if (!selectedBoards) {
    
          groupCount =
            Math.min(
              Math.floor(studentCount / 2),
              prioritizedBoards.length
            );
    
    
          while (
            groupCount >= 1 &&
            !selectedBoards
          ) {
    
            const combinations =
              getBoardCombinations(
                prioritizedBoards,
                groupCount
              );
    
    
            /*
             * Sort combinations so ones containing
             * more MAX-2 boards are preferred.
             */
    
            combinations.sort(
              (a, b) => {
    
                const aMax2 =
                  a.filter(
                    board => board.max === 2
                  ).length;
    
                const bMax2 =
                  b.filter(
                    board => board.max === 2
                  ).length;
    
                return bMax2 - aMax2;
    
              }
            );
    
    
            for (
              const combination of combinations
            ) {
    
              const capacity =
                combination.reduce(
                  (total, board) =>
                    total + board.max,
                  0
                );
    
    
              if (
                studentCount >= groupCount * 2 &&
                studentCount <= capacity
              ) {
    
                selectedBoards =
                  combination.sort(
                    (a, b) =>
                      prioritizedBoards.indexOf(a) -
                      prioritizedBoards.indexOf(b)
                  );
    
                break;
              }
    
            }
    
    
            if (!selectedBoards) {
              groupCount--;
            }
    
          }
    
        }
    
    
        /*
         * No valid arrangement.
         */
    
        if (!selectedBoards) {
    
          const totalCapacity =
            prioritizedBoards.reduce(
              (total, board) =>
                total + board.max,
              0
            );
    
    
          document.getElementById(
            "errorMsg"
          ).innerText =
            `Cannot fit ${studentCount} students. ` +
            `The room has ${totalCapacity} total seats. ` +
            `Enable "Override capacity" to continue.`;
    
          return;
        }

    
    
        /* =====================================================
           SHUFFLE STUDENTS
           ===================================================== */
    
        const students =
          shuffle(activeStudents);

    
    
        /* =====================================================
           INITIAL GROUP SIZES
           
           Every group starts with 2.
           ===================================================== */
    
        const groupSizes =
          new Array(
            selectedBoards.length
          ).fill(2);
    
    
        let remaining =
          studentCount -
          selectedBoards.length * 2;

    
    
        /* =====================================================
           FILL MAX-3 BOARDS TO 3
           
           MAX-2 boards stay at 2.
           
           This gives results like:
           
           12:
           2 + 2 + 2 + 2 + 2 + 2
           
           13:
           2 + 2 + 2 + 2 + 2 + 2 + 3
           
           33:
           2 + 2 + 2 + 2 + 2 + 2
           + 3 + 3 + 3 + 3 + 3 + 3 + 3 + 3 + 3
           ===================================================== */
    
        for (
          let i = 0;
          i < selectedBoards.length &&
          remaining > 0;
          i++
        ) {
    
          if (
            selectedBoards[i].max >= 3
          ) {
    
            groupSizes[i] = 3;
    
            remaining--;
    
          }
    
        }

    
    
        /* =====================================================
           EXTRA CAPACITY
           
           This is mainly a safety fallback for future boards
           with MAX values greater than 3.
           ===================================================== */
    
        while (
          remaining > 0
        ) {
    
          let added = false;
    
    
          for (
            let i = 0;
            i < selectedBoards.length;
            i++
          ) {
    
            if (
              groupSizes[i] <
              selectedBoards[i].max
            ) {
    
              groupSizes[i]++;
    
              remaining--;
    
              added = true;
    
    
              if (
                remaining === 0
              ) {
                break;
              }
    
            }
    
          }
    
    
          /*
           * Prevent infinite loops.
           */
    
          if (!added) {
            break;
          }
    
        }

    
    
        /* =====================================================
           ASSIGN STUDENTS WITH SAVED WHITEBOARD RULES
           ===================================================== */

        const boardsData =
          assignStudentsWithWhiteboardRules(
            selectedBoards,
            groupSizes,
            students
          );

        if (!boardsData) {
          document.getElementById("errorMsg").innerText =
            "The saved whiteboard rules cannot be satisfied with the available group sizes. Remove or change a rule and try again.";
          return;
        }

        renderGroups(
          boardsData
        );

        return;
      }

    
    
      /* =====================================================
         OVERRIDE MODE
         
         Override also tries to maximize the number
         of used groups.
         ===================================================== */
    
      const students =
        shuffle(activeStudents);
    
    
      /*
       * Maximum possible groups based on 2 per group.
       */
    
      let groupCount =
        Math.min(
          Math.floor(studentCount / 2),
          prioritizedBoards.length
        );
    
    
      /*
       * Select the highest-priority boards.
       */
    
      const selectedBoards =
        prioritizedBoards.slice(
          0,
          groupCount
        );
    
    
      /*
       * Start every group with 2.
       */
    
      const groupSizes =
        new Array(
          groupCount
        ).fill(2);
    
    
      let remaining =
        studentCount -
        groupCount * 2;
    
    
      /*
       * Fill MAX-3 boards to 3 first.
       */
    
      for (
        let i = 0;
        i < groupCount &&
        remaining > 0;
        i++
      ) {
    
        if (
          selectedBoards[i].max >= 3
        ) {
    
          groupSizes[i]++;
    
          remaining--;
    
        }
    
      }
    
    
      /*
       * Override allows additional students
       * beyond the normal MAX.
       *
       * Distribute them evenly.
       */
    
      let position = 0;
    
    
      while (
        remaining > 0
      ) {
    
        groupSizes[position]++;
    
        remaining--;
    
        position++;
    
    
        if (
          position >= groupCount
        ) {
    
          position = 0;
    
        }
    
      }

    
    
      /* =====================================================
         ASSIGN STUDENTS WITH SAVED WHITEBOARD RULES
         ===================================================== */

      const boardsData =
        assignStudentsWithWhiteboardRules(
          selectedBoards,
          groupSizes,
          students
        );

      if (!boardsData) {
        document.getElementById("errorMsg").innerText =
          "The saved whiteboard rules cannot be satisfied with the available group sizes. Remove or change a rule and try again.";
        return;
      }

      renderGroups(
        boardsData
      );
    }


    /* =====================================================
       RENDER GROUPS
       ===================================================== */

    function renderGroups(
      boardsData
    ) {

      let html = `

        <div class="card">

          <h3>
            Room Layout Grouping:
          </h3>

          <div class="classroom-grid">

      `;

      layoutConfig.forEach(
        cell => {

          html +=
            createBoardHtml(
              cell,
              boardsData[
                cell.id
              ] || []
            );

        }
      );

      html += `

          </div>

        </div>

      `;

      document.getElementById(
        "results"
      ).innerHTML =
        html;

      checkAllLimits();

    }



    /* =====================================================
       DRAG
       ===================================================== */

    function drag(ev) {

      ev.dataTransfer.setData(
        "text/plain",
        ev.target.id
      );

      ev.dataTransfer.effectAllowed =
        "move";

    }



    /* =====================================================
       ALLOW DROP
       ===================================================== */

    function allowDrop(ev) {

      ev.preventDefault();

      const board =
        ev.target.closest(
          ".board"
        );

      if (!board) {
        return;
      }

      board.classList.add(
        "drag-over"
      );

    }



    /* =====================================================
       DRAG LEAVE
       ===================================================== */

    function dragLeave(ev) {

      const board =
        ev.target.closest(
          ".board"
        );

      if (board) {

        board.classList.remove(
          "drag-over"
        );

      }

    }



    /* =====================================================
       DROP
       ===================================================== */

    function drop(ev) {

      ev.preventDefault();

      const board =
        ev.target.closest(
          ".board"
        );

      if (!board) {
        return;
      }

      board.classList.remove(
        "drag-over"
      );

      const studentId =
        ev.dataTransfer.getData(
          "text/plain"
        );

      const student =
        document.getElementById(
          studentId
        );

      if (!student) {
        return;
      }

      const list =
        board.querySelector(
          "ul"
        );

      const max =
        parseInt(
          board.dataset.max,
          10
        );

      const currentCount =
        list.querySelectorAll(
          "li"
        ).length;

      const override =
        document.getElementById(
          "overrideCapacity"
        ).checked;

      if (
        !override &&
        student.parentElement !== list &&
        currentCount >= max
      ) {

        board.classList.remove(
          "over-limit"
        );

        return;

      }

      list.appendChild(
        student
      );

      checkAllLimits();

    }



    /* =====================================================
       CHECK BOARD LIMITS
       ===================================================== */

    function checkAllLimits() {

      document
        .querySelectorAll(
          ".board"
        )
        .forEach(
          board => {

            const max =
              parseInt(
                board.dataset.max,
                10
              );

            const currentCount =
              board.querySelectorAll(
                "ul li"
              ).length;

            if (
              currentCount > max
            ) {

              board.classList.add(
                "over-limit"
              );

            } else {

              board.classList.remove(
                "over-limit"
              );

            }

          }
        );

    }
