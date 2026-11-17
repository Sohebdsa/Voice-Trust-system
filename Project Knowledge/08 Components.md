# Components

## UI primitives (`src/components/ui/`)
- `icons.tsx` — 28-glyph inline SVG set (no icon package)

## App components (`src/components/app/`)

| Component | Purpose |
|-----------|---------|
| `master-list.tsx` | Shared list + filters + pager + 560px drawer for 4 master entities |
| `master-detail.tsx` | Detail header, section tabs, fact list, archive confirmation |
| `data-table.tsx` | Semantic table, sticky headers, scrollable labelled region, container-query stacked below 720px |
| `beneficiary-filters.tsx` | URL-driven cascade (district→block→village, gender, profile, project, status, date range, search) |
| `beneficiary-form.tsx` | 7-section registration form (`.form-grid`, `.form-section-title`, `.drawer`, `.checks`) |
| `pwd-form.tsx` | PWD confidential form |

## Detail tabs
Links with `aria-current`, not ARIA tab widget (they change the page — per Modern Web Guidance).

## CSS classes (app.css)
- `.tooltip-wrap` — pure CSS tooltip (`data-tooltip`, `data-tooltip-pos`, `data-tooltip-align`)
- `.form-grid`, `.form-section-title`, `.drawer`, `.drawer-foot`, `.checks` — form patterns
- `.row-aside`, `.inbox-title`, `.topbar-lead` — layout wrappers
