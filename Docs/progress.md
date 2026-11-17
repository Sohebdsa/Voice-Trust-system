# Progress log

Updated after every milestone, per PRD §0.7.

## Step 1 — Shell, sign-in for all 8 departments, starting pages — DONE

Built:

- Next.js 15 App Router + TypeScript strict; tokens from PRD §9.2 corrected against
  `Docs/ui-reference/dashboard-reference.png`.
- App shell from the reference: 240px sidebar with workspace switcher, five nav groups
  (Overview, People, Work, Organisation, Admin), active-item highlight and user card with
  sign-out; centre column with greeting, search affordance, primary action and filter pills.
  The Inbox is not a permanent column: a top-bar icon with an unread count opens it as a
  native popover panel below the bar, and the same icon (or Escape, or an outside click)
  closes it. Sidebar collapses to an icon rail below 1100px and stacks below 768px.
- Sign-in (email + password), forgot-password screen, 5-attempt lockout, server-side session
  cookie, role → landing redirects, and a `requireRole` guard on every page.
- Starting pages per PRD §8.5: `/dashboard` (executive/programme/coordinator, MEL variant),
  `/dashboard/hr`, `/dashboard/finance`, `/home` (field staff + data-entry task list).
- Executive dashboard: KPI row, paired-bar monthly activity chart, Reach breakdown with the
  segmented bar, target-vs-achievement meters, gender participation stacks, recent activities,
  budget summary card, Inbox action items.
- Deterministic dummy dataset (`lib/data/seed.ts`): 18 villages, 4 donors, 3 programmes,
  6 projects, 14 employees, 120 beneficiaries, 46 farmers, 4 SHGs (32 members, savings),
  18 PWD profiles, 30 activities with participants, 12 indicators with values, 9 leave
  requests, 14 days of attendance, 40 audit rows, 16 project allocations.
- Role scope helpers standing in for RLS: programme manager sees own programmes, coordinator
  sees assigned projects, field staff sees assigned villages; `/dashboard` refuses
  `field_staff` by URL.
- Every module that is not built yet resolves to a placeholder that states its step and PRD
  section, so the sidebar and KPI drill-downs never 404.

Verified:

- `npx tsc --noEmit` — clean.
- `npm run build` — compiled, 10 routes generated.
- Dev server on `http://localhost:3100` (registered as the thread preview).
- Signed out: `/sign-in` 200; `/dashboard` and `/` return 307 to sign-in.
- Signed in as `admin` (Asha): `/dashboard` renders KPI row, chart, reach breakdown, recent
  activities, indicators, gender stacks, budget card; `/home` redirects back to `/dashboard`
  (role guard works in the deny direction).
- Signed in as `field_staff` (Ravi): lands on `/home` with only 3 assigned villages, 21
  beneficiaries and 7 activities; the sidebar drops Dashboard/Leave/Users; typing
  `/dashboard` redirects to `/home`.
- Signed out from the sidebar (server action + cookie cleared).
- Authenticated route sweep: `/dashboard`, `/dashboard/hr`, `/dashboard/finance`, `/attendance`,
  `/beneficiaries`, `/activities`, `/mel`, `/villages`, `/users`, `/audit` all 200;
  `/home` 307 for a role that may not see it. HR page checked for its five sections.
- Monthly chart data spreads three activities per month for ten months, with four planned, so the
  chart and delta have real movement.

Not verified yet: correct-password-vs-wrong-password error copy in the browser (the lockout path
is exercised only in code), keyboard-only registration (Step 3), the 50,000-row performance
target, and the full cross-role access matrix (it needs the modules in Steps 2–7).

## Alignment pass — dashboard vs the source PDF (Part B)

Checked the prototype against `VOICE_Trust_Data_Structures_and_Dashboards 01.pdf`; full
mapping in `Docs/gap-analysis.md`. Corrected:

- Executive dashboard now carries the PDF's eight KPIs (total beneficiaries, farmers
  registered, SHGs formed with members, PWD/GAP, active projects, activities this period,
  trainings conducted, villages covered) instead of four.
- Added the missing charts: beneficiary distribution donut, project-wise coverage, top
  villages, district/block coverage. Gender stacks, 12-month volume and target vs achievement
  were already there.
- Quick filters are real now: period, programme, project, district → block → village, cascading
  and mirrored in the URL, replacing decorative pills.
