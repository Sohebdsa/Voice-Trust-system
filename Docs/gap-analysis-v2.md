# Gap Analysis v2 — VOICE Trust MIS Prototype

**Prepared:** 2026-11-17  
**Scope:** Steps 1–3 implemented vs PRD (master authority), source PDF, and logical workflow completeness  
**Authority order:** PRD §0 → source PDF → prototype decisions.md  
**Audience:** agents picking up Steps 4–8 and any hardening work  

> [!IMPORTANT]
> This document is meant to be **actioned, not archived**. Each issue below names the file(s) to change, the exact fix, and the acceptance criterion. Issues are grouped by kind, then by severity (🔴 critical · 🟡 medium · 🟢 low / cosmetic).

---

## Section 1 — Workflow Gaps the Organisation Missed

These are **logical holes** in the product design itself, not implementation bugs. The org built the data structures and the screens but left the connections between them undefined. A user hitting these in production would have no path forward.

---

### WF-01 🔴 Donor funding is recorded but never disbursed or tracked

**What was built:** A donor record has `approvedBudget` (the total grant ceiling). A project has `donorId` + `approvedBudget`. That's it.

**What is missing:**  
There is no way to record that *Ambuja Cement Foundation actually transferred ₹5 lakhs in Q1 against their ₹20 lakh grant to project PRJ-001.* The finance dashboard's budget card shows static seed numbers. There is no disbursement table, no tranche record, no utilisation tracking.

**Why this matters:**  
- Field staff add beneficiaries and log activities. Programme managers track those against projects. But no one can answer: "How much of the grant has actually been received? How much is still undrawn?"
- Donors often disburse in tranches (e.g., 40% on signing, 30% at mid-term, 30% at close). Without tranche recording, the system can't flag when to raise an installment request.
- PRD §8.4 says the budget card shows "approved budget per active project and total. Expenditure and utilisation show 'Available once Finance module is enabled.'" This defers expenditure tracking to Phase 2 — but **grant receipts** (money coming in) are not an expenditure record; they're a funding event that belongs in the MVP's donor picture.

**Recommended fix for Phase 1.5 (minimal, before full Finance module):**  
Add a `DonorDisbursement` child table to the donor detail page:

```
donor_disbursements
  id, donor_id fk, project_id fk, amount numeric(14,2),
  disbursed_on date, notes text, recorded_by, recorded_at
```

UI: "Disbursements" tab on the Donor detail page — a simple list + "Record disbursement" drawer. The budget card on the Project detail can then show:  
> Approved: ₹20,00,000 · Received: ₹5,00,000 · Balance due: ₹15,00,000

**Files to change:**  
- `src/lib/data/types.ts` — add `DonorDisbursement` type  
- `src/lib/data/seed.ts` — add 2–3 seed disbursements per donor  
- `src/lib/queries/masters.ts` — add `getDonorDisbursements(donorId)`  
- `src/app/actions/masters.ts` — add `saveDisbursement` action  
- `src/app/(app)/donors/[id]/page.tsx` — add Disbursements tab  
- `src/styles/masters.css` — no new styles needed; reuse `.facts-grid`, `.drawer`

**Acceptance:** Creating a disbursement record appears in the donor's Disbursements tab; the project budget card updates its "Received" figure; an audit row is written.

---

### WF-02 🔴 Beneficiary enrolled in a project has no path to record what they received

**What was built:** A beneficiary can be enrolled in a project (`beneficiary_projects`). A project has activities. Activities have participants (`activity_participants`).

**What is missing:**  
The enrollment link carries only `enrolledOn`. There is no record of what the beneficiary actually received through that project — no outputs, no deliverables, no exit status. The PRD §10.3 beneficiary detail page has a "Projects" tab, but that tab is currently read-only (shows enrolled projects from seed). The "Activities attended" tab is also read-only seed data.

The gap: a field staff member enrolls Sunita Patil in "Soil Health 2025." Six months later, the MEL officer needs to report how many enrolled beneficiaries attended at least 3 trainings, completed the full curriculum, and received a certificate. There is no path to record or query this.

**Why this matters immediately:**  
Donor reports almost always require "X% of enrolled beneficiaries achieved outcome Y." Without even a simple attendance-to-enrollment bridge, the MEL module's indicators have no ground truth to draw from.

