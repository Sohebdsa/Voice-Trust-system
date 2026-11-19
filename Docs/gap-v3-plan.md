# Gap Analysis v3 — implementation plan

**Source:** `Docs/Gap-analysis V3.md` (2026-11-18)
**Prepared:** 2026-11-18, after checking every v3 claim against the code
**Rule:** PRD §4 is the schema authority. `src/lib/data/types.ts` + `seed.ts` are the prototype's only "migration".

---

## 0. What v3 gets wrong — do not redo these

Checked file-by-file. These v3 items are already built, so a third of the doc is stale:

| v3 item | Reality | Evidence |
|---|---|---|
| §2.5 Programme / Project tabs missing | **Built.** Programmes: Overview, Projects, Activities, Team. Projects: Overview, Beneficiaries, Activities, Indicators, Team & villages, Budget | `programmes/[id]/page.tsx` TABS, `projects/[id]/page.tsx` TABS, `queries/masters.ts` `programmeDetail` / `projectDetail` |
| §2.6 / WF-02 Activities tab is seed-only | **Live.** Filters `db.participants` by `attended` and joins activities | `queries/beneficiaries.ts` `getBeneficiaryDetail` |
| §8.2 SHG savings balance not shown | **Shown.** Per-member balance column, group total in subtitle and Overview | `shgs/[id]/page.tsx` lines 61, 100, 155–180 |
| §2.2 GPS India-range validation missing | **Server-side exists** (8–38°N, 68–98°E) in `validateFarmer`. Only the "View on map" link and the denial message are missing | `lib/profiles.ts` `validateFarmer` |

One v3 **correction**: it says rename `Activity.description` to `outputsResults`. The PRD has *both* (`§4.8`: `description`, … `outputs_results text`). Add `outputsResults`; keep `description`. Renaming would break `seed.ts`, `saveActivity`, `queries/activities.ts` and the detail page for no gain.

Everything else in v3 is real and unbuilt.

---

## 1. Shape of the change

The prototype has one fake database: `Db` in `types.ts`, filled by generators in `seed.ts`, read through `lib/queries/*`, written through `app/actions/*`. So:

- **All schema changes go in one batch, first.** Adding a field later means touching seed + form + action + detail again.
- **Every new field is optional** (`?:`), so no existing seed object, fixture or call site has to change to compile.
- **`tsc --noEmit` is the check** for the schema batch; each UI batch then checks its own route in the dev server.
- Master records (village/donor/programme/project) need **six** edits per field, not one: `types.ts`, `seed.ts`, `masters.ts` `formFields`, `validateMaster` (only if required), `actions/masters.ts` explicit `patch` object, and the detail `Facts` list.

---

## 2. Batch 1 — Schema + seed (single pass, no UI)

`src/lib/data/types.ts`, `src/lib/data/seed.ts`

| v3 | Add |
|---|---|
| 1.1 | `Village.latitude`, `Village.longitude` (`number \| null`) + Maharashtra-range values for all 18 |
| 1.2 | `Donor.address?: string` |
| 1.3 | `Programme.objectives`, `targetGeography`, `targetBeneficiaries` (string), `fundingSource` |
| 1.4 | `Project.objectives`, `locationSummary` |
| 1.5 | `ProjectAllocation.toDate?: string \| null` (seed = project `endDate`) |
| 1.6 | `Beneficiary.addressLine`, `alternateContact` |
| 1.7 | `Shg.livelihoodActivity`, `bankName`, `ifsc`, `bankLinkageDate`, `supportReceived` (bank fields on ~half the seed groups) |
| 1.8 | `SavingsTransaction.note?: string` |
| 1.9 | `Activity.location`, `resourcePersons`, `outputsResults` |
| 1.10 | `ActivityStaff`, `ActivityAttachment` interfaces + `Db.activityStaff`, `Db.activityAttachments` + seed (1–2 staff per activity, no attachments seeded) |
| 1.11 | `Indicator.description`, `dataSource`, `responsibleEmployeeId`, `status` |
| 1.12 | `IndicatorValue.remarks`, `enteredBy`, `enteredAt` |
| 1.13 | `Employee.address`, `emergencyContactName`, `emergencyContactPhone`, `qualifications`, `experienceSummary` |
| 1.14 | `Attendance.checkIn`, `checkOut`, `lateFlag`, `remarks`, `approvedBy` |
| 1.15 | `LeaveRequest.approverId`, `actionedAt` |
| 1.16 | `AuditEntry.changes?: Record<string, unknown>` (skip `ip` — prototype has no client IP) |
| 8.1 | `Activity.noParticipantsReason?: string` |
| 8.4 | `Beneficiary.photoConsentGivenOn?: string \| null`; note in `Docs/decisions.md` that it defaults to `consentGivenOn` |

