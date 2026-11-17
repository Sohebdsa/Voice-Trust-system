# Handoff — VOICE Trust MIS prototype

**Read this first, then `Docs/MVP-PLAN.md`.** This file explains what exists, why, how to run and check it,
what is deliberately missing, and what to build next. It is written for an agent (or a person) starting with
no memory of the previous sessions.

Last updated: Step 2 (masters) complete and verified.

---

## 1. What this project is

A clickable **prototype** of the VOICE Trust MIS for a Maharashtra NGO: Next.js 15 App Router, TypeScript
strict, **dummy data in memory**, a login for eight departments, a dashboard rebuilt from the owner's source
PDF, and — as of Step 2 — the four master registers (villages, donors, programmes, projects).

It is not a production system. There is no database, no auth provider, no file storage, and no test suite.
Everything that would be Postgres + RLS is a typed object graph in `src/lib/data/` plus a scope helper.

### Source documents, in order of authority

| Document | What it is | Authority |
| --- | --- | --- |
| `Docs/VOICE Trust MIS – MVP Product Requirements Document.md` | The PRD (MVP v1.0) | **Binding** on scope, fields, roles, copy |
| `Docs/MVP-PLAN.md` | How the prototype replaces each PRD layer, and the 8 build steps | Build order |
| `Docs/decisions.md` | D1–D7: the deviations actually taken, and why | Explanation |
| `Docs/gap-analysis.md` | Three-way comparison: source PDF vs PRD vs what was built | Where to expect disagreement |
| `Docs/progress.md` | What each completed step did, and what it verified | Status log — append to it every step |
| `Docs/demo-accounts.md` | The eight demo logins | Demo |
| `.cloud-attachments/1d468b…txt` | Extracted text of the owner's data-structures/dashboards PDF | Reference for dashboard shapes |

When the PDF and the PRD disagree, **the PRD wins**. The known case: the PDF's B3 wants assets/expenditure/
utilisation dashboards, PRD §2.2 puts them out of MVP scope, so they appear only as "Coming in Phase 2".

---

## 2. Ground rules from the owner

These were explicit instructions, not preferences. Keep following them.

1. **Go step by step.** One module at a time, then stop and let the owner review. Do not build several
   modules in one turn and do not run ahead of the plan.
2. **Do not guess. Ask.** If a requirement is ambiguous, ask before building. Previous answered questions
   (mock data in code, password-only login, ~120 beneficiaries, owner-supplied screenshot) are settled — see
   `Docs/MVP-PLAN.md` §2.
3. **Use the two installed skills.** They are not decoration:
   - `Skills/mwg/` (Modern Web Guidance) — run `search` then `retrieve` **before** writing any HTML/CSS or
     client-side JS pattern. It changed real decisions here: tabs are navigation links, not the ARIA tab
     widget; tables use a container query, not a second markup path.
   - `Skills/ponytail/` (+ `ponytail-review`, `-audit`, `-debt`, `-gain`, `-help`) — smallest complete change,
     reuse before writing, no new dependency for a few lines, never cut validation/security/accessibility.
     Its ruleset is `AGENTS.md` at the repo root, so it is always active at level **full**.
4. **Do not add dependencies.** The project ships `next`, `react`, `react-dom` only. Icons, charts, tables,
   drawers and pills are hand-written. Adding a library needs the owner's approval.
5. **Finish a step with real verification**, not a claim: typecheck, production build, and a behavioural
   check of the new logic (see §7).

---

## 3. Run it

```bash
npm install          # only if node_modules is missing
npm run dev -- -p 3100
npm run typecheck    # tsc --noEmit
npm run build        # production build (see the caveat in §7)
```

Open <http://localhost:3100>. Sign in with any account from `Docs/demo-accounts.md`; the password for all
eight is `Voice@2026`.

**Stack facts that matter**

- Next.js 15.5.29, React 19, TypeScript 5.7 strict. No Tailwind, no shadcn, no Recharts, no lucide.
- `params` and `searchParams` in pages are **Promises** in Next 15 — always `await` them.
- All list/detail pages are dynamic because they read the session cookie.

