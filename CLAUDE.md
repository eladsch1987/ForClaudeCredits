# Project rules

## Videos and motion graphics must be fully editable in HyperFrames Studio

The owner builds these videos for clients and does small tweaks by hand in
HyperFrames Studio, without prompting. Every video you build here (and any
similar project) must be editable that way. Studio can only edit elements that
exist in the HTML source and have their own `id`; anything created at runtime by
a script can't be saved ("Couldn't find this element in the source file").

Build every video like this:

- **One sub-composition per scene** (`compositions/<scene>.html`); `index.html`
  only holds the timeline slots, audio and global variables.
- **Every visible element is written in the HTML**, never created by JavaScript:
  each word of an animated headline, decorative shapes, particles/confetti,
  equalizer bars, transition panels, etc. If something is generated, generate
  its markup once (with a script you run) and commit the result.
- **Every visible element has a unique, readable `id`** (`<scene>-<what>`, e.g.
  `tools-remotion`, `hook-title-w2`). Studio selects the nearest element with an
  id, so an element without one can't be selected on its own.
- The visible, colored part of an element must be the clickable one: don't
  put `pointer-events: none` on layers that hold editable things, and if a shape
  draws its color in an inner child, give that child an id too.
- **Scripts only animate** existing elements (GSAP transforms/opacity). Never
  repaint colors or rewrite text at runtime, or Studio edits get overwritten.
  Text that must stay variable (headline, CTA) goes through composition
  variables, and is only rewritten when the variable actually changes.
- **Shared styles go in a linked stylesheet** (e.g. `assets/shared.css`) with
  palette defaults on `:root`, so a scene opened on its own in Studio still
  looks right. Brand colors/text are composition variables (Studio's
  Variables tab).
- **Verify in Studio before calling it done**: start `npx hyperframes preview`,
  click a word and a decorative element, change a color in the Design panel,
  and confirm the change lands in the source file (`git diff`). Then undo it.
- Keep `.devcontainer/` so the project opens in GitHub Codespaces with Studio
  running (no local install needed).
