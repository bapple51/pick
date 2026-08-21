/* =====================================================
       WHEEL STATE
       ===================================================== */

    let pickedStudents = [];

    let currentRotation = 0;

    let wheelSpinning = false;



    /* =====================================================
       PAGE LOAD
       ===================================================== */

    window.onload = function() {

      loadSelectedClass();
      loadPeriodRoster();

      renderEmptyLayout();

      drawWheel();

    };



    /* =====================================================
       OPEN MODAL
       ===================================================== */

    function openPickerModal() {

      const modal =
        document.getElementById(
          "pickerModal"
        );

      modal.classList.add(
        "open"
      );

      drawWheel();

      document.body.style.overflow =
        "hidden";

    }



    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    function closePickerModal() {

      if (wheelSpinning) {
        return;
      }

      const modal =
        document.getElementById(
          "pickerModal"
        );

      modal.classList.remove(
        "open"
      );

      document.body.style.overflow =
        "";

    }



    /* =====================================================
       CLICK OUTSIDE MODAL
       ===================================================== */

    function handleModalBackgroundClick(
      event
    ) {

      if (
        event.target.id ===
        "pickerModal"
      ) {

        closePickerModal();

      }

    }



    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    document.addEventListener(
      "keydown",
      function(event) {

        if (
          event.key === "Escape"
        ) {

          closePickerModal();

        }

      }
    );



    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHtml(text) {

      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    }



    /* =====================================================
       SHUFFLE
       ===================================================== */

    function shuffle(array) {

      const copy = [...array];

      for (
        let i = copy.length - 1;
        i > 0;
        i--
      ) {

        const j =
          Math.floor(
            Math.random() *
            (i + 1)
          );

        [
          copy[i],
          copy[j]
        ] = [
          copy[j],
          copy[i]
        ];

      }

      return copy;

    }



    /* =====================================================
       GET ACTIVE STUDENTS
       ===================================================== */

    function getActiveStudents() {

      let students = [];

      const rosterSection =
        document.getElementById(
          "rosterSection"
        );

      if (
        rosterSection.style.display ===
        "block"
      ) {

        document
          .querySelectorAll(
            "#rosterList input[type='checkbox']"
          )
          .forEach(
            checkbox => {

              if (checkbox.checked) {

                students.push(
                  checkbox.value
                );

              }

            }
          );

      } else {

        students =
          document
            .getElementById(
              "studentInput"
            )
            .value
            .split(/\r?\n/)
            .map(
              name => name.trim()
            )
            .filter(
              name =>
                name.length > 0
            );

      }

      return students;

    }



    /* =====================================================
       DRAW WHEEL
       ===================================================== */

    function drawWheel() {
    
      const canvas =
        document.getElementById(
          "studentWheel"
        );
    
      if (!canvas) {
        return;
      }
    
      const ctx =
        canvas.getContext(
          "2d"
        );
    
      const noRepeat =
        document.getElementById(
          "noRepeat"
        ).checked;
    
      let students =
        getActiveStudents();
    
    
      /*
       * Remove students who have already
       * been picked when no-repeat is enabled.
       */
    
      if (noRepeat) {
    
        students =
          students.filter(
            student =>
              !pickedStudents.includes(
                student
              )
          );
    
      }
    
    
      const center =
        canvas.width / 2;
    
      const radius =
        canvas.width / 2 - 8;
    
    
      /*
       * Clear the wheel.
       */
    
      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

    
    
      /* =================================================
         NO STUDENTS
         ================================================= */
    
      if (
        students.length === 0
      ) {
    
        ctx.beginPath();
    
        ctx.arc(
          center,
          center,
          radius,
          0,
          Math.PI * 2
        );
    
        ctx.fillStyle =
          "#eeeeee";
    
        ctx.fill();
    
        ctx.strokeStyle =
          "#999";
    
        ctx.lineWidth = 4;
    
        ctx.stroke();
    
        ctx.fillStyle =
          "#666";
    
        ctx.font =
          "bold 24px Arial";
    
        ctx.textAlign =
          "center";
    
        ctx.textBaseline =
          "middle";
    
        ctx.fillText(
          "No students",
          center,
          center
        );
    
    
        document.getElementById(
          "wheelStatus"
        ).innerText =
          "Add students to create the wheel.";
    
        return;
      }

    
    
      /* =================================================
         CALCULATE SLICES
         ================================================= */
    
      const slice =
        (Math.PI * 2) /
        students.length;
    
    
      /*
       * Start at the top.
       */
    
      const startOffset =
        -Math.PI / 2;

    
    
      /* =================================================
         DRAW STUDENTS
         ================================================= */
    
      students.forEach(
        (student, index) => {
    
          const start =
            startOffset +
            index * slice;
    
          const end =
            start + slice;
    
    
          /*
           * Generate a different color
           * for each slice.
           */
    
          const hue =
            (index * 47) % 360;
    
    
          ctx.beginPath();
    
          ctx.moveTo(
            center,
            center
          );
    
          ctx.arc(
            center,
            center,
            radius,
            start,
            end
          );
    
          ctx.closePath();
    
    
          ctx.fillStyle =
            `hsl(${hue}, 75%, 72%)`;
    
          ctx.fill();
    
    
          ctx.strokeStyle =
            "#ffffff";
    
          ctx.lineWidth = 3;
    
          ctx.stroke();

    
    
          /* =================================================
             STUDENT NAME
             ================================================= */
    
          ctx.save();
    
          ctx.translate(
            center,
            center
          );
    
    
          const middle =
            start +
            slice / 2;
    
    
          ctx.rotate(
            middle
          );
    
    
          ctx.fillStyle =
            "#222";
    
    
          /*
           * Smaller text when there are
           * lots of students.
           */
    
          ctx.font =
            students.length > 25
              ? "10px Arial"
              : students.length > 15
                ? "12px Arial"
                : "14px Arial";
    
    
          ctx.textAlign =
            "right";
    
          ctx.textBaseline =
            "middle";
    
    
          /*
           * Prevent very long names
           * from overflowing.
           */
    
          let displayName =
            student;
    
    
          if (
            displayName.length > 18
          ) {
    
            displayName =
              displayName.substring(
                0,
                17
              ) + "…";
    
          }
    
    
          ctx.fillText(
            displayName,
            radius - 15,
            0
          );
    
    
          ctx.restore();
    
        }
      );

    
    
      /* =================================================
         CENTER CIRCLE
         ================================================= */
    
      ctx.beginPath();
    
      ctx.arc(
        center,
        center,
        35,
        0,
        Math.PI * 2
      );
    
    
      ctx.fillStyle =
        "#ffffff";
    
      ctx.fill();
    
    
      ctx.strokeStyle =
        "#444";
    
      ctx.lineWidth = 3;
    
      ctx.stroke();
    
    
      ctx.fillStyle =
        "#333";
    
      ctx.font =
        "bold 14px Arial";
    
      ctx.textAlign =
        "center";
    
      ctx.textBaseline =
        "middle";
    
    
      ctx.fillText(
        "SPIN",
        center,
        center
      );

    
    
      /* =================================================
         STATUS
         ================================================= */
    
      document.getElementById(
        "wheelStatus"
      ).innerText =
        `${students.length} student${
          students.length === 1
            ? ""
            : "s"
        } available`;
    
    }



    /* =====================================================
       SPIN WHEEL
       ===================================================== */

    function spinWheel() {

      if (wheelSpinning) {
        return;
      }


      const wheel =
        document.getElementById(
          "studentWheel"
        );

      const button =
        document.getElementById(
          "spinButton"
        );

      const noRepeat =
        document.getElementById(
          "noRepeat"
        ).checked;


      let students =
        getActiveStudents();



      /* ================================================
         REMOVE PREVIOUS PICKS
         ================================================ */

      if (noRepeat) {

        students =
          students.filter(
            student =>
              !pickedStudents.includes(
                student
              )
          );

      }



      /* ================================================
         EVERYONE HAS BEEN PICKED
         ================================================ */

      if (
        students.length === 0
      ) {

        document.getElementById(
          "winnerDisplay"
        ).innerText =
          "Everyone has been picked.";

        document.getElementById(
          "wheelStatus"
        ).innerText =
          "Press Reset Picks to start again.";

        return;

      }



      /* ================================================
         RANDOM SELECTION
         ================================================ */

      const weights =
        students.map(
          student => {

            if (
              student
                .toLowerCase()
                .includes("alejandro")
            ) {

              return 0.2;

            }

            return 1.00;

          }
        );


      const totalWeight =
        weights.reduce(
          (total, weight) =>
            total + weight,
          0
        );


      let randomValue =
        Math.random() *
        totalWeight;


      let winnerIndex = 0;


      for (
        let i = 0;
        i < students.length;
        i++
      ) {

        randomValue -=
          weights[i];

        if (
          randomValue <= 0
        ) {

          winnerIndex = i;

          break;

        }

      }



      /* ================================================
         WHEEL ROTATION
         ================================================ */

      const slice =
        360 /
        students.length;


      const selectedCenter =
        winnerIndex * slice +
        slice / 2;


      const extraSpins =
        360 * (
          6 +
          Math.floor(
            Math.random() * 3
          )
        );


      const currentMod =
        (
          (
            currentRotation %
            360
          ) + 360
        ) % 360;


      const desiredRotation =
        extraSpins +
        (360 - selectedCenter);


      currentRotation +=
        desiredRotation -
        currentMod;


      wheelSpinning =
        true;


      button.disabled =
        true;

      button.style.opacity =
        "0.6";


      wheel.style.transition =
        "transform 5s cubic-bezier(0.15, 0.9, 0.2, 1)";


      wheel.style.transform =
        `rotate(${currentRotation}deg)`;


      document.getElementById(
        "winnerDisplay"
      ).innerText =
        "Spinning...";


      document.getElementById(
        "wheelStatus"
      ).innerText =
        "Choosing a student...";



      /* ================================================
         FINISH ANIMATION
         ================================================ */

      setTimeout(
        () => {

          const selected =
            students[winnerIndex];


          document.getElementById(
            "winnerDisplay"
          ).innerText =
            selected;



          /* ==========================================
             ADD TO NO-REPEAT HISTORY
             ========================================== */

          if (
            noRepeat &&
            !pickedStudents.includes(
              selected
            )
          ) {

            pickedStudents.push(
              selected
            );

          }


          wheelSpinning =
            false;


          button.disabled =
            false;

          button.style.opacity =
            "1";


          drawWheel();

        },
        5100
      );

    }



    /* =====================================================
       RESET PICKS
       ===================================================== */

    function resetPickedStudents() {

      pickedStudents = [];

      document.getElementById(
        "winnerDisplay"
      ).innerText =
        "No student selected";

      drawWheel();

    }