**Acceptance:** `npx tsc --noEmit` clean; dev server still renders `/dashboard`, `/beneficiaries`, `/activities` (single `Db` object, no shape runtime change).

---

## 3. Batch 2 — Finish Activities (Step 5, the uncommitted work in the tree)

Files: `components/app/activity-form.tsx`, `app/(app)/activities/[id]/page.tsx`, `app/actions/activities.ts`, `lib/queries/activities.ts`, `components/app/participants-panel.tsx`, `app/(app)/beneficiaries/[id]/page.tsx`, new `components/app/attachments-panel.tsx` + `lib/queries/activities.ts` helpers.

1. **v3 2.3 / 1.9** — form: `location` in "When & Where"; new "Staff & Resources" section with `resourcePersons`; `outputsResults` textarea; keep `description` as an internal/admin note or drop it from the form (detail page shows it today). Show all three on the Overview `Facts`.
2. **v3 1.10 / §5** — Staff tab: list `db.activityStaff` joined to employees, assign/remove via two server actions (same `useActionState` shape as `addParticipant`).
3. **v3 1.10 / §5** — Attachments tab: `attachments-panel.tsx` client component, `<input type="file" accept="image/*,application/pdf" multiple>`, `FileReader` → data URL, `addAttachment` / `removeAttachment` actions. **Cap at 2 MB per file and 5 per activity** (v3 says 10 MB — an in-memory `Db` of 10 MB base64 strings will stall the dev server).
4. **v3 8.1** — `saveActivity`: if `status === "completed"` and the activity has zero participants, require `noParticipantsReason`; Participants tab shows the textarea when that condition holds.
5. **v3 8.3** — `addParticipant`: if the beneficiary's `projectIds` does not include the activity's `projectId`, return a soft warning the panel renders ("Not enrolled in this project — add anyway?" with a confirm field), not a hard block.
6. **v3 2.7** — beneficiary Projects tab: add an "Activities attended" column, computed from `db.participants` ∩ `db.activities` for that project (queries already have both arrays).

**Acceptance:** create an activity with a venue and resource person → both appear on Overview; assign an employee → Staff tab lists them; upload one small PNG → visible on Attachments after reload; mark a zero-participant activity completed without a reason → error shown; beneficiary detail Projects tab shows a non-zero attended count for a seeded beneficiary.

---

## 4. Batch 3 — Fields that already have forms (cheap, no new module)

One pass over the existing forms; no new routes.

| v3 | Change |
|---|---|
| 1.6 / 2.1 | `beneficiary-form.tsx` Section 2: `addressLine` textarea + `alternateContact` input; `beneficiaries/[id]` Profile `Facts` shows both; `actions/beneficiaries.ts` reads them |
| 1.7 / 2.4 | `shg-form.tsx`: "Banking & Livelihood" section (5 fields); `shgs/[id]` Overview `Facts`; `lib/profiles.ts` `ShgFormValues` + `validateShg` (IFSC: `/^[A-Z]{4}0[A-Z0-9]{6}$/` only when non-empty); `actions/profiles.ts` `saveShg` |
| 1.8 | savings fast-entry grid: one optional note cell per member row; `recordShgSavings` writes `note` |
| 1.1 | `masters.ts` village `formFields`: latitude + longitude numbers; `saveMaster` village patch; `villages/[id]` facts. **Skip the "Use my location" button** — the generic `masters-form.tsx` has no per-field widget hook, and a geolocation button is not data the org needs on a desktop admin screen |
| 1.2 | donor `address` textarea: `formFields`, `saveMaster` patch, `donors/[id]` facts |
| 1.3 | programme "Scope" fields: `formFields`, `saveMaster` patch, `programmes/[id]` facts |
| 1.4 | project `objectives` + `locationSummary`: `formFields`, `saveMaster` patch, `projects/[id]` facts |
| 2.2 | `farmer-form.tsx`: "View on map" anchor (`https://www.google.com/maps?q=lat,lng`, `rel="noopener noreferrer"`) after a successful capture; geolocation error text already exists |
| 8.4 | photo section: consent checkbox writing `photoConsentGivenOn` |