- `GET /api/dashboard/export` returns a CSV of the filtered view (session-guarded).
- Fixed a bug where the filter bar wrote `programmeId` to the URL while the parser read
  `programme`, so filtering did nothing.
- HR staff allocation led with a summed FTE (260%) — now shows staff count and the FTE total.

Verified: typecheck clean, production build passes with the new route, all eight KPI labels and
six filter selects render, `?village=vil-0001&range=month` narrows the numbers (115 → 6
beneficiaries), programme selection updates the URL and KPIs (86 beneficiaries, 2 active
projects) and cascades the project dropdown to that programme's two projects, CSV export returns
`text/csv` with filter metadata and values.

## Text overflow pass

Labels were spilling past card borders and the sidebar because `overflow: hidden` /
`text-overflow: ellipsis` sat on inline `<span>`s, where they do not clip, and because flex/grid
tracks had no `min-inline-size: 0` to let a label shrink. Fixed as a layer rather than
case-by-case — see "Text overflow" in `src/styles/app.css`:

- Truncating labels are blockified and given a shrink allowance: sidebar workspace name and
  email, user name and role, card-head titles, row title/subtitle, bar-list labels, inbox title.
- Card heads, meter tops, stacked labels, rows and inbox cards now shrink the label and keep the
  number, pill, icon and link at their natural width, so numbers never wrap or get clipped.
- Multi-line detail in inbox cards uses line-clamp: 2 with an explicit 1.45 line-height and a
  `max-block-size` of two lines; row titles/subtitles use a 1.35 line-height so two-line rows stay
  inside their 56px row.
- Filter selects truncate the chosen option with an ellipsis; long prose (notes, footnotes, alerts,
  empty states) breaks long tokens instead of spilling.
- Small markup wrappers added: `.row-aside`, `.inbox-title`, `.topbar-lead`.

Measured with `scrollWidth - clientWidth` over every element on the dashboard, HR dashboard and
finance pages at 390, 820, 1152 and 1440 px with the inbox drawer open: no text overflows its box
at any of those widths, and no card, row or meter clips vertically. Typecheck clean.

## Ponytail skill

Installed `DietrichGebert/ponytail` at commit `96608e0` into `Skills/ponytail/`, together with its
five companion skills (`ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`,
`ponytail-help`), and registered all six in `skills-lock.json` beside `modern-web-guidance`. Its
always-on ruleset is now the project's `AGENTS.md`, so it applies every session; the default level
is `full`. It governs size and scope only — `Skills/mwg` still comes first for HTML/CSS and
client-side JS patterns.

First audit under it is recorded in the conversation: no code changed, findings ranked by cost.

## Step 2 — masters (villages, donors, programmes, projects)

Built the four records that everything else references, as one shared module rather than four copies:

- `lib/masters.ts` — entity metadata, the §5.1 permission map (admin creates and archives; programme
  manager and project coordinator update only within their scope), the field definitions for all four
  forms, and the shared validators.
- `lib/queries/masters.ts` — scoped lists returning `{ rows, total }` with search, district/block/programme/
  donor/status filters and paging at 10; detail queries for the tabs; derived beneficiary and project counts.
- `app/actions/masters.ts` — one `saveMaster` for create/update with a per-entity patch, generated codes
  (`VIL-019`, `PRJ-007`, …) that are never editable, and one `archiveMaster`; both write audit rows.
- `components/app/master-list.tsx` — filters, table, pager and the 560px drawer in one place; the four list
  pages only declare columns and filters. `master-detail.tsx` supplies the detail header, section tabs,
  fact list and the archive confirmation.
- `components/app/data-table.tsx` — semantic table with a caption, sticky headers, a scrollable labelled
  region, and a container-query stacked layout below 720px (Modern Web Guidance: responsive-table).
- Detail tabs are links with `aria-current`, not the ARIA tab widget, because they change the page
  (Modern Web Guidance: tabs).
- `api/masters/export` — CSV of the current filters, with an `export` audit row.
- `lib/csv.ts` — one CSV writer for the dashboard and masters exports; it prefixes `= + - @` cells with an
  apostrophe so a record name cannot run as an Excel formula.
- `styles/masters.css` — table, filter search, drawer, tabs and fact styles; imported after `app.css`.
- The four modules were removed from the `[...slug]` placeholder map, so every nav item in Step 2 now
  reaches a real screen.

