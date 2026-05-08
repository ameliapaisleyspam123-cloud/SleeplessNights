# Base44 to GitHub Migration

This repository is a migration staging area for a Base44 campaign-management website.

## What is included

- `entities/*.json`: Base44 entity schemas copied into version-controlled files.
- `src/entities/types.ts`: TypeScript interfaces generated from the entity shapes.
- `src/entities/defaults.ts`: Default values for new records.
- `src/entities/index.ts`: Barrel exports for the entity helpers.

## Base44 pages received

The migration has source for these Base44 pages, but they are not runnable yet because they still depend on Base44 runtime APIs and missing local components/hooks:

- `Broadcast.jsx`
- `CampaignLobby.jsx`
- `CharacterSheets.jsx`
- `Chat.jsx`
- `DmVault.jsx`
- `Documents.jsx`
- `Home.jsx`
- `Lore.jsx`
- `Notes.jsx`

## Base44 lib files received

- `src/lib/AuthContext.jsx`
- `src/lib/InitiativeContext.jsx`
- `src/lib/PageNotFound.jsx`
- `src/lib/app-params.js`
- `src/lib/query-client.js`
- `src/lib/utils.js`

## Base44 hooks/utils/components received

- `src/hooks/useCampaign.js`
- `src/hooks/use-mobile.jsx`
- `src/utils/index.ts`
- `src/components/documents/DocumentEditor.jsx`
- `src/components/broadcast/BroadcastOverlay.jsx`

## Next migration steps

1. Copy the Base44 `pages`, `components`, `integrations`, `functions`, and asset folders into this repository.
2. Replace Base44 SDK imports with a GitHub-hosted backend or client adapter.
3. Choose a data layer for the migrated site, such as Supabase, Firebase, Prisma/Postgres, or static JSON during development.
4. Add authentication and authorization rules that match the existing visibility fields:
   - `public`
   - `dm_only`
   - `archived`
   - `specific_players`
   - document `private`
5. Add deployment configuration for GitHub Pages, Vercel, Netlify, or your preferred host.

## GitHub setup

After Git is available locally, run:

```powershell
git init
git add .
git commit -m "SleeplessNights"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Data model notes

Base44 usually provides record metadata such as `id`, `created_date`, `updated_date`, and sometimes `created_by` outside the entity schema. The TypeScript types in this repo include those fields as optional metadata so migrated code can support both exported Base44 data and future database records.