**Acceptance:** each edited form saves and re-opens with the new values (one create + one edit per entity is enough); invalid IFSC rejected; farmer GPS still saves.

---

## 5. Batch 4 — Step 6, MEL (builds on 1.11, 1.12, WF-05)

New: `lib/queries/mel.ts`, `app/actions/mel.ts`, `components/app/indicator-form.tsx`, `components/app/indicator-value-form.tsx`, `app/(app)/mel/page.tsx`, `app/(app)/mel/[id]/page.tsx`. Remove `mel` from `[...slug]/page.tsx`.

- Indicators list: project, unit, baseline, target, latest achievement, **responsible** column, **status** filter.
- Indicator form: `description`, `dataSource`, `responsibleEmployeeId` (employee picker), `status`.
- Value entry: period start/end, `value`, `maleValue`/`femaleValue` (required and summing to `value` when `genderDisaggregated`), `remarks`; set `enteredBy`/`enteredAt` in the action, never from the form.
- **WF-05**: read-only "Activity basis" panel above the value form — activities in that project in the period, count + attended total + their `outputsResults` text. No auto-calculation.
- Project detail Indicators tab: switch from seed `db.indicators` to the new query so target-vs-achievement reflects entered values.

**Acceptance:** enter a quarterly value → indicator list and project tab show it; gender split that does not sum → field error; activity basis panel shows the project's activities for that period.

---

## 6. Batch 5 — Step 7, HR-lite (1.13–1.15, 1.5, WF-06, WF-08)

New: `lib/queries/employees.ts`, `app/actions/hr.ts`, `app/(app)/employees/page.tsx`, `employees/[id]/page.tsx`, `attendance/page.tsx`, `leave/page.tsx`. Remove those three placeholders.

- Employee form/detail: the five 1.13 fields in a "Contact & Background" section.
- Attendance grid: `checkIn`/`checkOut` columns; `saveAttendance` computes `lateFlag` against a single constant `OFFICE_START = "09:30"`, sets `approvedBy` when an HR admin edits.
- Leave: apply with overlap check (same employee, date ranges intersect → reject); approve/reject sets `approverId` + `actionedAt`; **WF-06** approval also inserts `on_leave` attendance rows for each day in the range that has no row yet; **v2 WF-08** allocation write path on the employee Allocation tab with the "sum ≤ 100%" check, now using `toDate` so closed allocations stop counting.
- HR dashboard attendance card and inbox "6 leave requests pending" then read live rows.

**Acceptance:** approving a 2-day leave shows 2 `on_leave` days in the grid and drops "present" by 2; overlapping request rejected; allocation sum 100% + 10% rejected; a toDate in the past stops counting.

---

## 7. Batch 6 — Step 8, users, scopes, audit (WF-07, 1.16)

New: `app/(app)/users/page.tsx`, `components/app/user-form.tsx`, `app/actions/users.ts`, `app/(app)/audit/page.tsx`, `api/audit/export/route.ts`.