Verified: typecheck clean; list counts match the seed (18 villages, 4 donors, 3 programmes, 6 projects);
`?q=kalyan`, `?district=Thane`, `?programme=prg-0001` and `?page=2` each narrow or page the list as asked;
all detail tabs render; `field_staff` is redirected from `/donors` and `hr_admin` from `/villages`, and an
anonymous CSV request gets 401; CSV carries the filter and no internal ids. In the browser, creating a
village rejected an empty block with "Block is required." and then saved (`VIL-019`, 19 records, two pages,
new row in the export); creating a project rejected an active project with no village and a reversed end
date, then saved with a village attached (`PRJ-007`), and the dashboard's active-project count moved 4 → 5
from the same store.

Deliberately not built in this step: village CSV import (§7.2 lists it under masters, but the plan put it
with the later import flow), and editing project team allocations — the tab is read-only until the employee
module lands in Step 7.

## Step 3 — Beneficiary registry — DONE (dev server; production build unverified, see IG-10)

Built:

- `src/lib/beneficiaries.ts` — permissions map (§5.1), field definitions, validators, URL helpers.
- `src/lib/queries/beneficiaries.ts` — scoped list (`{ rows, total }`), detail builder, duplicate
  finder (`findDuplicates`), form options.
- `src/app/actions/beneficiaries.ts` — `saveBeneficiary` (create/update + audit), `archiveBeneficiary`.
- `src/components/app/beneficiary-filters.tsx` — URL-driven cascade filter (district → block → village,
  plus gender, profile type, project, status, date range, search).
- `src/components/app/beneficiary-form.tsx` — 7-section registration form matching the master drawer
  pattern (`.form-grid`, `.form-section-title`, `.drawer`, `.drawer-foot`, `.checks`).
- `src/app/(app)/beneficiaries/page.tsx` — list page with inline drawer, all §10.2 columns.
- `src/app/(app)/beneficiaries/[id]/page.tsx` — detail with 7 tabs (Profile, Farmer, SHG, PWD,
  Projects, Activities, Timeline); PWD tab writes `view_sensitive` audit row.
- `src/app/api/beneficiaries/export/route.ts` — session-guarded CSV export (note: IG-01 fix needed
  to export all pages, not just the first 10).
- `src/app/not-found.tsx` — added (was missing, caused `/_not-found` invariant build error).
- CSS: added `.form-section-title` to `src/styles/masters.css`.

Known gaps filed in `Docs/gap-analysis-v2.md`:
- IG-01: CSV export returns first 10 rows only (fix: raise pageSize in export route).
- IG-02: Duplicate guard fires on save only, not on mobile-blur (PRD §7.3).
- IG-03: Photo upload is a stub (no file input; `photoPath` is never written).
- IG-04: Village cascade shows all villages, not role-scoped villages.
- IG-05: PWD audit row written on every render, not just first open.
- IG-06: Consent checkbox value `"on"` vs validator `"true"` mismatch.
- IG-07: Detail page missing FilterBar (inconsistent with master detail pages).
- IG-10: `npm run build` unverified for the new `[id]` route (EPERM on Windows/OneDrive).

Not built in Step 3 (by design):
- Farmer / SHG / PWD profile forms — Step 4.
- Activity participant tab — Step 5.
- Village CSV import — Step 7–8.
- Project team allocation write path — Step 7.

## Gap analysis — full workflow and implementation audit

Created `Docs/gap-analysis-v2.md`: three-layer audit (PRD vs implemented vs logical workflow).
Covers 8 workflow gaps (WF-01 to WF-08), 10 implementation gaps (IG-01 to IG-10), 7 tech-debt
items, and a Step 4–8 pre-flight checklist. Each issue names the files to change and the
acceptance criterion. See that document before starting any subsequent step.

## Remediation Pass — Fixing identified gaps & workflow connections — DONE

Addressed the identified gaps and workflow holes with standard patterns matching the PRD and organization goals:

1. **WF-01 (Donor funding flow & enrollment):**
   - Added `DonorDisbursement` to schema (`src/lib/data/types.ts`) and seeded grant tranches across donors and projects (`src/lib/data/seed.ts`).
   - Added `recordDisbursement` server action in `src/app/actions/masters.ts` writing to `db.donorDisbursements` and `db.audit`.
   - Enhanced `/donors/[id]` with Grant & Funding Flow cards (approved ceiling, total disbursed, remaining balance), Grant Disbursements & Tranches table, and an inline "Record disbursement" drawer for enrolling tranches to active projects.
   - Enhanced `/projects/[id]` Budget tab to display funding donor details, total grant funds disbursed to date, outstanding releases, and history of tranches received.
