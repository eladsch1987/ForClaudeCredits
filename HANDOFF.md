# Handoff: where this project stands

_Last updated: 2026-10-02. Work branch: `ccr-f1f2de7d-e8txg3` (not merged to main; no PR opened)._

## About the owner

- Makes motion-graphics videos for clients with Claude and wants to do small
  tweaks **by hand in HyperFrames Studio**, not only by prompting.
  Follow the Studio-editability rules in `CLAUDE.md` for every video.
- **No paid services.** Don't use ElevenLabs, Dreamina, HeyGen cloud rendering
  or any paid API, even though the owner has some of those accounts. Free/open-source
  tools only; the only cost should be Claude usage.
- Not a developer. Explain in plain language, step by step, and say what to click.
- Edits in the browser via **GitHub Codespaces** (no local install). Open link:
  https://codespaces.new/eladsch1987/ForClaudeCredits?ref=ccr-f1f2de7d-e8txg3
  Studio starts there automatically (`.devcontainer/`). Their edits come back to
  GitHub when they commit + "Sync Changes"; pull before working on their changes.

## What's built

`explainer-video/`: a 60 s, 16:9, English "Make videos with code" explainer
(bold & colorful style, music + on-screen text, no voiceover), rendered to
`explainer-video/renders/make-videos-with-code.mp4`.

- **HyperFrames** (Apache 2.0) + GSAP, CLI pinned to `hyperframes@0.8.111`.
- `index.html` is a thin timeline (scene slots, music, color-palette variables).
  One file per scene in `compositions/` (hook, idea, tools, how, music, tweak,
  skills, outro) plus `progress.html`.
- `assets/shared.css` holds fonts/text styles/shapes; `assets/motion.js` holds animation helpers.
  Fonts (Poppins, JetBrains Mono, OFL) and GSAP are bundled locally, because CDNs are
  blocked in the cloud container.
- **Music** is an original track from `music/compose.mjs` (a small JS synth, 120 BPM,
  arrangement timed to the scene cuts). Run `node music/compose.mjs` to rebuild the mp3.
- `TWEAKING.md` is the owner-facing how-to (Studio, files, Codespaces).

## Commands (run in `explainer-video/`)

```bash
npx hyperframes@0.8.111 check                 # must pass with 0 errors
npx hyperframes@0.8.111 render -q high -f 30 -w 4 -o renders/make-videos-with-code.mp4
npm run studio                                # Studio in background on :3002 (--no-open)
node music/compose.mjs                        # regenerate music (wav + mp3)
```

## Gotchas learned the hard way

- **Studio edits only save for elements that are in the HTML source with an `id`**
  ("Couldn't find this element in the source file" otherwise). That's why every
  word, shape, wipe panel, EQ bar and confetti piece is written into the scene HTML
  with an id. Verified: recoloring a word, a shape fill and a card title in
  Studio saves to the file.
- HyperFrames **rewrites a sub-composition's root id** at mount, so shared helpers
  must be passed elements, not id strings.
- Studio stamps `data-hf-id` attributes into source files when it loads them. That's
  normal; commit them.
- AAC encoding overshoots on a full-level hit at sample 0, and the renderer's −1 dBTP
  limiter then turned the whole track down 10 dB. Fixed with a 30 ms fade-in in
  `compose.mjs`. Music masters at about −14 LUFS.
- The music doesn't move when scenes are retimed. Its build-ups and drops are tied
  to the original cuts (6, 14, 22, 32, 40, 50, 56 s).
- Remotion is free only for individuals and small companies; HyperFrames is fully free.
  That's why HyperFrames was chosen.

## Open items / ideas

- The owner tried to install the community **handoff** plugin (Anthropic Directory);
  it didn't show as enabled in the session where it was installed. Check in a new session.
- Possible next steps the owner mentioned or was offered: a 9:16 vertical version,
  more client videos following the `CLAUDE.md` rules, re-timing the music if scenes move.
- Unanswered from early on: whether usage is billed to the owner's subscription or
  their $100 Claude credit. Only claude.ai billing settings or support can say.
