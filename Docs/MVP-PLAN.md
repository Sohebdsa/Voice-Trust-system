# VOICE Trust MIS — Prototype Build Plan

Source of truth: `Docs/VOICE Trust MIS – MVP Product Requirements Document.md` (MVP v1.0).
This plan says **how** the prototype gets built, in **what order**, and **how each step is checked**. It does not add scope.

---

## 1. What "prototype" means here

The PRD describes a production system (Postgres + RLS + Supabase Auth + real files). What you asked for is a
**clickable prototype with dummy data and a login for every department**. So this build keeps the PRD's
**shape** — routes, roles, schema field names, screen patterns, tokens, states, copy rules — and replaces only
the **persistence layer** with a typed in-memory dataset.

| PRD layer | Prototype | Why |
| --- | --- | --- |
| PostgreSQL + Drizzle migrations + RLS | Typed mock dataset in `/src/lib/data/*` + `queries.ts` per module returning `{ rows, total }` | Zero setup, no credentials, no DB to host; every function signature matches PRD §6 so a real DB can replace the body later |
| Supabase Auth / Auth.js | Cookie session + demo accounts, guarded per route | Same landing behaviour (§8.5) and the same "no cross-role leak" rule, enforceable in code |
| RLS policies | `lib/rbac.ts` scope filter applied inside every query (server-side, not UI) | Demonstrates §5.2 without a database |
| Audit log table | Append-only array written by every mutation + `view_sensitive` hook | §5.2 audit proof stays visible on the Audit screen |
| Storage buckets / signed URLs | Local placeholder image paths | Photo/attachment UI is present, upload is a stub |
| CSV import + export | Export works on current filters; import validates a small pasted/CSV sample | §2.1 stays in scope |
| Payroll, assets, finance, loans | Not built — "Phase 2" labels only | §2.2 is binding |

Everything in PRD §2.2 stays unbuilt. Nothing from §2.1 is dropped from the prototype.

---

## 2. Decisions taken (confirmed with the owner)

1. **Stack: Next.js (App Router) + TypeScript strict + Tailwind + lucide-react + Recharts.** Matches PRD §3.
   shadcn/ui adds a generator step; the prototype needs only ~10 primitives, so those are written by hand in
   `/components/ui` with the same API feel (Radix behaviour, no Radix dependency).
2. **No database** — mock data in code, confirmed. Rationale: a DB adds hosting, credentials, migrations and seed
   time before the first screen exists. The prototype must open with `npm run dev` and nothing else.
3. **Sign-in is a password form only** (confirmed) — email + password, no role cards. Demo credentials for the
   eight departments are listed in §3 and are also kept in `docs/demo-accounts.md` for whoever demos it.
4. **Readable dataset** (confirmed): ~120 beneficiaries and the volumes in §4, so every KPI equals what the
   lists show. KPI numbers are not faked independently of the data.
5. **Visual brief: the owner is supplying the dashboard screenshot** (`/docs/ui-reference/dashboard-reference.png`).
   Until it arrives, Step 1 waits; colours come from §9.2 tokens and layout from §10.1, and the screenshot wins
   where the two disagree (§9.1).
6. **English only**, strings in one file (`lib/strings.ts`) — PRD §13.2 assumption 1.
7. **Financial year April–March**, IST display, `numeric` money formatting in Indian grouping — §8.1, §9.7.
8. **Derived values are computed, never stored** (member counts, savings balances, participant counts, % achieved)
   exactly as §4.1 requires, so list/detail/dashboard always agree.

---

## 3. Roles, demo logins and landing pages (PRD §1.3, §8.5)

All eight departments get a login. Same password for demo use: `Voice@2026` (10 chars, per §5.2).

Signed in with the **password form only** (no role buttons); the table below is the demo credential list.