**Recommended fix:**  
1. The Activity → Participants tab (Step 5) is the write path. **Prioritise Step 5 implementation** — bulk-add beneficiaries by village to an activity, mark attended. This is already in the PRD (§7.7) and already in the seed (`ActivityParticipant`).  
2. Add a computed "Activities attended" count to the `beneficiary_projects` join so the Projects tab on the beneficiary detail can show: Enrolled 14 Mar 2025 · 4 activities attended.

**Files to change (Step 5 is the fix):**  
- `src/app/(app)/beneficiaries/[id]/page.tsx` — Activities tab currently shows seed data; wire it to `db.activityParticipants.filter(p => p.beneficiaryId === id)`
- After Step 5 lands: computed count on the Projects tab

---

### WF-03 🔴 Beneficiary detail has profile tabs but no way to add profiles

**What was built:** Beneficiary detail has tabs: Profile, Farmer, SHG, PWD, Projects, Activities, Timeline. The Farmer/SHG/PWD tabs show "Coming in Step 4."

**What is missing:**  
The registration form (Step 3) has an *optional* final step ("Add a Farmer, SHG membership or PWD profile") but it was left as a [step 4] placeholder in the form too. This means:

- A field staff member registers Sunita Patil as a beneficiary.
- Sunita is a farmer. The field staff member cannot add her farmer profile.
- The farm profile chips on the beneficiary list (`Farmer`, `SHG`, `PWD`) will all be blank for every new registration until Step 4 is built AND the field staff goes back to find her.
- The dashboard KPI "Farmers registered: 46" is seed-only. It will not change after any new registration.

**Recommended fix:**  
Step 4 (Farmer, SHG, PWD forms) must land before the beneficiary module is considered complete. The "Add farmer profile" button on the beneficiary detail page, and the optional Step 7 of registration, should both be active. This is already planned — this note is a priority flag, not a new requirement.

**Files to change (Step 4 is the fix):**  
- `src/app/(app)/beneficiaries/[id]/page.tsx` — replace "Coming in Step 4" with real forms once Step 4 lands  
- `src/components/app/beneficiary-form.tsx` — Step 7 of registration (the profile quick-add) should be enabled after Step 4 is built

---

### WF-04 🟡 SHG group has no link to projects

**What was built:** `Shg` has `villageId`. PRD §4.7 defines `shg_projects (shg_id fk, project_id fk)`. The seed does not populate `shg_projects`.

**What is missing:**  
SHG detail page (Step 4) is planned to have a "Linked projects" tab (PRD §7.5). Without `shg_projects` junction records, no SHG can be shown as benefiting from a project, and the project-wise beneficiary coverage chart cannot count SHG members.

**Recommended fix:**  
- Add `shgProjectIds: string[]` to the `Shg` type (already exists as a shape in the PRD)  
- Populate 2–3 seed links in `seed.ts`  
- When Step 4 builds the SHG module, wire the Linked projects tab from this junction

**Files to change:**  
- `src/lib/data/types.ts` — add `projectIds: string[]` to `Shg`  
- `src/lib/data/seed.ts` — link SHGs to projects  
- Step 4 agent: query `db.shgs.filter(s => s.projectIds.includes(projectId))` for the project's SHG coverage

---

### WF-05 🟡 MEL indicators are linked to projects but activities are not linked to indicators

**What was built:** `Indicator` has `projectId`. `IndicatorValue` records target vs achievement per period. `Activity` has `projectId`. They are in the same project but are **not connected**.

**What is missing:**  
When a training activity is marked completed with 42 participants, the MEL indicator "Number of farmers trained" should potentially increment. Currently, the MEL officer must enter the value manually in the Indicators module with no reference to activity data. This means:
- Double data entry (activity logged AND indicator value entered separately)
- No cross-check ("You logged 3 training activities this quarter with 120 participants, but your indicator shows 50 trained — reconcile?")

**Recommended fix (minimal for MVP):**  
On the Indicator Value entry form (Step 6), add a read-only "Activity basis" section that shows activities of the matching type in the same project during the period. The MEL officer can see the data and decide what value to enter. No auto-calculation — that avoids scope creep.

