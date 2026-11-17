# Quick Reference

## Commands
- `npm run dev` — start dev server on :3100
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit` (must be clean)

## Common tasks

**Add a new master entity (villages/donors/programmes/projects pattern):**
1. Add interface to `src/lib/data/types.ts` + array to `Db`
2. Seed in `src/lib/data/seed.ts`
3. Query: `src/lib/queries/masters.ts` → `{ rows, total }`
4. Action: `src/app/actions/masters.ts` → `saveMaster` / `archiveMaster`
5. Pages: list + detail, reuse `master-list.tsx` / `master-detail.tsx`
6. Add nav entry in `src/lib/nav.ts`, remove from `[...slug]` placeholder

**Add role scope for a new role:**
Edit `scopeForRole` in `src/lib/rbac.ts` + add to `Role` union in `types.ts`

**Export CSV from a list:**
Use `src/lib/csv.ts` writer, route under `src/app/api/<entity>/export/route.ts`, session-guarded

**Add a tooltip:**
`<span class="tooltip-wrap" data-tooltip="help text">label</span>`

**Truncate a label:**
Make it `display: block` (or flex child), add `min-inline-size: 0`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`

## Key files to read first
| File | Why |
|------|-----|
| `src/lib/data/types.ts` | All domain types + Db shape |
| `src/lib/rbac.ts` | Role scoping (stand-in for RLS) |
| `src/lib/nav.ts` | Sidebar nav structure |
| `src/lib/data/store.ts` | In-memory DB instance |
| `src/lib/data/seed.ts` | Deterministic dummy data |
| `src/lib/session.ts` | Session cookie + SESSION_SECRET guard |
| `src/styles/tokens.css` | Design token source of truth |

## Known open issues
See `Docs/gap-analysis-v2.md` — IG-01 to IG-10, TD-01, TD-02, WF-01 to WF-08  
Notable: IG-10 `npm run build` unverified on Windows/OneDrive (EPERM); IG-07 detail page missing FilterBar
