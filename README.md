# Sleepless Nights

Sleepless Nights is a Vercel-ready React/Vite campaign-management app.

## What changed

- Added a runnable Vite app shell with `index.html`, `src/main.jsx`, `src/App.jsx`, and route pages.
- Replaced the platform SDK dependency with `src/api/appClient.js`, a browser-local data adapter.
- Added missing UI primitives under `src/components/ui`.
- Added `vercel.json` so client-side routes work after deployment.
- Added a data import/export page at `/import`.

## Local development

```powershell
npm install
npm run dev
```

The app runs at `http://127.0.0.1:5173` by default.

## Production build

```powershell
npm run build
```

Vercel can host this repository as a Vite app. Use the default settings:

- Build command: `npm run build`
- Output directory: `dist`

## Data model

The current app stores campaign data in browser `localStorage` so it can run without an external platform service. File uploads are stored as data URLs in the browser. This is suitable for a portable single-user or prototype deployment.

For multi-user production use, replace the local adapter in `src/api/appClient.js` with a real backend such as Supabase, Firebase, or a Vercel Postgres API while keeping the same `appClient.entities.*`, `appClient.auth.*`, `appClient.functions.invoke`, and `appClient.integrations.Core.UploadFile` method shapes.
