# Classroom Helper

A single-page, no-build classroom tool for teachers:

- **Whiteboard group splitter** – paste a roster, mark absentees, and get
  students randomly assigned to the whiteboards around the room. Groups are
  drawn on a grid that mirrors the physical layout and can be adjusted by
  drag-and-drop, then copied to the clipboard.
- **Whiteboard rules** – per-period "keep apart" / "put together" rules that
  the splitter honours.
- **Random student picker** – a spinning wheel that picks a student, with an
  optional no-repeat mode that remembers who has already been called on.

Everything is stored in the browser's `localStorage`; there is no server.

## Running

Open `index.html` in a browser. No build step or dependencies.

## Usage

1. Choose a period, paste names (one per line) and click **Save to Period**.
   Duplicate names are dropped automatically.
2. Untick any absent students. If you edit the textarea after saving, the
   typed names are used until you save again (a hint appears when this is
   the case).
3. Click **Make Groups**. Boards are filled in priority order (MAX-2 boards
   first) using as many boards as possible. **Override capacity** lets groups
   grow beyond a board's normal maximum when the class is too big.
4. Drag names between boards to fine-tune, then **Copy Groups** to paste the
   arrangement elsewhere.
5. **Whiteboard Rules** opens a panel for keep-apart / put-together rules.
   Rules referencing students no longer on the roster are shown greyed out
   and ignored.
6. **Pick Random Student** opens the wheel. With **Don't Repeat** on, picked
   students are removed from the wheel and listed under it; the list is
   remembered per period across page reloads. **Reset Picks** clears it.

## Configuration

- `js/storage.js` – `layoutConfig` defines the boards (id, display name,
  capacity, CSS grid class). Board positions live in `css/styles.css` under
  "ROOM POSITIONS".
- `js/picker.js` – `pickWeights` optionally lowers the odds of specific
  students being picked. Empty the object for equal odds.
- `js/seating.js` – `easterEgg` controls the image that occasionally flashes
  after **Make Groups** (default: 1-in-15 chance, 1 second, click to dismiss). It never
  triggers within 10 seconds of the previous click, so spamming the button
  won't reveal it.
  Place the image at `img/chad-potential.png`; set `chance` to `0` to disable.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the controls, room grid and picker modal |
| `css/styles.css` | All styling, including the room grid layout |
| `js/storage.js` | Room config, localStorage helpers, period rosters |
| `js/rules.js` | Whiteboard rules UI and the rule-aware group assignment |
| `js/seating.js` | Board selection, group sizing, rendering, drag-and-drop |
| `js/picker.js` | Wheel drawing, spinning, pick history |
| `js/app.js` | Page bootstrap |

Scripts are plain globals loaded in dependency order; there is no module
system.
