# WonderWeaves - Jacquard Master

Fully offline weave / Jacquard design application. No network access or API keys needed at runtime.

## Run
1. `npm install` (one-time, needs internet)
2. Dev: `npm run dev` -> http://localhost:3000
3. Offline build: `npm run build` then `npm run preview`, or open the desktop app with `npm run electron`

## Installers (Windows .exe / macOS .dmg)
Push this folder to a GitHub repo, open Actions -> "Build installers" -> Run workflow.
Download the `.exe` (Windows) and `.dmg` (Apple Silicon + Intel) from the run's Artifacts.
Or build locally: `npm run dist:win` (on Windows) / `npm run dist:mac` (on a Mac) -> output in `release/`.