---

## 4. Architecture

### Data layer (`src/lib/data/`)

- `types.ts` — every entity. Field names follow PRD §4 verbatim so a real Drizzle schema could replace it.
- `seed.ts` — one deterministic object graph (fixed PRNG seed `20261117`): 18 villages, 4 donors,
  3 programmes, 6 projects, 14 employees, 115 beneficiaries, 4 SHGs, 24 activities, indicators, leave,
  attendance, audit rows. Volume and content are chosen so KPIs equal what the lists show.
- `store.ts` — `db` on `globalThis.__voiceTrustDb`. Single process, single instance. **Editing `seed.ts`
  requires a dev-server restart**; mutations made through the UI survive HMR but not a restart.

### Access control

- `lib/session.ts` — HMAC-SHA256 cookie `vt_session` (payload `{sub, exp}`, 8-hour life), `getSession`,
  `requireSession`, `requireRole(roles)`, `landingFor(role)`. Role landings follow PRD §8.5.
- `lib/rbac.ts` — `scopeForRole(userId, role)` returns `{ programmeIds, projectIds, villageIds }` where
  `null` means "all". This is the stand-in for RLS (PRD §5.2) and is applied **inside queries**, never in the
  UI. `inProjectScope` / `inVillageScope` exist but are currently unused.
- `lib/nav.ts` — NAV groups and role filters for the sidebar. Split from `rbac.ts` (decision D6) so client
  components can import nav metadata without pulling `node:crypto` into the browser bundle.
- `lib/masters.ts` — master-record metadata, the §5.1 permission map (`canCreate`, `canEdit`, `canArchive`),
  form field definitions, shared validators, `buildQuery`, `formHref`, `exportHref`.

### Queries (read side)

`src/lib/queries/` holds one module per area, all server-only, all returning computed data rather than raw
rows: `dashboard.ts` (KPIs, chart series, filters, inbox), `hr.ts`, `home.ts`, `masters.ts` (the four lists
with `{ rows, total, page, pages }`, the detail builders, `masterValues` for form prefill, `getFormOptions`).

### Actions (write side)

`src/app/actions/masters.ts` — `saveMaster` and `archiveMaster`. Both are `"use server"`, both call
`requireSession`, re-check permissions **and scope** server-side, re-validate with the shared validators,
write an audit row, `revalidatePath` the affected lists/details/dashboard, and `redirect()` on success.

`src/app/(auth)/sign-in/actions.ts` — password check, 5-attempt lockout in a module-level `Map`, audit row.

### UI

- `src/components/app/` — shell, sidebar, topbar, inbox popover, dashboard widgets, and the Step 2 pieces:
  `master-list.tsx` (filters + table + pager + drawer), `masters-form.tsx` (client, `useActionState`),
  `master-filters.tsx` (client, URL-driven), `data-table.tsx` (server table + pager), `master-detail.tsx`
  (detail header, tabs, facts, archive confirmation).
- `src/components/ui/icons.tsx` — the whole icon set is inline SVG paths. To add an icon, add a path to
  `PATHS`; nothing else is needed.
- Styles: `tokens.css` (colour/spacing/type tokens sampled from the owner's screenshot), `app.css` (layout,
  dashboard widgets, and a "Text overflow" layer at the end — read it before adding text in a flex row),
  `masters.css` (Step 2: tables, filter search, drawer, tabs, facts). Both are imported in
  `src/app/layout.tsx`.

### Routes

