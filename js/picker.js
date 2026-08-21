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

  /*
   * Start the wheel fresh whenever the picker
   * is opened.
   */

  const wheel =
    document.getElementById(
      "studentWheel"
    );

  if (wheel && !wheelSpinning) {

    wheel.style.transition =
      "none";

    wheel.style.transform =
      "rotate(0deg)";

    currentRotation =
      0;

  }

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



  /* =====================================================
     PREPARE FOR NEW SPIN
     
     This is the ONLY time we redraw after a previous
     winner has been removed.
     ===================================================== */

  wheel.style.transition =
    "none";

  wheel.style.transform =
    "rotate(0deg)";

  currentRotation =
    0;


  /*
   * Redraw BEFORE selecting the winner.
   *
   * This means the slice positions and winnerIndex
   * are based on exactly the same wheel.
   */

  drawWheel();



  /* =====================================================
     GET AVAILABLE STUDENTS
     ===================================================== */

  let students =
    getActiveStudents();


  if (noRepeat) {

    students =
      students.filter(
        student =>
          !pickedStudents.includes(
            student
          )
      );

  }



  /* =====================================================
     EVERYONE HAS BEEN PICKED
     ===================================================== */

  if (students.length === 0) {

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



  /* =====================================================
     CHOOSE WINNER BEFORE ANIMATION
     
     The winner is completely determined here.
     Nothing later can change the winner.
     ===================================================== */

  const weights =
    students.map(
      student => {

        const name =
          student.toLowerCase();


        /*
         * Weighted students.
         *
         * These students have a 0.2 weight
         * compared with the normal 1.0 weight.
         */

        if (
          name.includes(
            "alejandro"
          )
        ) {

          return 0.2;

        }


        if (
          name.includes(
            "isaac"
          )
        ) {

          return 0.2;

        }


        if (
          name.includes(
            "adriel"
          )
        ) {

          return 0.2;

        }


        return 1.0;

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


  let winnerIndex =
    0;


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

      winnerIndex =
        i;

      break;

    }

  }



  /* =====================================================
     LOCK IN WINNER
     ===================================================== */

  const selected =
    students[winnerIndex];



  /* =====================================================
     SHOW SPINNING STATUS
     ===================================================== */

  document.getElementById(
    "winnerDisplay"
  ).innerText =
    "Spinning...";


  document.getElementById(
    "wheelStatus"
  ).innerText =
    "Choosing a student...";



  /* =====================================================
     CALCULATE WINNING SLICE
     ===================================================== */

  const slice =
    360 /
    students.length;


  /*
   * Pick a random point INSIDE the winning slice.
   *
   * This prevents the pointer from always landing
   * exactly in the middle and makes the animation
   * look more natural.
   */

  const padding =
    Math.min(
      slice * 0.15,
      8
    );


  const randomInsideSlice =
    padding +
    Math.random() *
    (
      slice -
      padding * 2
    );


  const selectedAngle =
    winnerIndex * slice +
    randomInsideSlice;



  /* =====================================================
     CALCULATE TARGET ROTATION
     ===================================================== */

  const targetAngle =
    360 -
    selectedAngle;


  const currentMod =
    (
      currentRotation % 360 +
      360
    ) % 360;


  /*
   * 6–8 full rotations.
   */

  const extraSpins =
    360 *
    (
      6 +
      Math.floor(
        Math.random() * 3
      )
    );


  let rotationDelta =
    targetAngle -
    currentMod;


  /*
   * Always rotate forward.
   */

  if (
    rotationDelta < 0
  ) {

    rotationDelta +=
      360;

  }


  const finalRotation =
    currentRotation +
    extraSpins +
    rotationDelta;


  /*
   * Save final rotation.
   */

  currentRotation =
    finalRotation;



  /* =====================================================
     START ANIMATION
     ===================================================== */

  wheelSpinning =
    true;


  button.disabled =
    true;

  button.style.opacity =
    "0.6";


  /*
   * Smooth deceleration.
   */

  wheel.style.transition =
    "transform 5.5s cubic-bezier(0.12, 0.78, 0.18, 1)";


  /*
   * Force the browser to recognize the starting
   * position before beginning the animation.
   */

  void wheel.offsetWidth;


  wheel.style.transform =
    `rotate(${finalRotation}deg)`;



  /* =====================================================
     FINISH ANIMATION
     ===================================================== */

  setTimeout(
    () => {

      /*
       * IMPORTANT:
       *
       * Do NOT call drawWheel() here.
       *
       * The wheel must remain exactly where it landed.
       */

      document.getElementById(
        "winnerDisplay"
      ).innerText =
        selected;



      /* =================================================
         ADD WINNER TO NO-REPEAT HISTORY
         ================================================= */

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



      /* =================================================
         UNLOCK CONTROLS
         ================================================= */

      wheelSpinning =
        false;


      button.disabled =
        false;

      button.style.opacity =
        "1";



      /* =================================================
         UPDATE STATUS
         ================================================= */

      if (noRepeat) {

        const remaining =
          students.length - 1;


        document.getElementById(
          "wheelStatus"
        ).innerText =
          `${remaining} student${
            remaining === 1
              ? ""
              : "s"
          } remaining`;

      } else {

        document.getElementById(
          "wheelStatus"
        ).innerText =
          `${students.length} students available`;

      }

    },
    5600
  );

}



/* =====================================================
   RESET PICKS
   ===================================================== */

function resetPickedStudents() {

  pickedStudents = [];


  /*
   * Reset the physical wheel as well.
   */

  const wheel =
    document.getElementById(
      "studentWheel"
    );


  if (wheel) {

    wheel.style.transition =
      "none";

    wheel.style.transform =
      "rotate(0deg)";

  }


  currentRotation =
    0;


  document.getElementById(
    "winnerDisplay"
  ).innerText =
    "No student selected";


  drawWheel();

}