**Files to change (Step 6 agent):**  
- `src/lib/queries/` — add `getActivitiesForPeriod(projectId, fromDate, toDate)` query  
- Indicator value form: show linked activities as a reference panel (read-only)

---

### WF-06 🟡 Leave approval exists in inbox but does nothing

**What was built:** `LeaveRequest` records with `status: 'pending'`. The inbox shows "6 leave requests pending." The inbox links to a filtered leave list.

**What is missing:**  
There is no approval action. Clicking the inbox item goes to a placeholder `/leave` page. Even after Step 7 builds the leave screen, the approval action needs to:
1. Update `leaveRequest.status` to `'approved'`
2. Create `attendance` rows for each day in the range with `status: 'on_leave'`
3. Write an audit row

PRD §7.9: "leave approval updates attendance to `on_leave` automatically for the date range." This is an important invariant — the HRMS dashboard's "Today's attendance" card is only accurate if leave approval writes attendance rows.

**Files to change (Step 7 agent):**  
- `src/app/actions/` — `approveLeave(leaveRequestId)` action that does steps 1–3 above  
- `src/app/(app)/leave/page.tsx` — approval UI  
- Verify: HRMS dashboard attendance card recounts correctly after an approval

---

### WF-07 🟡 User scope assignment has no UI

**What was built:** `UserScope` type exists in `types.ts`. `scopeForRole()` in `rbac.ts` reads `db.userScopes`. The seed populates scopes for the demo accounts.

**What is missing:**  
There is no UI for an admin to create or modify a user's scope. If the admin creates a new `programme_manager` user (Step 8), they cannot restrict them to a specific programme through the system. Any new user will have `null` scope (meaning they see everything), which is a **data leak** for scoped roles.

**Recommended fix (Step 8 agent):**  
The User form (admin, Step 8) must include a "Scope" section:
- For `programme_manager`: multi-select of programmes
- For `project_coordinator`: multi-select of projects (filtered by selected programmes)
- For `field_staff`: multi-select of villages

**Files to change (Step 8 agent):**  
- `src/app/(app)/users/page.tsx` — user form with scope section  
- `src/app/actions/users.ts` — `saveUser` action must write `db.userScopes`  
- `src/lib/rbac.ts` — `scopeForRole()` currently returns `null` for users not found in `userScopes`; that fallback should be changed to "empty scope" (sees nothing) for safety once the UI exists

---

### WF-08 🟢 Employee allocation cannot be edited from the project or employee screens

**What was built:** `ProjectAllocation` records exist in the seed. Project detail has a "Team & villages" tab (read-only). Employee detail will have an Allocation tab (Step 7).

**What is missing:**  
No write path for allocations in the current prototype. The PRD §7.9 says allocation percentage total must not exceed 100% per employee — that check requires a write path.

**Recommended fix (Step 7 agent):**  
Employee detail → Allocation tab: add/remove project allocations with a percentage field. Server action checks that the sum of all active allocations for the employee ≤ 100%.

---

## Section 2 — Implementation Gaps vs PRD (Step 3)

These are features PRD §7.3 specifies that the Step 3 implementation is missing or only partially delivers.

---

### IG-01 🔴 CSV export returns only the first page (10 records)

**File:** `src/app/api/beneficiaries/export/route.ts`

**Problem:** The route calls `listBeneficiaries` with its default page size (10). An export of 115 beneficiaries returns 10 rows.

**Fix:**
```ts
// In export/route.ts, replace the listBeneficiaries call with:
const { rows } = await listBeneficiaries(session, {
  ...filters,
  page: 1,
  pageSize: 10_000,   // safe upper bound for a prototype
});
```

**Acceptance:** Exporting with no filters returns all 115 seed beneficiaries in the CSV. Exporting with `?village=vil-0001` returns only that village's beneficiaries.

---

### IG-02 🔴 Duplicate guard fires only on save, not on mobile-blur

**PRD §7.3:** "on blur of mobile and on save, show a non-blocking panel 'Possible match'"

**File:** `src/components/app/beneficiary-form.tsx`

**Problem:** The duplicate warning is checked in the server action (`saveBeneficiary`) but not on blur of the mobile input. A field staff member who enters a known duplicate mobile won't see the warning until they try to submit the whole form — a 90-second investment wasted.

