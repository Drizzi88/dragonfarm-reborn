# Dragonfarm: Reborn

## 1 · Play the game

Dragonfarm: Reborn is an unofficial fan-made, German-language browser game inspired by Dragonfarm (2002). Explore its farm, city and island environments with a guided, event-driven beginner tutorial and procedural animated scenery. Play directly in your browser without a server account.

Open the [GitHub Pages site](https://drizzi88.github.io/dragonfarm-reborn/) if it has been deployed, or run the local server described below. Progress is stored in the current browser; export/import JSON to move your save between devices. The PWA supports offline use after the assets are cached.

This is an independently recreated fan project, not an official release or a verified 1:1 port.

## 2 · Technical quick reference and distribution

<details>
<summary>Vorherige README mit Details aufklappen / expand original documentation</summary>

# Dragonfarm: Reborn — Public GitHub Pages edition (v0.7.2)

**Unofficial fan-made browser game** inspired by *Dragonfarm* (2002). This is not endorsed or published by the original game's rights holders. The gameplay, balance and visuals are independently recreated, and may differ from the 2002 game. Do not add assets, audio, original source code or manual scans from the commercial game unless you have permission.

## Play

This is a fully static HTML/CSS/JavaScript project. No backend, cloud login, advertisements or server configuration needed. **Game progress is stored in the individual player's browser** (`localStorage`); it is not synced between devices. Use in-game JSON Export/Import when moving between installations or browsers. The GitHub Pages origin and `localhost` use separate storage; saves do not migrate automatically.

### Publish on public GitHub Pages (Free)

1. Use a **separate personal GitHub account**, not `SV-Domblick`.
2. On Linux/CachyOS: `sudo pacman -S --needed git github-cli`.
3. Log in to your target account using `gh auth login --hostname github.com`, or change the active account with `gh auth switch --user YOUR_USERNAME`.
4. In this directory, run `./publish-github.sh YOUR_USERNAME`. The script verifies the authenticated user, refuses `SV-Domblick`, asks for public-publishing confirmation, and refuses to overwrite an existing repository.
5. Open `https://github.com/YOUR_USERNAME/dragonfarm-reborn/settings/pages` and select **Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save**.
6. Visit `https://YOUR_USERNAME.github.io/dragonfarm-reborn/` once GitHub reports the deployment is complete. HTTPS is provided by GitHub Pages.

The website publishes automatically when you push more commits to `main`. GitHub Pages might run a small internal Pages build when deploying from a branch; this is not an application server or continuous GitHub Actions workflow.

**Browser-only alternative:** Create the public `dragonfarm-reborn` repository under the correct account at https://github.com/new (do not pre-create the README), then use **Add file → Upload files** to upload the site assets (`index.html`, `style.css`, `game.js`, `world3d.js`, `tutorial.js`, `sw.js`, the manifest/icons and `art/*.svg`). The `art/` folder must be preserved. Set Pages to publish from `main /(root)` afterward. Uploading via the GitHub website may omit dotfiles; the CLI/script route is recommended.

## Locally (Linux)

```bash
python3 -m http.server 8765
```

Visit http://localhost:8765. Alternatively use `./start-linux.sh`.

## GitHub Pages / PWA notes

- All references are relative, so this game works under `/dragonfarm-reborn/` and can be installed as a PWA.
- `.nojekyll` prevents GitHub Pages processing the static files with Jekyll.
- `sw.js` uses the scoped `dragonfarm-reborn-v0.7.2` cache, only cleans up the game's own cache versions, fetches fresh assets when online, and uses the cache offline.
- The German, event-driven beginner tutorial and the v0.7.1 city-marker flicker fix are retained.
- The previously published v0.7 save format remains compatible.
- A public repository makes **all game source and art accessible to everyone**; no secrets or private saves should be committed.
- No open-source license has been added automatically. Publishing a repository publicly does not by itself grant third parties broad reuse rights. Choose a code and asset license only after verifying what you own and want to permit.

## Files

| File | Purpose |
|---|---|
| `index.html` | Static entry point |
| `game.js` | Mechanics and navigation |
| `world3d.js` | Procedural animated environments |
| `tutorial.js` | German beginner tutorial |
| `style.css` | UI and layout |
| `sw.js` | Versioned offline cache |
| `art/*.svg` | Original static environment art |
| `manifest.webmanifest`, icons | Installable PWA |
| `publish-github.sh` | Safe publishing helper (refuses SV-Domblick) |

## Limitations

Gameplay mechanics are a fan reconstruction; the game isn't a verified 1:1 port of the original. Public distribution of a fan remake can still involve intellectual property or trademark concerns, even without the original assets. Obtain permission or legal advice if necessary before wide publicity.


</details>