| Route | State |
| --- | --- |
| `/sign-in`, `/forgot-password` | Built (Step 1) |
| `/dashboard` | Built — 8 KPIs, donut, 4 bar lists, monthly chart, URL filters, CSV export |
| `/dashboard/hr`, `/dashboard/finance` | Built (HR dashboard; finance is budget-only by PRD §2.2) |
| `/home` | Built — field staff / data entry landing |
| `/villages`, `/villages/[id]` | **Built (Step 2)** |
| `/donors`, `/donors/[id]` | **Built (Step 2)** |
| `/programmes`, `/programmes/[id]` | **Built (Step 2)** — tabs: overview, projects, activities, team |
| `/projects`, `/projects/[id]` | **Built (Step 2)** — tabs: overview, beneficiaries, activities, indicators, team & villages, budget |
| `/api/dashboard/export`, `/api/masters/export?entity=…` | Built — CSV, session-guarded, filter-aware, audited |
| `/beneficiaries`, `/shgs`, `/pwd`, `/activities`, `/mel`, `/employees`, `/attendance`, `/leave`, `/users`, `/audit` | Placeholder via `(app)/[...slug]/page.tsx`, which states which step builds each |

Before Step 2, four of those placeholder entries existed; they were deleted when the real pages landed. Do the
same for every module you build: remove its entry from the `MODULES` map in `[...slug]/page.tsx`.

---

## 5. The Step 2 pattern — copy it for the next modules

Step 2 is the reference implementation for "list + filters + form + detail + export". If you are building a
module, read these five files before writing anything: `lib/masters.ts`, `lib/queries/masters.ts`,
`app/actions/masters.ts`, `components/app/master-list.tsx`, `components/app/data-table.tsx`.

Shape of it:

1. **One metadata module** (fields, permissions, validation, URL helpers). It must not import the store, so
   the client form can use it.
2. **One query module** that scopes, filters, sorts and paginates; returns `{ rows, total }` (PRD §6).
3. **One action module** with a single save entry point and a single archive entry point.
4. **One list shell** component; the pages declare columns and filter controls only.
5. **URL is the state.** Filters, paging, the open drawer (`?form=new`, `?id=…`), detail tabs (`?tab=…`) are
   all in the query string, so every view is linkable and the back button works.
6. **POST-free interactions.** Drawer, confirmations and pagination are links and native elements — no client
   JS beyond `useActionState` on the form and `router.push` in the filter bar.

### Recipe: add a new module (example, Step 3 beneficiaries)

1. Read PRD §7.3, §10.2, §10.3 and the relevant `Docs/gap-analysis.md` rows.
2. Run `Skills/mwg` `search`/`retrieve` for any new UI pattern (e.g. "duplicate warning", "multi-step form").
3. Add/extend types in `lib/data/types.ts`; extend `seed.ts` if the dataset needs it (then restart dev).
4. Add validators + field definitions in a metadata module; add queries; add actors in `app/actions/`.
5. Build the page(s), reusing `DataTable`, `MasterFilters`-style URL state, `StatusPill`, `EmptyState`,
   `Facts`, `DetailTabs`, `MasterForm` where the shape matches.
6. Delete the module's `[...slug]` placeholder entry.
7. Verify (§7), then append a section to `Docs/progress.md` with what you built **and what you checked**.

---

## 6. Conventions

- **Copy**: sentence case, plain words ("Village", not "geo unit"), actions named by verb ("Save project"),
  destructive actions always say "Archive" and state the consequence (PRD §9.4, §9.6). Errors say what to
  fix, never "Something went wrong".
- **Codes are generated, never typed**: `VIL-019`, `DON-005`, `PRG-004`, `PRJ-007`. Editable fields never
  include `code`.
- **Derived values are computed, never stored** — beneficiary counts, project coverage, member counts,
  percentages. That is why list counts and the dashboard agree.
- **Money** uses `formatCurrency` / `formatCurrencyCompact` (Indian grouping, ₹). Dates use `formatDate`
  (IST). Financial year is April–March (`currentFinancialYear`).
- **Permissions** are enforced by `requireRole` in the page *and* re-checked in the action. Nav filtering is
  presentation only and is never the control.
- **Audit** every mutation with `db.audit.push({...})`; exports write an `export` row too.
- **CSS**: use the existing tokens and classes first. Do not introduce a utility framework. Anything that
  truncates text must be a block with `min-inline-size: 0` in its flex/grid parent — that bug was already
  fixed once; the "Text overflow" section of `app.css` documents the rules.