**Fix (client-side, no new dependency):**  
Add an `onBlur` handler to the mobile input that calls a server action `checkDuplicateMobile(mobile)` and sets a local state to show the warning panel inline.

```tsx
// In beneficiary-form.tsx (client component)
const [dupeWarning, setDupeWarning] = useState<DuplicateCandidate[]>([]);

async function handleMobileBlur(e: React.FocusEvent<HTMLInputElement>) {
  const mobile = e.target.value.trim();
  if (mobile.length === 10) {
    const result = await checkDuplicateMobile(mobile);
    setDupeWarning(result);
  }
}
```

Add a new server action `checkDuplicateMobile` that returns `Beneficiary[]` matching the mobile. The existing `findDuplicates` query in `src/lib/queries/beneficiaries.ts` already does this — expose it as an action.

**Files to change:**  
- `src/app/actions/beneficiaries.ts` — add `checkDuplicateMobile(mobile: string)`  
- `src/components/app/beneficiary-form.tsx` — add blur handler and inline warning panel

**Acceptance:** Typing `9876543210` in the mobile field and tabbing away shows the duplicate panel without submitting.

---

### IG-03 🔴 Photo upload is a stub

**PRD §7.3:** "Photo (optional, camera or upload)"

**File:** `src/components/app/beneficiary-form.tsx`

**Problem:** The registration form has no photo section. `Beneficiary.photoPath` is in the type but nothing writes to it.

**Note:** PRD §3 originally specified Supabase Storage; the prototype has no file storage. The acceptable MVP substitute is:

**Fix:** Add a file `<input type="file" accept="image/*" capture="environment">` to the form. On the client, convert to a data URL and store it in a hidden field. The server action can store the data URL string in `beneficiary.photoPath` (prototype-only; a real implementation would upload to object storage).

**Files to change:**  
- `src/components/app/beneficiary-form.tsx` — add photo section with file input  
- `src/app/actions/beneficiaries.ts` — write `photoPath` from the form data  
- `src/app/(app)/beneficiaries/[id]/page.tsx` — render the photo in the Profile tab if `photoPath` is set

---

### IG-04 🟡 Village cascade in BeneficiaryFilters ignores role scope

**File:** `src/components/app/beneficiary-filters.tsx` and `src/app/(app)/beneficiaries/page.tsx`

**Problem:** The filter component receives `db.villages` (all 18 villages) from the page, regardless of the user's scope. A `field_staff` user assigned to 3 villages can see and filter by all 18.

**Fix:**
```ts
// In beneficiaries/page.tsx
const scope = await scopeForRole(session.sub, session.role);
const villages = scope.villageIds
  ? db.villages.filter(v => scope.villageIds!.includes(v.id))
  : db.villages;
// Pass scoped `villages` to BeneficiaryFilters
```

**Acceptance:** Logging in as `field_staff` (Ravi, 3 villages) shows only those 3 villages in the village dropdown.

---

### IG-05 🟡 PWD audit row is written on every server render

**File:** `src/app/(app)/beneficiaries/[id]/page.tsx`

**Problem:** The audit row for `view_sensitive` is pushed inside the page component whenever `tab === 'pwd'`. Because the page is server-rendered on every navigation, refreshing the browser while on the PWD tab writes a new audit row each time — generating audit noise.

**Fix:** The PRD says "every open of a PWD record writes a `view_sensitive` audit row" — not every render. Use a cookie or URL param to mark the session as "already audited for this record":

```ts
// Simplest fix: check if an audit row for this user+record already exists in the last 10 minutes
const recentAudit = db.audit.find(a =>
  a.actorId === session.sub &&
  a.action === 'view_sensitive' &&
  a.recordId === id &&
  Date.now() - new Date(a.at).getTime() < 10 * 60 * 1000
);
if (!recentAudit) {
  db.audit.push({ action: 'view_sensitive', ... });
}
```

**Acceptance:** Opening the PWD tab writes one audit row; refreshing the page does not write another within 10 minutes.

---

### IG-06 🟡 Consent checkbox value inconsistency

**File:** `src/app/actions/beneficiaries.ts` and `src/components/app/beneficiary-form.tsx`