- User form: role select, active flag, and a **scope section conditional on role** (`programme_manager` → programmes; `project_coordinator` → projects; `field_staff` → villages), written to `db.userScopes`.
- `rbac.ts` `scopeForRole`: missing scope rows → empty scope (sees nothing) for scoped roles, instead of `null` = see everything. This is the security half of WF-07 and must land with the UI, in the same commit.
- Audit page: admin-only, filter by user/table/action/date, CSV export writing an `export` row.
- **1.16**: pass `changes` on the 19 existing `db.audit.push` sites (7 files) — one `{ field: [old, new] }` object per changed record. Do it file by file; no helper abstraction needed.

**Acceptance:** create a scoped user → they see only their scope on `/beneficiaries`; a scoped user with no scope row sees nothing; audit CSV respects filters; an edited donor shows a `changes` object on its audit row.

---

## 8. Batch 7 — Close-out

1. `npx tsc --noEmit`, then `npm run build` (pre-create `.next/types/.../[id]` per HANDOFF §7 if OneDrive EPERM recurs).
2. TD-03: add Vitest coverage for `scopeForRole`, `validateFarmer` GPS bounds, `validateShg` IFSC, CSV formula guard, leave overlap — the five functions this plan now depends on.
3. Append "Closed" dates to `Docs/gap-analysis-v2.md`'s summary table and mark v3 rows done; note this plan's batch boundaries in `Docs/progress.md`.

---

## 8b. Decisions from the 2026-11-18 review (these override v3 and the tables above)

1. **Files are names only.** `photoPath` and `activityAttachments.filePath` hold the file *name*. The picker is real, nothing is read or uploaded, no size cap, no base64.
2. **One module end-to-end at a time** — Activities, then MEL, then HR, then Users; each finished (type + seed + form + tabs + action) before the next starts.
3. **Audit log is out of scope** (user decision). No audit page, no export, no `AuditEntry.changes`, no `ip`. The 19 existing `db.audit.push` calls stay as they are.
4. **`beneficiary_projects.enrolled_on` is in scope** — per-project enrolled dates, because every field in the original document is included.
5. **PWD interventions and follow-ups**: seeded and listed read-only on the PWD detail.
6. **Phase 2 tables (§4.11) are in scope** per the user, despite the PRD's "do not build": payroll runs/items, salary structures, assets, asset allocations, asset maintenance, budgets, expenses, SHG loans and repayments, SHG meetings, donor reports.
7. **§4.2 system columns are out of scope** (`created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`).

### Module 1 — Activities (done)
`Activity.location`, `resourcePersons`, `outputsResults`, `noParticipantsReason`; `ActivityStaff` + `ActivityAttachment` and their `Db` arrays; seeded venues/resource persons/outputs/staff/filenames; form sections; Overview facts; Staff and Attachments tabs; `assignStaff`/`removeStaff`/`addAttachment`/`removeAttachment`; completed-with-no-participants needs a reason. `npx tsc --noEmit` clean.

---

## 9. Deliberately not in the plan

| Skipped | Why | Upgrade when |
|---|---|---|
| Village "Use my location" button | Generic master form has no widget slot; desktop admin entry is fine | A field team actually creates villages |
| `AuditEntry.ip`, `AuditEntry.changes`, audit page | User decision — out of scope for this prototype | A real deployment needs audit review |
| Storing file bytes | User decision — file names only; nothing is uploaded | Object storage exists (PRD §3 Supabase) |
| `activityStaff` on employee detail | Employee module does not exist yet | Batch 5 |
| Auto-computing indicator values from activities | v3 explicitly says reference panel only | After MEL data has a quarter of history |

---

## 10. Risks

- **Biggest:** Batch 1 touches `types.ts` and `seed.ts`, which every module reads. Keep every new field optional and add seed values through the existing generator functions; a required field will break the whole demo dataset at once.
- `Db` is a module-level singleton: edits survive in the dev server process only. Any seeded attachment/photo data resets on restart — expected for a prototype, but say so in the demo script.
- Batch 6's `scopeForRole` change is a **behaviour change**: demo accounts whose `userScopes` rows are incomplete will lose visibility. Check `Docs/demo-accounts.md` seed rows before flipping the fallback.
- `activity_attachments` and photo data URLs inflate `seed.ts` if ever seeded; leave both empty in seed.