2. **WF-04 (SHG project links):**
   - Added `projectIds: string[]` to `Shg` schema and linked active SHGs with projects in seed.
3. **IG-01 (Beneficiaries CSV export):**
   - Updated `src/app/api/beneficiaries/export/route.ts` to export all matching records (verified: all 120 beneficiaries exported).
4. **IG-02 (Duplicate check on mobile blur):**
   - Added `checkDuplicateMobile` server action in `src/app/actions/beneficiaries.ts`.
   - Wired `handleMobileBlur` in `src/components/app/beneficiary-form.tsx` to detect duplicate mobile entries on blur and immediately display the warning panel.
5. **IG-03 (Beneficiary photo capture & storage):**
   - Added `photoPath` to `Beneficiary` and `BeneficiaryFormValues`.
   - Added Section 5 in `beneficiary-form.tsx` with live file/camera capture (`capture="user"`), data URL preview, and removal.
   - Rendered photo thumbnail in `beneficiaries/[id]/page.tsx` with DPDP compliance notice.
6. **IG-04 (Village cascade role-scoping):**
   - Fixed `beneficiaries/page.tsx` to pass `scopedVillages` to `BeneficiaryFilters`.
7. **IG-05 (PWD audit deduplication):**
   - Debounced `view_sensitive` audit rows in `beneficiaries/[id]/page.tsx` to at most 1 entry per user per record per 10 minutes.
8. **IG-06 (Consent validator):**
   - Verified and aligned `validateBeneficiary` to handle both `"true"` and `"on"` checkbox values.
9. **IG-08 (Inbox role guard):**
   - Scoped duplicate beneficiary inbox item to only display for roles permitted to access `/beneficiaries`.
10. **IG-09 (Semantic form markup):**
    - Changed `<h3 className="form-section-title span-2">` to `<p className="form-section-title span-2">`.
11. **TD-01 (Production session secret guard):**
    - Added check in `src/lib/session.ts` to throw if `SESSION_SECRET` is unset in production.
12. **TD-02 (Dashboard filter param deduplication):**
    - Exported `DASHBOARD_FILTER_PARAM_MAP` from `dashboard-filters.tsx` and reused in `dashboard/page.tsx`.

Verified: `npm run typecheck` clean (0 errors), authenticated HTTP checks 200 on all routes.

## Step 4 — Farmer profiles, SHG (groups, members, savings), PWD (sensitive, audited) — DONE

Built:

- **Farmer Profiles (PRD §7.4):**
  - Schema extension with land holding, ownership, farming practice, organic status, irrigation source, organic practices, support/equipment received, GPS latitude/longitude, followup notes, and repeatable seasonal crop rows (`farmer_crops`).
  - `/farmers`: Farmer registry list with village, organic status, and crop cascade filters, text search, pagination, and a drawer form with live mobile GPS capture (`navigator.geolocation`) and repeatable seasonal crop rows.
  - Integration with `/beneficiaries/[id]?tab=farmer`: Displays full farmer profile, crops table, GPS coordinates, and provides direct "+ Add Farmer Profile" and "Edit Farmer Profile" drawers.
- **Self-Help Groups (PRD §7.5):**
  - Schema for `Shg` with base village, formation date, meeting frequency, and supporting `projectIds` junction.
  - `/shgs`: Group list with active member count and total group savings derived from transactions.
  - `/shgs/[id]`: Detail page with 4 tabs:
    - *Overview*: Governance facts, meeting frequency, and office bearers.
    - *Members*: Member roster with designations (President, Secretary, Treasurer, Member), join date, savings balance, and "+ Add Member" drawer enforcing the single President, Secretary, and Treasurer rule (PRD §4.7).
    - *Savings Ledger*: Transaction history and "+ Record Meeting Savings" fast-entry multi-member grid committing savings in one transaction.
    - *Linked Projects*: Supporting development projects.
- **PWD / GAP Sensitive Profiles (PRD §7.6):**
  - Schema for `PwdProfile`, `PwdIntervention`, and `PwdFollowup`.
  - Strictly role-guarded access: accessible only to `admin`, `programme_manager`, `project_coordinator`, `mel_officer`, and `field_staff`; unauthorized roles (`data_entry`, `hr_admin`, `finance`) are denied and redirected.
  - `/pwd`: Confidential PWD list with DPDP audit warning banner, filters for village and disability category, and drawer form.
  - Integration with `/beneficiaries/[id]?tab=pwd`: Confidential profile view with UDID certificate, education, vocational status, accessibility needs, interventions table, and field follow-ups timeline with "+ Add Follow-up Note" drawer.
  - Every individual view continues to be debounced and logged in the security audit trail.