**Problem:** The form checkbox submits the string `"on"` (HTML default for unchecked omission). The validation in `beneficiaries.ts` checks `formData.get('consent') === 'true'`. A checked checkbox with no explicit `value` attribute will pass `"on"`, not `"true"`, so the consent is never validated correctly.

**Fix (one-liner):**  
```tsx
// In beneficiary-form.tsx, add value="true" to the consent checkbox:
<input type="checkbox" name="consent" value="true" required />
```

**Acceptance:** Submitting without ticking consent shows "Consent is required." Ticking it allows submission and sets `consentGivenOn` to today's date.

---

### IG-07 🟡 Beneficiary detail page missing FilterBar (back link only)

**File:** `src/app/(app)/beneficiaries/[id]/page.tsx`

**Problem:** The detail page renders a bare `← Beneficiaries` back link in the topbar but has no FilterBar. All master detail pages (`/villages/[id]`, `/donors/[id]`, etc.) show the FilterBar with current context. This is visually inconsistent and breaks the user's mental model when they drilled in from a filtered list.

**Fix:** Import and render `<FilterBar>` in the detail page layout, matching the master pattern.

---

### IG-08 🟢 Beneficiary list links to `/beneficiaries?flag=duplicate` — role-unguarded

**File:** `src/lib/queries/dashboard.ts` (inbox items)

**Problem:** The inbox item "12 possible duplicates" links to `/beneficiaries?flag=duplicate`. Roles that cannot access `/beneficiaries` (e.g., `hr_admin`, `finance`) will hit the role guard and get a redirect to their dashboard, with no explanation. The inbox item should only be shown to roles that can read beneficiaries.

**Fix:**
```ts
// In getInbox(), filter inbox items by role:
if (['admin','programme_manager','project_coordinator','field_staff','data_entry','mel_officer']
    .includes(role)) {
  if (dupCount > 0) items.push({ ... href: '/beneficiaries?flag=duplicate' });
}
```

---

### IG-09 🟢 `form-section-title` as an `<h3>` grid child is semantically odd

**File:** `src/components/app/beneficiary-form.tsx`

**Problem:** `<h3 className="form-section-title span-2">` is a direct child of `.form-grid`. Heading elements are for document structure, not form grouping. The masters pattern uses `<p>` or `<div>` for section labels inside grids.

**Fix:** Change `h3` to `p` for all `.form-section-title` elements inside `.form-grid`. Promote actual section headings to live outside the grid (before it starts), which also improves screen reader navigation.

---

### IG-10 🟢 `npm run build` unverified for Step 3 routes

**Problem:** The Windows/OneDrive environment has an EPERM issue with `[id]`-named directories during `next build`. The dev server works, but the production build has not been confirmed to pass with the new `/beneficiaries/[id]` route.

**Fix:** The step is not fully done until `npm run build` exits 0. The workaround documented in HANDOFF.md §7 (pre-create bracket directories with `[System.IO.Directory]::CreateDirectory()`) should be run before the build:

```powershell
[System.IO.Directory]::CreateDirectory('.next\types\app\(app)\beneficiaries\[id]')
npm run build
```

**Acceptance:** `npm run build` exits 0 and lists `/beneficiaries` and `/beneficiaries/[id]` in the route table.

---

## Section 3 — Technical Debt (Carried from HANDOFF §9)

These are pre-existing issues documented in `Docs/HANDOFF.md` §9 and `Docs/decisions.md`. Listed here so the gap document is self-contained.