| Role (code) | Demo user | Email | Password | Lands on |
| --- | --- | --- | --- |
| Executive Director / CAO (`admin`) | Asha Deshmukh | asha.deshmukh@voicetrust.org | `Voice@2026` | `/dashboard` |
| Programme Manager (`programme_manager`) | Pranav Joshi | pranav.joshi@voicetrust.org | `Voice@2026` | `/dashboard` (own programmes) |
| Project Coordinator (`project_coordinator`) | Meera Kulkarni | meera.kulkarni@voicetrust.org | `Voice@2026` | `/dashboard` (assigned projects) |
| MEL Officer (`mel_officer`) | Sameer Patil | sameer.patil@voicetrust.org | `Voice@2026` | `/dashboard?tab=mel` |
| Field Staff (`field_staff`) | Ravi Shinde | ravi.shinde@voicetrust.org | `Voice@2026` | `/home` |
| HR / Admin (`hr_admin`) | Neha Kadam | neha.kadam@voicetrust.org | `Voice@2026` | `/dashboard/hr` |
| Finance (`finance`) | Suresh Naik | suresh.naik@voicetrust.org | `Voice@2026` | `/dashboard/finance` (budget card stub) |
| Data Entry (`data_entry`) | Pooja More | pooja.more@voicetrust.org | `Voice@2026` | `/home` (task list only) |

The sign-in screen is a normal email + password form with validation, a wrong-password error that says what to
fix (§9.6) and lockout after 5 failures (§5.2). After success the landing redirect is decided on the server from
the session role, so a field staff user cannot reach `/dashboard` by typing the URL (§7.1 acceptance).

---

## 4. Dummy dataset (deterministic seed)

`lib/data/seed.ts` builds one object graph, seeded with a fixed number so every reload is identical:
Murbad / Kalyan villages from the PRD wireframes.

| Entity | Rows | Notes |
| --- | --- | --- |
| Villages | 18 | 3 districts → 4 blocks → villages, real Marathi/Hindi names |
| Donors | 4 | grant periods, approved budgets |
| Programmes | 3 | Agriculture, SHG/Livelihood, Disability Inclusion (GAP) |
| Projects | 6 | linked to donor + programme, 2 draft / 3 active / 1 completed |
| Project ↔ villages | 24 | |
| Employees | 14 | across 6 departments, 2 exited for history |
| Project allocations | 16 | totals never exceed 100% per employee |
| Beneficiaries | 120 | code `BEN-000001…`, gender mix, DOB for age, mobile, last-4 ID, consent date |
| Beneficiary ↔ project | ~150 | |
| Farmers | 46 | crops in child rows, organic status, GPS |
| SHGs | 4 | one per village cluster, members with roles |
| SHG members / savings | 32 / ~90 | deposits and withdrawals by meeting date |
| PWD profiles | 18 | disability type, %, certificate, interventions, follow-ups |
| Activities | 30 | all 6 types, past 12 months, village + project |
| Participants | ~450 | drives gender/age derived counts |
| Indicators / values | 12 / 40 | monthly & quarterly, target vs achievement |
| Leave types / requests | 4 / 9 | pending queue for inbox rail |
| Attendance | last 14 days × 14 employees | present/leave/field duty mix |
| Audit log | ~40 | created by the seed's own actions |

Counts are chosen so charts and KPIs look real without a 50,000-row seed (§8.1's performance target is a
production goal, not a prototype goal).

---

## 5. Module dependency order ("least dependency first")

```
foundation (tokens, shell, auth, session, rbac, format, audit)
   └─> masters: villages, donors, programmes, projects   (everything references these)
          └─> dashboard (aggregates only — reads masters)
          └─> beneficiaries ─┬─> farmers
                             ├─> SHGs (members, savings)
                             └─> PWD (sensitive)
          └─> activities (needs projects + villages + beneficiaries)
                 └─> MEL (needs projects)
          └─> HR-lite (employees, attendance, leave) — independent of programme data
```

Villages first because villages, projects and beneficiaries are all unreachable without them; HR-lite is
last because it shares nothing with the programme side and can be built without touching other modules.

---

## 6. Build steps (we do these one at a time, each reviewed before the next)

### Step 1 — Login + starting page + sidebar  ← **we start here**
- Foundation: Next.js app, TS strict, token CSS from §9.2, Inter + Noto Sans Devanagari.
- `AppShell` (§9.3): 240px sidebar with workspace switcher, the five groups (Overview, People, Work,
  Organisation, Admin), user card pinned bottom; centre column with greeting, search affordance, primary
  button and the sticky filter bar; right Inbox rail at ≥1440px, drawer 1100–1440px, hidden <1100px.
- Sign-in screen: email + password form only, validation, wrong-password and locked-out states, "Forgot password"
  screen (mock reset flow, no email sent) — §7.1.