- Removed `farmers`, `shgs`, and `pwd` placeholders from `src/app/(app)/[...slug]/page.tsx`.

Verified:
- `npm run typecheck` — 0 errors.
- Dev server route verification:
  - `/farmers` (200 OK)
  - `/shgs` & `/shgs/shg-0001` (200 OK across Overview, Members, and Savings tabs)
  - `/pwd` (200 OK for admin; 307 redirect for data entry role)
  - `/beneficiaries/ben-0001?tab=farmer` (200 OK)
  - `/beneficiaries/ben-0001?tab=pwd` (200 OK)

## Refinement — Tooltip-based warnings rather than upfront alert banners — DONE

Converted disruptive upfront warning alert banners into compact, accessible status badge pills with rich hover/focus tooltips:
- **CSS Tooltip Infrastructure (`src/styles/app.css`):**
  - Pure CSS `.tooltip-wrap` using `:hover`, `:focus`, `:focus-visible`, and `:focus-within` with `::after` and `::before` pseudo-elements.
  - Supports `data-tooltip`, `data-tooltip-pos="bottom"`, and `data-tooltip-align="right"`. Zero JavaScript or external dependencies.
- **PWD Confidentiality Warnings:**
  - `/pwd`: Replaced the 60px full-width upfront warning banner with an elegant `Confidential ⓘ` pill in `Topbar`'s secondary action area displaying the DPDP Act & PRD §5.2/§7.6 audit notice on hover/focus.
  - `/beneficiaries/[id]?tab=pwd`: Replaced the banner above beneficiary facts with an inline badge next to the profile section title.
  - `pwd-form.tsx`: Replaced the top-level form warning banner with an inline badge next to Section 1 ("Disability Details").
- **Beneficiary Duplicate Contact Warning:**
  - `beneficiary-form.tsx`: Removed the large jarring alert box above the form grid that pushed down inputs on blur. Positioned a compact `Duplicate match ⓘ` badge inline next to the "Mobile number" label with the full match details in the tooltip, paired with an inline "Ignore & proceed" action button.
  - `beneficiary-filters.tsx`: Added an accessible descriptive tooltip to the "Showing duplicate mobiles" active filter badge.

Verified: `npm run typecheck` clean (0 errors), dev server HTTP tests 200 OK with `Tooltip: true` and `UpfrontWarnAlert: false`.

## Step 4 Prototype Gap Fixes — DONE

Focused, lightweight fixes to make Step 4 flows function cleanly:
1. **Dashboard Profile Filter Alignment:** Updated `src/lib/queries/beneficiaries.ts` and `beneficiary-filters.tsx` so `/beneficiaries?profile=farmers` (and plural forms) correctly filters beneficiaries down to the 46 farmers.
2. **MEL Officer PWD Aggregation (PRD §7.6):** Updated `/pwd/page.tsx` so `mel_officer` role receives an aggregated breakdown matrix (disability category × gender count), hiding individual beneficiary names and UDID certificates.
3. **SHG Member Deactivation (PRD §7.5):** Added `removeShgMember` action in `src/app/actions/profiles.ts` and inline "Deactivate" action button in `src/app/(app)/shgs/[id]/page.tsx` to set status to `inactive` and preserve savings history.
4. **SHG Meeting Savings Total:** Added `<tfoot>` meeting total row to the fast-entry savings grid drawer in `src/app/(app)/shgs/[id]/page.tsx`.
5. **PWD Intervention Workflow (PRD §4.6 / §7.6):** Added `addPwdIntervention` action and "+ Add Intervention" drawer on `/beneficiaries/[id]?tab=pwd`.
6. **Farmer Multi-Cropping & GPS Error Display (PRD §7.4):** Added dynamic multi-cropping area hint and accessible error text for GPS coordinates in `farmer-form.tsx`.

Verified: `npm run typecheck` clean (0 errors), HTTP route checks 200 OK.

## Next

Step 5 — Activities with participant attendance (bulk add by village), calendar toggle, attachments UI, and derived gender participation counts.
