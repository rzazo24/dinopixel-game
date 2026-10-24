# DinoPixel

Pixel-art dino-runner PWA. Plain HTML/CSS/JS, no dependencies, no build step. Live at
https://dinopixel-game.vercel.app/ (Vercel deploys `main` automatically). Full docs: [README.md](README.md)
(Spanish) and [README.en.md](README.en.md) (English).

## Working with the owner

- Reply in **Spanish**.
- Ship every change the same way: `node tests/run.mjs` → commit → push straight to `main` (no PRs) → wait for
  GitHub Actions (`gh run watch`) and report the result.
- On every user-visible release bump `CACHE` in [sw.js](sw.js) **and** the example in both READMEs
  (`'dinopixel-vN'   // -> 'dinopixel-vN+1'`), so players get the "Nueva versión" notice.
- Keep [README.md](README.md), [README.en.md](README.en.md) and the in-game help (`HELP` in
  [js/screens.js](js/screens.js)) up to date with gameplay changes.
- The owner tests on an iPhone and an Android phone (notch, landscape, installed PWA). iOS has no web vibration.
- Production Upstash Redis holds real rankings and cloud saves: never write test data there.

## Code layout

`js/*.js` are classic scripts sharing one global scope, loaded in order by [index.html](index.html) (and listed
in `sw.js`): i18n, sprites, helpers, canvas, audio, progress, engine, render, controls, screens, ranking, daily,
cloud, menu. A file may only use what earlier files define at load time. Match the existing style: dense
one-liners, short trailing `//` comments, English comments, Spanish file headers.

- **Sprites** are row strings + palette, built with `sprite(rows, pal)` (adds a 1-cell outline margin) and drawn
  with `blit(img, x, y, w, h)`. Animal grid 16 cells, scale `S = 3`.
- **Zones**: `BIOMES` in helpers.js (every `BIOME_LEN = 1500` points); each zone needs obstacles in `OBST`, a mover
  in `MOVERS`/`ZONE_MOVER` (sprites.js) and a song in `SONGS` (audio.js).
- **Storage**: `store` / `jsonStore` over localStorage. Every `dp-*` key travels in the cloud save except the
  device settings in `CLOUD_SKIP` (cloud.js); add new device-only settings there.
- **Shop items** (`SKINS`, `HATS`) are bought once and work on every animal; `season: 'halloween'` items are only
  on sale while `HALLOWEEN` is true (helpers.js, Oct 24 – Nov 2, forced with `?season=halloween|off`).

## Translations

Every user-visible string is `L('español', 'English')` ([js/i18n.js](js/i18n.js)). Static HTML keeps the Spanish
text and carries English in `data-en` (text, or the button's inner `<span>`), `data-en-html`, `data-en-label`,
`data-en-title`, `data-en-ph`. Canvas text uses the pixel font in render.js (A–Z, 0–9, accents, `.:!-#,?`): keep
canvas strings within it. Numbers use `toLocaleString(LOCALE)`.

## Tests

`node tests/run.mjs` = syntax check + API tests (mock Redis) + UI tests (headless Chrome over CDP, ~5 min).

- The game exposes `window.__dp` only with `?test=1`; add getters there in [js/menu.js](js/menu.js) when a test
  needs state.
- UI tests load `?test=1&season=off`, force Spanish (`dp-lang`) and start with today's daily challenge already
  done (see `fresh()` in [tests/ui.test.mjs](tests/ui.test.mjs)), so results don't depend on the date. Seasonal
  features are tested with `&season=halloween`.
- Every feature or fix gets a test; check it fails without the change (mutation check) before committing.
- Obstacles spawn at ~0.7/s: tests that wait for random spawns need generous sleeps, or call `__dp.spawn()` /
  `__dp.spawnMover()` directly.
