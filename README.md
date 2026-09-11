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

- **AI assistant** - a Gemini-backed chat for warm-ups, explanations and
  wording help. The API key lives in a tiny Vercel serverless proxy
  (`api/chat.js`), never in the page.

Rosters, rules, pick history and chat history are stored in the browser's
`localStorage`. The only server component is the optional chat proxy.

## Running

Open `index.html` in a browser (or serve the folder with any static server).
No build step or dependencies. The AI chat needs the proxy below; everything
else works without it.

## Deploying the AI chat proxy (Vercel)

The repo is public, so the Gemini key must not be committed. `api/chat.js` is
a Vercel serverless function that reads the key from an environment variable
and forwards chat requests to Gemini.

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. On [vercel.com](https://vercel.com) choose **Add New > Project** and import
   this repository. Framework preset: **Other**; no build command.
3. Under **Environment Variables** add `GEMINI_API_KEY`. Optional:
   `GEMINI_MODEL` (default `gemini-2.5-flash`) and `ALLOWED_ORIGINS`
   (comma-separated origins allowed to call the proxy, e.g.
   `https://bapple51.github.io`).
4. Deploy. Vercel serves the site *and* `/api/chat` from the same URL, so the
   chat works out of the box there.

If you host the page somewhere else (e.g. GitHub Pages), open the chat's
**Settings** and paste the proxy URL
(`https://<your-project>.vercel.app/api/chat`). It is saved in the browser.
Set `ALLOWED_ORIGINS` on Vercel to your page's origin so other sites cannot
use your key through the proxy.

The proxy caps history at 30 messages, 4000 characters per message and 1024
output tokens per reply. It does not send any roster data - only what you
type into the chat.

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
| `js/chat.js` | AI chat UI; talks to the proxy |
| `api/chat.js` | Vercel serverless function proxying to Gemini |
| `js/app.js` | Page bootstrap |

Scripts are plain globals loaded in dependency order; there is no module
system.
