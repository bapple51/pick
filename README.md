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

- **Gemini ✨** - an AI chat with the "Weids" persona (a looksmaxxing-guru
  parody; see `api/weids-prompt.js`). Branded as Gemini in the UI, and the UI
  is deliberately obnoxious about it: a banner, a pulsing floating button, a
  nag toast every 20 seconds, a welcome splash with a 5-second countdown
  before you may "continue without AI" (which really does switch every AI
  feature off for the rest of the browser session - "Turn AI on" in the top
  bar brings it back), an AI consent bar whose two buttons
  both accept, a confirmation before making groups without AI, a permanent
  AI-vs-Legacy scoreboard, a sparkle cursor trail, confetti, a cycling tab
  title, a wobbling watermark, and **✨ Gemini AI Seating**, which
  really does ask Gemini to build the seating chart (student names, board
  sizes and rules are sent). The plan is validated in the browser; if Gemini
  breaks a rule or is unavailable, the legacy algorithm fills in and the
  verdict says so.

Rosters, rules, pick history and chat history are stored in the browser's
`localStorage`. The only server component is the optional chat proxy.

## Running

Open `index.html` in a browser (or serve the folder with any static server).
No build step or dependencies. The AI chat needs the proxy below; everything
else works without it.

## The AI proxy (Vercel)

The site is served from GitHub Pages; the chat calls a proxy baked into
`js/chat.js` (`chatConfig.endpoint`, currently
`https://pick-rose.vercel.app/api/chat`). Users cannot change it. `api/chat.js`
is a Vercel serverless function that reads the Gemini key from an environment
variable and forwards chat requests, with `api/weids-prompt.js` as the system
prompt.

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. On [vercel.com](https://vercel.com) choose **Add New > Project** and import
   this repository. Framework preset: **Other**; no build command.
3. Under **Environment Variables** add `GEMINI_API_KEY`. Optional:
   `GEMINI_MODEL` (tried first; otherwise the proxy walks a cheapest-first
   list - `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite`,
   `gemini-3.5-flash-lite`, `gemini-3.6-flash` - and remembers the first one
   Google accepts for your key) and `ALLOWED_ORIGINS`
   (comma-separated origins allowed to call the proxy, e.g.
   `https://bapple51.github.io`).
4. Deploy, then put the deployment's `/api/chat` URL in `chatConfig.endpoint`
   in `js/chat.js` if it differs from the current one.

Set `ALLOWED_ORIGINS` on Vercel to the Pages origin (e.g.
`https://bapple51.github.io`) so other sites cannot use your key through the
proxy.

The proxy caps chat history at 30 messages, 4000 characters per message and
1024 output tokens per reply. Chat sends only what you type. AI Seating sends
the present students' names, the boards with group sizes, and the active
rules, and gets back the assignment plus a comment.

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
| `js/chat.js` | Gemini chat UI, nag toast, AI Seating |
| `js/obnoxious.js` | Splash, consent bar, legacy confirm, scoreboard, sparkles, confetti |
| `api/chat.js` | Vercel serverless function proxying to Gemini |
| `api/weids-prompt.js` | The system prompt (Weids persona) |
| `js/app.js` | Page bootstrap |

Scripts are plain globals loaded in dependency order; there is no module
system.
