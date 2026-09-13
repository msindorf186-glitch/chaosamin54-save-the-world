# ChaosAmin54 save the world — offline edition

Anime fantasy platformer. Everything is plain HTML, CSS and JavaScript: no build step, no server, no accounts.

## Play on PC
Double-click `index.html` (Chrome, Edge or Firefox). Progress is saved in the browser automatically.
If your browser blocks local files, run a tiny local server in this folder and open http://localhost:8000:
- Python: `python -m http.server 8000`
- Node: `npx serve .`

## Play on a smartphone
1. Upload this folder to any free static host (GitHub Pages, Netlify Drop, Cloudflare Pages, Vercel).
2. Open the link on the phone, then choose "Add to Home Screen" / "Install app". It works offline afterwards (service worker + web manifest included).
3. For a real APK / iOS app, wrap this folder with Capacitor (`npm i @capacitor/cli @capacitor/core && npx cap init && npx cap add android`) and set `webDir` to this folder.

## Edit with Claude Code
Open this folder in Claude Code and describe changes. Where things live:
- `logic.js` — all rules: `platforms` (x, top y, width), `pickups`, `enemies`, `boss`, physics numbers (speed 270, jump -650, gravity 1700, dash 700), health, checkpoint at x 2640, portal at x 4490.
- `client.js` — rendering, controls (physical key codes in `keys`), touch buttons, HUD text (`words`), music/SFX, camera.
- `index.html` — title screen, guide, bestiary gallery, PWA manifest link.
- `style.css` — all visual styling (mobile breakpoints at 1100px and 760px).
- `assets/` — hero.png, boss.png, hound.png, platform.png (transparent sprites), vista.jpg (parallax background), title.jpg (title art), music.mp3, slash.mp3, icon.png, cover.png, references/ (the original concept art).

Controls: A/D or arrows move · Space / W double-jump · J or X slash · K or Shift dash · Escape pause · Enter start.
Tips: add a platform by appending `[x, y, width]` to the `platforms` array; add an enemy by adding `{x, home:x, y:<platform top>, hp:2, dir:1, range:100}` to `enemies`; change the enemy sprite by replacing `assets/hound.png` (transparent PNG, side view facing right).
