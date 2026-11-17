# Conventions & Patterns

## Import alias
`@/*` → `./src/*` — use for all cross-folder imports.

## Query pattern (all list queries)
Return `{ rows, total }` with search, filters, paging at 10.  
Example: `src/lib/queries/masters.ts`

## Server action pattern
One action per entity: `saveX` (create/update + audit), `archiveX`.  
Generated codes (e.g. `VIL-019`, `PRJ-007`) are never editable.  
Both write audit rows.  
Located in `src/app/actions/<entity>.ts`.

## Role guard
Wrap every page with `requireRole` (or check role in `page.tsx`).  
`field_staff` is refused at `/dashboard` by URL.

## RBAC scope
`scopeForRole(userId, role)` returns `{ programmeIds, projectIds, villageIds }` — `null` = all, `[]` = none.  
Applied in every query, never in components.

## CSS
- Design tokens in `tokens.css`; component styles in `app.css` / `masters.css`
- Truncating labels: blockify + `min-inline-size: 0` + `text-overflow: ellipsis`
- Tooltips: pure CSS `.tooltip-wrap` with `data-tooltip`, `data-tooltip-pos`, `data-tooltip-align`

## CSV export
Session-guarded. Prefix cells starting with `= + - @` with apostrophe (formula injection guard).  
Writer: `src/lib/csv.ts`

## Audit
Every mutation + `view_sensitive` / `export` / `login` appends to `db.audit`.  
PWD views debounced: max 1 entry per user per record per 10 minutes.

## Adding a new page
1. Create route under `src/app/(app)/<name>/page.tsx`
2. Add `requireRole` guard
3. Add sidebar entry in `src/lib/nav.ts` (NAV map)
4. Remove from `[...slug]` placeholder map if listed there

## Removing a placeholder
When a module lands, delete its entry from `src/app/(app)/[...slug]/page.tsx` placeholder map.
