# Tech Stack

**Framework:** Next.js 15 (App Router), React 19  
**Language:** TypeScript strict (`tsconfig.json`: `strict`, `noUncheckedIndexedAccess`)  
**Styling:** Plain CSS with design tokens — `src/styles/tokens.css` + `src/styles/app.css` (+ `masters.css` imported after)  
**Icons:** 28-glyph inline SVG set — `src/components/ui/icons.tsx`  
**Data:** Seeded in-memory object graph — `src/lib/data/store.ts`, `src/lib/data/seed.ts` (deterministic PRNG seed)  
**Auth:** Server-side session cookie — `src/lib/session.ts` (`SESSION_SECRET` required in prod)  
**RBAC:** `src/lib/rbac.ts` — `scopeForRole`, `canAccess`, `requireRole` guard  
**API:** Next.js route handlers under `src/app/api/`, server actions under `src/app/actions/`  
**Path alias:** `@/*` → `./src/*`  

**What is NOT used:** Tailwind, shadcn/ui, Radix, chart libraries, icon packages, Drizzle, Postgres (all deferred per `Docs/decisions.md`)
