# Project Overview

**Name:** VOICE Trust MIS (Management Information System)  
**Repo:** `C:\Users\soheb\OneDrive\Documents\Voice trust`  
**Stack:** Next.js 15 App Router, React 19, TypeScript (strict), plain CSS (no Tailwind)  
**Port:** `localhost:3100` (dev)  
**Commands:** `npm run dev` | `npm run build` | `npm run typecheck`  
**Type:** Dummy-data prototype, no database, no auth provider, seeded in-memory store  

## Purpose
MIS for a non-profit trust: beneficiaries, farmers, SHGs, PWD profiles, activities, attendance, leave, dashboards with role-based access.

## Role-based access
8 roles: `admin`, `programme_manager`, `project_coordinator`, `mel_officer`, `field_staff`, `hr_admin`, `finance`, `data_entry`  
Scope helper: `scopeForRole(userId, role)` in `src/lib/rbac.ts` — stands in for Postgres RLS  
Admin/Mel/HR/Finance see all; others scoped by programme/project/village

## Key directories
| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages + API routes + server actions |
| `src/components/` | UI primitives (`ui/`) and app components (`app/`) |
| `src/lib/` | Data store, types, queries, RBAC, nav, session, CSV, format |
| `src/styles/` | Design tokens (`tokens.css`), master styles (`app.css`, `masters.css`) |
| `Skills/` | Ponytail + mwg skill instructions (govern agent behavior) |
| `Docs/` | PRD, decisions, gap analysis, progress log |

## How to work here (ponytail rules)
- Minimum code that works; no abstraction "for later"
- Reuse existing helpers before adding new ones
- Typecheck clean: `npx tsc --noEmit`
- Build passes: `npm run build`
- Bug fix: grep all callers, fix root cause once in shared code