- Server-side session cookie, `getSession()`, role → landing redirect, `PermissionGate` plus nav filtering by role.
- Executive dashboard for `admin` (§8.2): KPI row (beneficiaries reached, active projects, activities this FY,
  villages covered), paired-bar monthly activity chart, Reach breakdown card with segmented bar,
  recent activities list, inbox rail. Programme/project/coordinator roles see the same page with their
  scoped numbers; the other four roles get their own landing (`/home`, `/dashboard/hr`, `/dashboard/finance`).
- All four states on every widget (loading skeleton, empty, error + retry, populated). Counts clickable and
  already wired to the (not yet built) list routes so drill-down works as those land.
- **Done when:** you can sign in as all 8 roles, each lands on its own page, sidebar shows only permitted items,
  a `field_staff` is refused `/dashboard` by URL, and the dashboard matches the wireframe in §10.1.

### Step 2 — Masters: villages, donors, programmes, projects
URL-driven list with search/filters/pagination, detail pages with the tabs in §7.2, create/edit forms as a
560px drawer, archive confirm dialogs, village cascade filter, CSV export of the current view.

### Step 3 — Beneficiary registry
List (§10.2 columns), sectioned registration flow (§7.3, mobile-first, keyboard-only, <90s), duplicate warning
panel, detail page with tabs (§10.3), archive.

### Step 4 — Profiles: Farmer, SHG, PWD
Farmer form + crops repeatable rows; SHG group/members/savings grid; PWD with the "Confidential. Views are
logged." banner, `view_sensitive` audit row, and MEL aggregate-only view.

### Step 5 — Activities
List + calendar toggle, form, participants tab with bulk-add-by-village, derived counts, attachments UI.

### Step 6 — MEL
Indicator list with % achieved and On track / Behind / No data chips, value entry per period with the
male + female = total rule.

### Step 7 — HR-lite + HRMS dashboard
Employees, allocation, attendance grid, leave request/approval with balance and overlap checks, HRMS dashboard
widgets (§8.3), leave approval updating attendance.

### Step 8 — Admin surfaces + hardening pass
Users list/form with scopes, audit log with filters and CSV, budget card, 390px pass on field screens,
keyboard/contrast pass, then `/docs/progress.md` and `/docs/decisions.md` filled in.

---

## 7. Structure (from §3.1, adapted)

```
src/
  app/
    (auth)/sign-in/            login + error states
    (app)/layout.tsx           AppShell + session guard
    (app)/dashboard/           executive / programme, /hr, /finance
    (app)/home/                field staff + data entry
    (app)/beneficiaries/ shgs/ activities/ mel/ employees/ attendance/ leave/
    (app)/programmes/ projects/ villages/ donors/ users/ audit/
    dev/styleguide/            token + component proof page
  modules/<module>/            schema.ts validators.ts queries.ts actions.ts components/
  components/ui/               button, input, select, dialog, drawer, tab, pill, toast, skeleton
  components/app/              AppShell, DataTable, FilterBar, KpiCard, ReachBand, ChartCard,
                               SegmentedBar, DeltaPill, InboxRail, StatusPill, EntityPicker,
                               FormSection, Field, ConfirmDialog, EmptyState, Timeline, PermissionGate
  lib/                         session.ts rbac.ts audit.ts format.ts strings.ts data/(seed, store)
  styles/tokens.css
docs/                          decisions.md progress.md ui-reference/
```

PRD §4 field names are used verbatim so the mock types read like the real schema.

## 8. Verification per step

- `npm run build` (type-check + production build) passes; `npm run dev` answers on localhost.
- The step's own acceptance criteria from §7 are walked through in the browser preview.
- Role checks: each affected role's landing, nav, and a direct-URL denial.
- `Skills/mwg` is consulted through the Modern Web Guidance CLI (`search` → `retrieve`) before writing UI
  patterns (dialog light-dismiss, responsive tables, container queries, segmented bar semantics), so the
  prototype uses native platform features instead of ad-hoc JS.

## 9. Status of the open questions

All four are settled (see §2): mock data, owner-supplied screenshot, password-only login, readable dataset.

**Only blocker before Step 1:** the reference screenshot at `docs/ui-reference/dashboard-reference.png`.
Step 1 starts as soon as it is in the folder; if you would rather not wait, say so and I will build Step 1
from the §9.2 tokens and the §10.1 wireframe and adjust colours once the image lands.