---

## 7. How to verify a step

Run these from the repo root. All four matter; a passing build alone proves nothing about behaviour.

```bash
npx tsc --noEmit                     # exit 0
npm run build                        # exit 0, new routes listed
```

**Build caveat (repeat of a real incident):** `next build` and `next dev` share `.next`. Building while dev
runs leaves the dev server throwing `Cannot find module './xxxx.js'`. Stop the dev server **by PID** first,
then restart it after the build:

```bash
PID=$(netstat -ano | grep ':3100 .*LISTENING' | head -1 | awk '{print $NF}')
taskkill //F //PID "$PID"            # Windows Git Bash; plain kill often no-ops
rm -rf .next
npm run build
nohup npm run dev -- -p 3100 > dev.log 2>&1 &
```

Never stop servers by name pattern (`pkill -f`, `killall`): the command line of the agent process can contain
the same words.

**Signed-in HTTP checks** without a browser — forge the cookie (dev secret only):

```bash
TOKEN=$(node -e "const{createHmac}=require('crypto');const p=Buffer.from(JSON.stringify({sub:'usr-01',exp:Date.now()+3600000})).toString('base64url');console.log(p+'.'+createHmac('sha256','voice-trust-prototype-dev-secret').update(p).digest('base64url'))")
curl -s -o /dev/null -w "%{http_code}\n" -H "Cookie: vt_session=$TOKEN" http://localhost:3100/projects
```

`usr-01`…`usr-08` map to the eight demo accounts in seed order (see `Docs/demo-accounts.md`).

**What a step's check must cover**

1. The happy path, end to end, including the write (create or update) and that the new record appears in the
   list, in the detail page, in the export, and in any dashboard number derived from it.
2. The rejection path: the validation that matters, shown as a specific message.
3. Role gates: one denied role redirect, and one anonymous 401 on any API route.
4. The URL state: at least one filter, one page, and one tab.

Browser-driven checks are available through the preview tools (`preview_open`, `preview_snapshot`,
`preview_evaluate`, `preview_wait`). Note two gotchas found in practice: clicking a drawer's sticky footer
button can land on the scrim if the element moved, and React resets uncontrolled inputs on re-render, so set
several fields and submit inside **one** `preview_evaluate` call.

---

## 8. Status

| Step | Scope | State |
| --- | --- | --- |
| 1 | Shell, sign-in for 8 roles, dashboard, HR dashboard, finance stub | **Done** |
| 2 | Villages, donors, programmes, projects: lists, filters, paging, drawer forms, detail tabs, archive, CSV | **Done** |
| 3 | Beneficiary registry (PRD §7.3, §10.2, §10.3) | **Next** |
| 4 | Farmer, SHG (members, savings), PWD (sensitive, audited) | Not started |
| 5 | Activities: list + calendar, participants bulk add, attachments UI | Not started |
| 6 | MEL indicators and period values | Not started |
| 7 | Employees, allocation, attendance, leave, HRMS wiring | Not started |
| 8 | Users & scopes, audit log, budget card, responsive/keyboard pass | Not started |

### Step 3 — what "done" means (from PRD §7.3, §10.2, §10.3)

- List with the §10.2 columns, village cascade filter, gender/profile/project filters, search, paging, CSV.
- Sectioned registration form, mobile-first at 390px, keyboard-only, completable in under 90 seconds; consent
  checkbox with stored consent date (`consentGivenOn` already exists on the type).
- Duplicate warning panel on save: same mobile number or same ID last-4 → warn, do not silently create.
- Detail page with tabs (§10.3): overview, projects, farmer/SHG/PWD profiles, activities, timeline.
- Archive, not delete. Every view of sensitive data is audited.

The seed already contains 115 beneficiaries with `projectIds`, mobile numbers (including deliberate
duplicates), `idProofLast4` and consent dates, so the duplicate panel can be demonstrated immediately. The
inbox item `getInbox()` counts duplicate mobiles already.