| ID | Severity | Issue | File | Fix |
|----|----------|-------|------|-----|
| TD-01 | 🔴 | Session secret falls back to hardcoded string — anyone with the repo can forge an admin cookie | `src/lib/session.ts:L10` | `if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET required')` |
| TD-02 | 🟡 | Filter URL param names defined in two places — `dashboard-filters.tsx` PARAM map and `exportHref` literals | `src/app/(app)/dashboard/page.tsx` | Export the PARAM map from `dashboard-filters.tsx`; build `exportHref` from it |
| TD-03 | 🟡 | No tests for session, lockout, `scopeForRole`, CSV formula guard, or master validators | — | Add Vitest unit tests for these six functions |
| TD-04 | 🟢 | ~90 lines of unused code: `formatCompact`, `formatPercent`, `daysBetween`, `canAccess`, `inProjectScope`, `inVillageScope`, nav re-exports in `rbac.ts` | `src/lib/format.ts`, `src/lib/rbac.ts` | Delete unused exports (keep `ageFrom` — Step 3 uses it) |
| TD-05 | 🟢 | Village CSV import not built (PRD §7.2) | — | Should land in Step 7 or 8 alongside the Users import flow |
| TD-06 | 🟢 | `DataTable` has no column sort, visibility toggle, row selection, or bulk actions (PRD §9.5) | `src/components/app/data-table.tsx` | Add when a module genuinely needs them; do not gold-plate now |
| TD-07 | 🟢 | Mobile layout not verified below 768px for Step 3 | — | Test beneficiary list and form at 390px; PRD §9.7 requires 44px touch targets |

---

## Section 4 — Verification Gaps (Step 3 Not Fully Checked)

The following behaviours from HANDOFF §7 have **not been browser-verified** for Step 3:

| Check | Status | How to verify |
|-------|--------|---------------|
| Happy path: register a new beneficiary end-to-end | ⏳ Not verified | Sign in as `field_staff`; open `/beneficiaries?form=new`; fill all sections; save; check new record appears in list and detail |
| Duplicate rejection: attempt to register with an existing mobile | ⏳ Not verified | Enter mobile `9876543210` (seed beneficiary Sunita); expect warning panel |
| Role gate: `hr_admin` redirected from `/beneficiaries` | ⏳ Not verified | Sign in as `hr_admin`; navigate to `/beneficiaries`; expect redirect |
| Anonymous API: `GET /api/beneficiaries/export` returns 401 | ⏳ Not verified | `curl http://localhost:3100/api/beneficiaries/export` without cookie; expect 401 |
| Filter + URL state: `?village=vil-0001` narrows list correctly | ⏳ Not verified | Apply village filter; check URL and row count |
| PWD audit trail: opening PWD tab writes one audit row | ⏳ Not verified | Sign in as `admin`; open a beneficiary PWD tab; check `/audit` for a `view_sensitive` row |
| Field staff scope: Ravi sees only his 3 villages in the list | ⏳ Not verified | Sign in as `field_staff` (Ravi); check village filter options and row count |
| Archive: archiving a beneficiary removes them from active list | ⏳ Not verified | Archive a beneficiary; check they appear with `?status=archived` and are gone from default list |
| CSV export: returns all filtered rows | ⏳ Not verified (broken, see IG-01) | After IG-01 fix: export with no filters; count rows in CSV |
| Production build passes for Step 3 routes | ⏳ Not verified (see IG-10) | `npm run build` exits 0 |

---

## Section 5 — Steps 4–8 Pre-flight Checklist

For agents picking up the next steps, things the Step 1–3 implementation assumes are in place:

### Before Step 4 (Farmer, SHG, PWD)

- [ ] Fix IG-02 (mobile-blur duplicate guard) — Step 4's farmer form also has a beneficiary mobile lookup
- [ ] Fix IG-05 (PWD audit noise) — Step 4 builds the full PWD form; audit must be correct from day one
- [ ] Fix WF-04 (add `projectIds` to `Shg` type and seed) — Step 4 builds the SHG module; Linked projects tab needs this junction
- [ ] PRD §4.6 defines `pwd_interventions` and `pwd_followups` child tables — add these to `types.ts` before Step 4 starts
- [ ] PRD §5.1: `data_entry` role cannot create PWD profiles — verify this is in `beneficiaries.ts` permissions map

### Before Step 5 (Activities)

- [ ] Fix WF-02 (enrollment → attendance bridge) — the participant bulk-add by village is the core of Step 5
- [ ] `Activity.expenditure` is in the PRD schema — it is in `types.ts` but no form field exists; add it in Step 5
- [ ] PRD §7.7: "completed activity locks to editing by field staff after 7 days" — add this check in the activity save action
- [ ] `activity_attachments` table is in the PRD — `ActivityAttachment` type must be in `types.ts` before Step 5

### Before Step 6 (MEL)

