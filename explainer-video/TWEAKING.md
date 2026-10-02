# How to tweak this video

Everything in this video is code: the visuals are web pages (one per scene) and the music is a small script (`music/compose.mjs`). You can change things three ways: click around in **HyperFrames Studio**, edit the files in any text editor, or ask Claude.

## Setup

### In your browser, with GitHub Codespaces (no download)

1. Open [this link](https://codespaces.new/eladsch1987/ForClaudeCredits?ref=ccr-f1f2de7d-e8txg3) (it picks the right branch) and click **Create codespace**.
2. The first time takes a few minutes: it installs Node.js, FFmpeg and a rendering browser. Watch the progress in the terminal at the bottom.
3. Studio starts by itself and opens in a new browser tab. If the tab doesn't open, go to the **Ports** tab at the bottom and click the globe icon next to **HyperFrames Studio (3002)**. If your browser blocks the pop-up, allow it.
4. If Studio isn't running (for example after a restart), type this in the terminal: `cd explainer-video && npm run studio`

**Saving your work:** Studio writes your edits into the files inside the codespace. To keep them in GitHub (and let Claude see them), click the **Source Control** icon on the left (the branching icon), type a short note like "changed colors", click **Commit**, then **Sync Changes**.

**Cost:** free personal GitHub accounts include 120 core-hours a month (about 60 hours on the default 2-core machine) and 15 GB of storage. A codespace stops itself after 30 minutes of inactivity. When you're finished for good, delete it at [github.com/codespaces](https://github.com/codespaces) so it stops using storage.

### On your own computer

Install **Node.js 22+** and **FFmpeg** (both free), download this repo, and open a terminal in the `explainer-video` folder.

```bash
npx hyperframes preview     # opens Studio in your browser
npx hyperframes check       # catches mistakes (overlapping text, low contrast…)
npx hyperframes render -q high -o renders/make-videos-with-code.mp4   # export the MP4
node music/compose.mjs      # rebuild the music after changing it
```

## Option 1: edit visually in Studio

Open Studio (in a codespace it opens by itself; on your computer run `npx hyperframes preview`):

- **Timeline (bottom):** one block per scene (Hook, Idea, Tools, How, Music, Tweak, Skills, Outro), plus the progress bar and the music. Drag a block to move a scene, drag its edge to make it longer or shorter, or click the eye icon to hide it. The colored wipe between scenes is part of each scene, so it moves along.
- **Canvas (middle):** click an element to select it, then change it in the **Design** panel on the right.
- **Variables tab (right):** change the color palette for the whole video. Open the Hook or Outro scene to change the opening headline or the final line.
- **Compositions (left):** open a single scene on its own, so you can focus on it.
- **Code tab:** edit the files directly inside Studio.
- **Export (top right):** render the MP4.

Studio saves your changes into the files. A few things are drawn by the scene's script, not written as plain HTML, so the Design panel may not change them. That includes the floating decoration shapes, the confetti, the equalizer bars, and the word-by-word animated headlines. Change those in the scene's file (Option 2).

The music doesn't move when you move scenes, because its build-ups and drops are timed to the original cuts. If you retime scenes a lot, ask Claude to re-time the music too.

## Option 2: edit the files

| I want to… | Edit this |
|---|---|
| Change any text | Find the sentence in `compositions/<scene>.html` and retype it. |
| Change the colors | The `default` hex values at the top of `index.html` (`violet`, `pink`, `yellow`, …). |
| Change the opening headline / final line | `headline` at the top of `compositions/hook.html`, `cta` at the top of `compositions/outro.html`. |
| Change text sizes or fonts | `assets/shared.css` (`.mega`, `.title`, `.lead`, …) for all scenes, or the `<style>` block inside one scene's file for just that scene. |
| Move / recolor / resize a decoration shape | The `HF.shapes(...)` list in that scene's file: `["circle", 12, 22, 150, "var(--pink)", 0]` means type, left %, top %, size in px, color, rotation. |
| Change animation timing in a scene | The last number in each `tl.fromTo(...)` line is the time in seconds from the start of that scene. |
| Move, shorten or lengthen a scene | `data-start` / `data-duration` on its slot in `index.html` (or drag it in Studio). |
| Make the music faster / slower | `BPM` in `music/compose.mjs` **and** `BEAT` in `assets/motion.js` (BEAT = 60 / BPM), then `node music/compose.mjs`. |
| Change the melody or chords | `MELODY` / `CHORDS` in `music/compose.mjs` (MIDI note numbers: 60 = middle C). |
| Turn instruments on/off per section | `layersFor()` in `music/compose.mjs`. |

If `npx hyperframes preview` is running, Studio refreshes every time you save a file.

## Option 3: ask Claude

Open this repo in Claude Code and describe the change in plain words:

- "Make the title bigger and the background darker"
- "Replace the toolkit scene with three tips about lighting"
- "Make the music calmer, like lo-fi"
- "Make a 9:16 vertical version for Reels"

Claude edits the files, runs `npx hyperframes check`, and re-renders.

## What's in here

```
explainer-video/
├── index.html              ← the timeline: scene order + timing, music, color palette
├── compositions/           ← one file per scene: text, layout and animation
│   ├── hook.html  idea.html  tools.html  how.html
│   ├── music.html tweak.html skills.html outro.html
│   └── progress.html       ← the thin progress bar along the bottom
├── assets/
│   ├── shared.css          ← fonts, text styles, shapes, wipes (used by every scene)
│   ├── motion.js           ← animation helpers every scene uses
│   ├── music.mp3           ← generated by music/compose.mjs
│   ├── fonts/              ← Poppins + JetBrains Mono (free, SIL Open Font License)
│   └── vendor/gsap.min.js  ← GSAP animation library (free)
├── music/compose.mjs       ← the synthesizer that writes the soundtrack
├── renders/                ← the finished MP4
├── CLAUDE.md / AGENTS.md   ← instructions HyperFrames gives AI coding agents
└── hyperframes.json        ← project settings
```

## Scene map (60 s, 120 BPM: one bar = 2 s)

| Time | Scene file | What's on screen | Music |
|---|---|---|---|
| 0–6 s | `hook.html` | "Make videos with code?" | Beat + plucks, build-up, drop at 6 s |
| 6–14 s | `idea.html` | A video is a web page that moves | Full groove |
| 14–22 s | `tools.html` | Free tools (HyperFrames, Remotion, Chrome + FFmpeg) | Full groove + melody |
| 22–32 s | `how.html` | How it works, in 4 steps | Full groove + melody |
| 32–40 s | `music.html` | Even the music is code | Drums → + bass → + chords → + melody |
| 40–50 s | `tweak.html` | Tweak anything | Full groove |
| 50–56 s | `skills.html` | Skills you need | Groove, build-up at 54 s |
| 56–60 s | `outro.html` | Your turn | Final drop + ending hit |

## Costs

All of this is free and runs on your own computer (or a Claude Code cloud session). There are no API keys, paid AI generators, or stock music. HyperFrames also offers paid extras like cloud rendering and HeyGen voices; this project doesn't use them.