---

## 9. Known debt and risks

Fix these before anything is deployed or handed to a real user. They are ordered by cost of leaving them.

1. **Session secret falls back to a hardcoded string** (`lib/session.ts:L10`). Anyone with the repo can forge
   an admin cookie. Keep the fallback for development only and throw when `NODE_ENV=production` and
   `SESSION_SECRET` is unset.
2. **Filter URL names are written in two places** — the `PARAM` map in `dashboard-filters.tsx` and the
   literals in `exportHref` in `dashboard/page.tsx`. Adding a filter and forgetting the second silently
   ignores it in the CSV. Export the map from one module and build both from it.
3. **No tests at all.** The riskiest logic is the session token, the sign-in lockout, `scopeForRole`, the CSV
   escaping/formula guard and the master validators. One small test each would be enough; nothing in the plan
   asks for coverage.
4. **Unused code** (~90 lines): `components/app/empty-state.tsx` is now used, but `formatCompact`,
   `formatPercent`, `daysBetween`, `canAccess`, `inProjectScope`, `inVillageScope` and the nav re-exports in
   `rbac.ts` are not. `ageFrom` is unused **and must stay** — Step 3 needs derived age.
5. **Not built on purpose in Step 2**: village CSV import (PRD §7.2 mentions it; the prototype plan puts
   import with the later two-step import flow) and editing project team allocations (read-only tab until the
   employee module exists in Step 7). Both are recorded in `Docs/progress.md`.
6. **`DataTable` is server-rendered only** — no column sorting, no column visibility, no row selection, no
   bulk actions, though PRD §9.5 lists them. Add when a screen needs them, not before.
7. **In-memory store**: one process, resets on restart, loses anything created in a demo. Expected for a
   prototype; do not build a persistence layer without the owner asking.
8. **The prototype is not a security boundary.** PWD data is not yet specially protected because the module
   does not exist; when it does, follow PRD §5.2 (hide fields by role, audit every open, MEL sees aggregates).

---

## 10. Traps already hit (save yourself the hour)

- **Next 15 async APIs**: `searchParams`/`params` are Promises. `await` them or the page silently misbehaves.
- **`redirect()` inside `try/catch`** is swallowed — it throws. Keep it outside, at the end of the action.
- **Uncontrolled inputs reset after a failed server action** unless the action returns `values` (see
  `SaveState` in `masters-form.tsx`). Always return them.
- **A client component importing a module that reaches `node:crypto`** breaks the bundle. That is why
  `lib/nav.ts` exists separately from `lib/rbac.ts`.
- **Long shell heredocs get truncated** mid-file (that is how `app.css` was corrupted once). Write CSS with
  the file-writing tool, not `cat >>`.
- **The inbox is a native popover**; a click on its own button also counts as an outside click, so the open
  state is captured on `pointerdown` (see `inbox-toggle.tsx`). Do not "simplify" it back to `onClick`.
- **Text overflow**: ellipsis only works on block-level boxes with a shrink allowance. The layer at the end of
  `app.css` is the fix; do not remove rules that look redundant.
- **Catch-all placeholders**: static routes win over `(app)/[...slug]`, so a new page is live the moment it
  exists — but remember to delete its placeholder entry.

---

## 11. Where to look, by question

| Question | File |
| --- | --- |
| What does this field mean? | `Docs/VOICE Trust MIS – MVP Product Requirements Document.md` §4 |
| Why is it built this way? | `Docs/decisions.md` |
| What was verified, and when? | `Docs/progress.md` |
| What is missing vs the PDF/PRD? | `Docs/gap-analysis.md` |
| What is the demo password? | `Docs/demo-accounts.md` |
| How do I compute a KPI? | `src/lib/queries/dashboard.ts` |
| How do I add a master-style module? | §5 above, then `lib/masters.ts` |
| Where does permission live? | `lib/masters.ts` + `lib/rbac.ts` + the action |
| How is the dashboard styled? | `src/styles/app.css` (widgets) and `tokens.css` |