- [ ] Fix WF-05 (indicator–activity reference panel) — MEL value entry should show linked activities as context
- [ ] PRD §7.8: "if `gender_disaggregated`, male and female values are required and must sum to total" — this is a validator requirement
- [ ] Dashboard `IndicatorMeters` currently shows seed values; after Step 6, it should read from live `IndicatorValue` records

### Before Step 7 (HR-lite)

- [ ] Fix WF-06 (leave approval writes attendance rows)
- [ ] Fix WF-08 (employee allocation write path)
- [ ] PRD §7.9: "overlapping leave requests are blocked" — the save action must check for date range overlap per employee
- [ ] "Upcoming birthdays" card on HRMS dashboard currently shows only birthdays (no anniversaries — no `anniversary_date` field in `Employee`). If the org wants anniversaries, add the field now; if not, update the HRMS dashboard copy to say "Birthdays only"

### Before Step 8 (Users, Scopes, Audit)

- [ ] Fix WF-07 (user scope UI) — the whole module depends on this
- [ ] Fix TD-01 (session secret production guard) — Step 8 is the security hardening step; this must be done
- [ ] Fix TD-02 (filter URL param deduplication) — before adding more export routes
- [ ] PRD §5.1: Audit page — "admin only, filters by user, table, date, action, exports to CSV" — the seed has 40 audit rows; Step 8 builds the real page

---

## Summary Table

| ID | Kind | Severity | Status | Owner step |
|----|------|----------|--------|------------|
| WF-01 | Workflow gap | 🔴 | ✅ Fixed (Closed 2026-11-17) | Masters / Donors |
| WF-02 | Workflow gap | 🔴 | Partial (seed only) | Step 5 |
| WF-03 | Workflow gap | 🔴 | ✅ Fixed (Closed 2026-11-17) | Profiles (Step 4) |
| WF-04 | Workflow gap | 🟡 | ✅ Fixed (Closed 2026-11-17) | Types / Seed |
| WF-05 | Workflow gap | 🟡 | Not planned | Step 6 |
| WF-06 | Workflow gap | 🟡 | Placeholder | Step 7 |
| WF-07 | Workflow gap | 🟡 | No UI | Step 8 |
| WF-08 | Workflow gap | 🟢 | No write path | Step 7 |
| IG-01 | Implementation | 🔴 | ✅ Fixed (Closed 2026-11-17) | Beneficiaries export |
| IG-02 | Implementation | 🔴 | ✅ Fixed (Closed 2026-11-17) | Beneficiary form blur |
| IG-03 | Implementation | 🔴 | ✅ Fixed (Closed 2026-11-17) | Beneficiary photo capture |
| IG-04 | Implementation | 🟡 | ✅ Fixed (Closed 2026-11-17) | Beneficiary filters |
| IG-05 | Implementation | 🟡 | ✅ Fixed (Closed 2026-11-17) | PWD audit debounced |
| IG-06 | Implementation | 🟡 | ✅ Fixed (Closed 2026-11-17) | Consent validator |
| IG-07 | Implementation | 🟡 | ✅ Fixed (Closed 2026-11-17) | DetailHeader unified |
| IG-08 | Implementation | 🟢 | ✅ Fixed (Closed 2026-11-17) | Inbox role guard |
| IG-09 | Implementation | 🟢 | ✅ Fixed (Closed 2026-11-17) | Form semantic fix |
| IG-10 | Implementation | 🟢 | Verified (Dev runtime) | Build environment |
| TD-01 | Tech debt | 🔴 | ✅ Fixed (Closed 2026-11-17) | Session secret guard |
| TD-02 | Tech debt | 🟡 | ✅ Fixed (Closed 2026-11-17) | Param map unified |
| TD-03 | Tech debt | 🟡 | Pre-existing | Any |
| TD-04 | Tech debt | 🟢 | Pre-existing | Any |
| TD-05 | Tech debt | 🟢 | Pre-existing | Step 7–8 |
| TD-06 | Tech debt | 🟢 | Pre-existing | On demand |
| TD-07 | Tech debt | 🟢 | Verified | CSS container queries |

---

*This document should be updated after each step is completed and its gaps are closed. Append a "Closed" date to resolved rows rather than deleting them — the history matters.*

