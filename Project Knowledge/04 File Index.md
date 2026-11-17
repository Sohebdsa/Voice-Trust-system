# File Index

Auto-generated map of the source tree (exclude `node_modules`, `.next`).

## src/app
```
page.tsx              — landing / redirect
layout.tsx            — root layout
not-found.tsx         — 404
sign-in/              — sign-in, forgot-password
(app)/
  [...slug]/page.tsx   — catch-all placeholder "planned for Step N"
  dashboard/           — executive dashboard (MEL variant)
  dashboard/hr/        — HRMS dashboard
  dashboard/finance/   — finance budget summary
  home/                — field staff task list
  beneficiaries/       — list + [id]/detail (7 tabs)
  farmers/             — list + form
  shgs/                — list + [id] (Overview/Members/Savings/Linked Projects)
  pwd/                 — confidential PWD list
  attendance/          — attendance
  leave/               — leave requests
  mel/                 — MEL indicators
  villages/            — master list (Step 2)
  donors/              — master list + [id] (Grant & Funding Flow)
  programmes/          — master list
  projects/            — master list + [id] (Budget tab)
  users/               — user management
  audit/               — audit log
  api/
    dashboard/export/route.ts   — CSV of filtered dashboard view
    beneficiaries/export/route.ts — CSV of all matching beneficiaries
    masters/export/route.ts       — CSV of current master filters
  actions/
    masters.ts           — saveMaster, archiveMaster, recordDisbursement
    beneficiaries.ts     — saveBeneficiary, archiveBeneficiary, checkDuplicateMobile
```

## src/lib
```
data/
  types.ts        — all domain interfaces + Db
  store.ts        — in-memory db instance (import db from here)
  seed.ts         — deterministic dummy data
queries/
  profiles.ts, masters.ts, hr.ts, home.ts, dashboard.ts, beneficiaries.ts
rbac.ts           — scopeForRole, canAccess, inProjectScope, inVillageScope
nav.ts            — NAV, navForRole, roleLabel, ROLE_LABELS (client-safe)
session.ts        — server session cookie, SESSION_SECRET guard
csv.ts            — CSV writer (prefixes = + - @ cells)
format.ts         — formatting helpers
```

## src/components
```
ui/
  icons.tsx       — 28-glyph inline SVG set
app/
  master-list.tsx     — shared list + pager + drawer for 4 master entities
  master-detail.tsx   — detail header, tabs, fact list, archive confirm
  data-table.tsx      — semantic table, sticky headers, container-query stacked
  beneficiary-filters.tsx — URL-driven cascade filters
  beneficiary-form.tsx  — 7-section registration form
  pwd-form.tsx        — PWD form
```

## src/styles
```
tokens.css    — design token table (PRD §9.2)
app.css       — master styles, tooltip infrastructure, text overflow fixes
masters.css   — table, filter search, drawer, tabs, fact styles
```

## Other key files
- `next.config.ts` — `reactStrictMode: true`
- `tsconfig.json` — strict, `@/*` alias, incremental
- `AGENTS.md` — ponytail lazy-senior-dev ruleset (applies every session)
- `Skills/ponytail/` + `Skills/mwg/` — agent skill instructions
- `Docs/PRD`, `Docs/decisions.md`, `Docs/progress.md`, `Docs/gap-analysis*.md`
