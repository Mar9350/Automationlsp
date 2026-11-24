# ProCAD Automation

Internal site for Cushman & Wakefield ProCAD Manila: the automation story from 2024 to 2026, a guide to every tool, and five mini-games.
Plain HTML, CSS and vanilla JavaScript. No frameworks, CDNs, web fonts or network requests. Open `index.html` from the folder.

```
index.html            site markup
styles.css            site tokens and styles
script.js             CONFIG, CATEGORIES, TIMELINE, TOOLS at the top, logic below
assets/               logo.svg, favicon.svg, screens/ (optional <tool id>.gif)
downloads/lisp/       .lsp files for download
downloads/python/     .exe files for download
play/                 games: 3D office (index.html, game.js), arcade.html/.js, quiz.html/.js, mini.css
```

## Sections
01 Hero · 02 Story · 03 Toolkit · 04 Play · 05 Downloads · 06 Tool details (side sheet) · 07 Install

## Add a file for download
1. Copy the file into `downloads/lisp/` (.lsp) or `downloads/python/` (.exe).
2. In `script.js`, find the tool in `TOOLS` and change `href: "#"` to the path, e.g. `href: "downloads/lisp/GAPCHECK.lsp"`.

- Use forward slashes. Spaces become `%20`.
- An `https://` link also works (for SharePoint add `?download=1`).
- On a web server (`https://`), Download saves `.lsp` files instead of opening them as text.
  Opened from a folder (`file:///`), the browser decides; right-click Download → Save link as.
- `DOWNLOADS_ENABLED: false` switches every Download button off.

## Add a tool
Add one object to `TOOLS` in `script.js`. Every count and chart updates automatically.

## Play (play/)
Three 3D office games, a 2D arcade and a quiz. Open `play/index.html`, or link straight to a game with `#mode=donut`, `#mode=gap` or `#mode=hatch`.

| Game | Tool | Goal |
|---|---|---|
| GCDONUT Hunt | GCDONUT | Walk to the donut at each room's centroid (7 rooms). |
| Gap Patrol | GAPCHECK | Walk to each glowing gap and press E to seal it (10 gaps). |
| Hatch Sweeper | HDEL | Clear 3 hatches by hand with E, then press H to run HDEL on the rest (12 hatches). |
| Hatch Invaders (2D arcade, `play/arcade.html`) | HDEL | Shoot marching hatch blocks; 10 hits charge HDEL, H clears the screen. Best score is kept on the device. |
| Guess the LISP (quiz, `play/quiz.html`) | All | 10 questions from `TOOLS`. 3 / 2 / 1 points depending on clues used. New tools join the pool automatically. |

Controls: W A S D move · mouse look · Shift run · Space jump · E interact · H HDEL · V camera · M minimap · Esc pause. Phones get a joystick and buttons.

People are unnamed figures. Edit them in `PEOPLE` at the top of `play/game.js`:
- `seat`: `An0`–`As2` / `Bn0`–`Bs2` (desk pods), `head`, `cn0`–`cn2`, `cs0`–`cs2` (conference room).
- `hair`: `short`, `long`, `bun` or `bald`. `mustache: true` adds a mustache.

## Logo construction
24 × 24 grid. One polyline `M7 21 V3 H12 A5 5 0 0 1 12 13 H7` (stem at x = 7, half-circle bowl of radius 5 centred on 12, 8), stroke 2.5, miter joins. A 4 × 4 orange (#FF5A1F) grip square centred on (7, 21). Replace the mark in `assets/logo.svg`, `assets/favicon.svg` and the two inline SVGs in `index.html`.

## Hosting
Open from a synced folder, or upload the whole folder to a web host (IIS, Azure Static Web Apps). SharePoint's file preview blocks scripts, so the site and games won't run inside it.
