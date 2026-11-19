# Gap Analysis v3 — PRD Schema vs Prototype
**Date:** 2026-11-18  
**Authority:** PRD §4 (data model) is the master. Existing `gap-analysis-v2.md` items not repeated unless still open.  
**Audience:** Agents fixing Steps 5–8 and any hardening work.  
**Scope:** Field-by-field comparison of PRD §4.4–4.9 against `src/lib/data/types.ts`, `seed.ts`, and UI forms — plus workflow and UX gaps.

> [!IMPORTANT]
> Every gap below names exactly which file to touch and what to add. Agents must not guess or invent fields not in the PRD.

---

## How to read severity
- 🔴 **Critical** — data the org needs to do their actual work; missing fields break reports or donor submissions
- 🟡 **Medium** — fields in the PRD schema that are missing or unrendered; important for completeness
- 🟢 **Low** — UI/UX polish, nice-to-have alignment

---

## 1. Schema Gaps — Fields in PRD Missing from `types.ts`

### 1.1 `Village` — missing geo coordinates 🟡

**PRD §4.4:**
```
villages: latitude numeric(9,6) null, longitude numeric(9,6) null
```

**Current `types.ts`:** No `latitude` or `longitude` on `Village`.

**Why it matters:** Villages are field operation units. The Phase 2 interactive map, the GPS India-range validation on farmer forms, and any geo-reporting all depend on village coordinates. Without them there is no way to verify that a farmer's GPS is in the right village.

**Fix — `types.ts`:**
```ts
export interface Village {
  // ... existing fields ...
  latitude: number | null;   // PRD §4.4
  longitude: number | null;  // PRD §4.4
}
```

**Fix — `seed.ts`:** Add plausible Maharashtra-range lat/lng to each village (18.5–21.0°N, 73.5–77.5°E).

**Fix — Village form (`src/lib/masters.ts` `formFields`):** Add two number fields — `Latitude` and `Longitude`. Since this is a prototype, also add a **"Use current location" button** (same `navigator.geolocation` pattern as the farmer GPS button — no new dependency). The village admin would click it while standing in the village or enter approximate coordinates manually.

**Mock GPS approach (prototype):** A `<button type="button">📍 Use my location</button>` calls `navigator.geolocation.getCurrentPosition`, populates the two inputs. Show "India range: 8–37°N, 68–97°E" as help text. This is the same pattern already working in `farmer-form.tsx`.

---

### 1.2 `Donor` — missing `address` field 🟢

**PRD §4.5:**
```
donors: address text
```

**Current `types.ts`:** No `address` on `Donor`.

**Fix — `types.ts`:** `address?: string`  
**Fix — `seed.ts`:** Add a city-level address per donor.  
**Fix — Donor form (`masters.ts` formFields):** Add a `textarea` field for `address`.

---

### 1.3 `Programme` — 4 fields missing 🟡

**PRD §4.5:**
```
programmes: objectives, target_geography, target_beneficiaries text, funding_source
```

**Current `types.ts`:** Only `name, description, focusArea, startDate, endDate, coordinatorId, status`. Missing:
- `objectives: string`
- `targetGeography: string`
- `targetBeneficiaries: string` (text, not number — PRD says `text` to allow "500 farmers in Thane district")
- `fundingSource: string`

**Why it matters:** Programme-level objectives and geography are what programme managers put in donor proposals and mid-term reviews. Without them, every programme looks identical in the system.

**Fix — `types.ts`:**
```ts
export interface Programme {
  // existing...
  objectives?: string;
  targetGeography?: string;
  targetBeneficiaries?: string;   // text, e.g. "400 smallholder farmers"
  fundingSource?: string;
}
```

**Fix — `seed.ts`:** Add sample values.  
**Fix — Programme form (`masters.ts`):** Add four textarea/text fields in a new "Scope" section.

---

### 1.4 `Project` — missing `objectives` and `location_summary` 🟡

**PRD §4.5:**
```
projects: objectives, location_summary
```

**Current `types.ts`:** Neither field present.

**Fix — `types.ts`:** `objectives?: string; locationSummary?: string`  
**Fix — Seed + project form:** Add fields under a "Details" section.

---

### 1.5 `ProjectAllocation` — missing `toDate` 🟡

**PRD §4.5:**
```
project_allocations: from_date, to_date null
```

**Current `types.ts`:** Only `fromDate`. `toDate` is missing — without it, allocations are open-ended and the "total must not exceed 100%" rule cannot be computed for a point in time.

**Fix — `types.ts`:** `toDate?: string | null`  
**Fix — Seed:** Set `toDate` to project `endDate` for each seed allocation.  
**Fix — Employee allocation tab (Step 7):** Show and accept `toDate` in the allocation form.

---

### 1.6 `Beneficiary` — missing `address_line` and `alternate_contact` 🟡

**PRD §4.6:**
```
beneficiaries: alternate_contact text null, address_line
```

**Current `types.ts`:** Neither field present.

**Why it matters:** `address_line` is a contact and navigation field — field staff use it for home visits. `alternate_contact` is important for communities where the registered mobile often belongs to a male family member; the alternate contact can be a neighbour or ASHAworker.

**Fix — `types.ts`:**
```ts
export interface Beneficiary {
  // existing...
  addressLine?: string;
  alternateContact?: string;
}
```

**Fix — Beneficiary form Section 2 "Contact & Address":** Add an `addressLine` textarea and `alternateContact` text input (labelled "Alternate mobile / contact person").  
**Fix — Beneficiary detail Profile tab:** Show both fields in the Facts grid.  
**Fix — Seed:** Generate a simple address (house number + locality) for each beneficiary.

---

### 1.7 `Shg` — 4 fields missing 🟡

**PRD §4.7:**
```
shgs: livelihood_activity, bank_name null, ifsc null, bank_linkage_date null, support_received text
```

**Current `types.ts`:** None of these five fields exist on `Shg`.

**Why it matters:** SHG bank linkage is a key government programme indicator (NABARD, DAY-NRLM). Donor reports commonly ask "X% of SHGs linked to bank credit." Without `bank_name`, `ifsc`, and `bank_linkage_date`, this question is unanswerable. `livelihood_activity` is what the group does (e.g., "Papad making, Agarbatti").

**Fix — `types.ts`:**
```ts
export interface Shg {
  // existing...
  livelihoodActivity?: string;
  bankName?: string | null;
  ifsc?: string | null;
  bankLinkageDate?: string | null;
  supportReceived?: string;
}
```

**Fix — Seed:** Add bank details for half the SHGs (simulate partial bank linkage, the realistic situation for a rural NGO).  
**Fix — SHG form / detail Overview tab:** Add "Livelihood activity", "Bank name", "IFSC", "Bank linkage date", "Support received" fields. Tooltip on IFSC: "11-character bank branch code, e.g. SBIN0001234."

---

### 1.8 `SavingsTransaction` — missing `note` field 🟢

**PRD §4.7:**
```
shg_savings_transactions: note
```

**Current `types.ts`:** No `note` on `SavingsTransaction`.

**Fix — `types.ts`:** `note?: string`  
**Fix — Savings fast-entry grid:** Add an optional note column (single-line text, e.g. "Penalty deposit").

---

### 1.9 `Activity` — 3 fields missing 🔴

**PRD §4.8:**
```
activities: location text, resource_persons text, outputs_results text
```

**Current `types.ts`:** None of these three fields exist.

**Why they matter:**
- `location`: the specific venue within the village (e.g., "Gram Panchayat Hall, Murbad"). Village-level is too coarse for multi-venue programmes.
- `resource_persons`: who delivered the training/activity (guest expert, government official, NGO partner). Essential for capacity-building reports.
- `outputs_results`: narrative outputs captured at the time (not MEL indicator values). "Distributed 40 seed kits; demo of SRI method conducted." This is the qualitative record.

**Fix — `types.ts`:**
```ts
export interface Activity {
  // existing...
  location?: string;
  resourcePersons?: string;
  outputsResults?: string;
}
```

**Fix — Activity form (`activity-form.tsx`):** 
- Add `location` text input to "When & Where" section.
- Add `resourcePersons` textarea to a new "Staff & Resources" section (label: "Resource persons / speakers").
- Rename `description` field to `outputsResults` to match PRD. Keep "Description" as label.

**Fix — Activity detail Overview tab:** Show all three in the Facts grid.

**Fix — `seed.ts`:** Populate these three fields for seeded activities.

> [!NOTE]
> `outputsResults` is the narrative complement to MEL indicator values. Agents building Step 6 (MEL) should reference activities' `outputsResults` text in the indicator value entry panel (gap WF-05 from v2).

---

### 1.10 `Activity` — missing `ActivityStaff` and `ActivityAttachment` types 🟡

**PRD §4.8:**
```
activity_staff     (activity_id fk, employee_id fk)
activity_attachments (id, activity_id fk, file_path, kind (photo|document), caption)
```

**Current `types.ts`:** Neither type exists. `Db` interface does not include `activityStaff` or `activityAttachments` arrays.

**Why it matters:** `activity_staff` records which employees delivered the activity (different from `resource_persons` which is free text for external experts). This powers the employee activity history (PRD §7.9 Employee detail tabs). `activity_attachments` is the attachment UI PRD §7.7 specifies.

**Fix — `types.ts`:**
```ts
export interface ActivityStaff {
  activityId: string;
  employeeId: string;
}

export interface ActivityAttachment {
  id: string;
  activityId: string;
  filePath: string;         // data URL or path; prototype stores data URL
  kind: "photo" | "document";
  caption?: string;
}

// Add to Db interface:
export interface Db {
  // ...existing...
  activityStaff: ActivityStaff[];
  activityAttachments: ActivityAttachment[];
}
```

**Fix — Seed:** Add 1–2 staff assignments per activity (use seeded `employees`).  
**Fix — Activity detail — new "Staff" tab:** List assigned employees; "Assign staff" action (select from employees).  
**Fix — Activity detail — new "Attachments" tab:** File list with captions; "Add file" uses `<input type="file" accept="image/*,application/pdf" multiple>` → converts to data URL → stores in `db.activityAttachments` (prototype-only; production would use object storage). Max 10 MB per file — validate client-side by checking `file.size`.

---

### 1.11 `Indicator` — 3 fields missing 🟡

**PRD §4.8:**
```
indicators: description, data_source, responsible_employee_id fk, status
```

**Current `types.ts`:** Only `name, unit, baseline, target, reportingFrequency, genderDisaggregated`. Missing:
- `description: string`
- `dataSource?: string`
- `responsibleEmployeeId?: string | null`
- `status: RecordStatus`

**Fix — `types.ts`:** Add all four.  
**Fix — MEL indicators list (Step 6):** Show "Responsible" column; allow filtering by status.  
**Fix — Indicator form:** Add description textarea, data source text, employee picker, status select.

---

### 1.12 `IndicatorValue` — 2 fields missing 🟡

**PRD §4.8:**
```
indicator_values: remarks, entered_by, entered_at
```

**Current `types.ts`:** Only `value, maleValue, femaleValue`. Missing:
- `remarks?: string`
- `enteredBy: string`   (profile id)
- `enteredAt: string`   (ISO timestamp)

**Fix — `types.ts`:** Add all three.  
**Fix — MEL value entry form (Step 6):** Add `remarks` textarea. Set `enteredBy` and `enteredAt` automatically in the server action.

---

### 1.13 `Employee` — 5 fields missing 🟡

**PRD §4.9:**
```
employees: address, emergency_contact_name, emergency_contact_phone,
           qualifications text, experience_summary text
```

**Current `types.ts`:** None of these five exist.

**Why it matters:** `emergency_contact_name` and `emergency_contact_phone` are mandatory HR data for field staff in remote areas. `qualifications` and `experience_summary` are needed for the employee profile tab.

**Fix — `types.ts`:**
```ts
export interface Employee {
  // existing...
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  qualifications?: string;
  experienceSummary?: string;
}
```

**Fix — Seed + Employee form (Step 7):** Add a "Contact & Background" section.

---

### 1.14 `Attendance` — 4 fields missing 🔴

**PRD §4.9:**
```
attendance: check_in time null, check_out time null, late_flag bool, remarks, approved_by fk null
```

**Current `types.ts`:** Only `employeeId, attendanceDate, status`. Missing all five.

**Why it matters:** `check_in` and `check_out` are what field staff self-check-in/out (PRD §7.9). `late_flag` powers the "X employees arrived late today" summary. `remarks` explains exceptions. `approved_by` closes the approval loop for the HR dashboard.

**Fix — `types.ts`:**
```ts
export interface Attendance {
  // existing...
  checkIn?: string | null;    // "HH:MM" or ISO time
  checkOut?: string | null;
  lateFlag?: boolean;
  remarks?: string;
  approvedBy?: string | null; // profile id
}
```

**Fix — HRMS attendance grid (Step 7):** Show check-in/out columns; compute `lateFlag` server-side when marking attendance (compare `checkIn` to configurable office start time — default "09:30").

---

### 1.15 `LeaveRequest` — missing `approver_id` and `actioned_at` 🟡

**PRD §4.9:**
```
leave_requests: approver_id fk, actioned_at
```

**Current `types.ts`:** Only `employeeId, leaveTypeId, fromDate, toDate, days, reason, status, appliedAt`. Missing:
- `approverId?: string | null`
- `actionedAt?: string | null`

**Fix — `types.ts`:** Add both.  
**Fix — Leave approval action (Step 7):** Set `approverId = profile.id` and `actionedAt = new Date().toISOString()` when approving or rejecting.

---

### 1.16 `AuditEntry` — missing `changes` and `ip` 🟢

**PRD §4.4:**
```
audit_log: changes jsonb, ip inet
```

**Current `types.ts`:** Only `actorId, actorName, action, tableName, recordId, at`. Missing:
- `changes?: Record<string, unknown>` — what changed (before/after for key fields)
- `ip?: string` — client IP (prototype: skip; note as future)

**Fix — `types.ts`:** `changes?: Record<string, unknown>`  
**Fix — Every server action that writes audit rows:** Pass a `changes` object with the key field values changed.

---

## 2. UI/Form Gaps — Fields Exist in Types but Not Rendered

### 2.1 Beneficiary form — GPS / address fields hidden 🟡

The `Beneficiary` type gains `addressLine` and `alternateContact` from gap 1.6. Beyond types, the registration form Section 2 currently only has: mobile, village picker.

**Missing from Section 2 form UI:**
- `alternateContact` input
- `addressLine` textarea
- Nothing captures geolocation of the beneficiary's home — useful for field visit routing

**Mock GPS for beneficiary:** Since a beneficiary's home address is text-based (`address_line`), **no GPS input is needed here** — the farmer profile already captures field GPS. Just add the two text fields.

---

### 2.2 Farmer form — GPS button exists but coordinate display is weak 🟢

GPS capture works (`navigator.geolocation`). But:
- No map preview link (e.g., "View on Google Maps" using the captured coordinates)
- No validation that coordinates are in India range (8–37°N, 68–97°E)
- No feedback if GPS is denied by browser

**Fix — `farmer-form.tsx`:**
```tsx
// After GPS capture, show a "View on map" anchor:
{lat && lng && (
  <a
    href={`https://www.google.com/maps?q=${lat},${lng}`}
    target="_blank"
    rel="noopener noreferrer"
    className="btn btn-ghost"
    style={{ fontSize: 'var(--fs-13)' }}
  >
    📍 View on map
  </a>
)}
```

Add client-side range validation: if `lat < 8 || lat > 37 || lng < 68 || lng > 97`, show error text "Coordinates appear outside India. Please verify."

---

### 2.3 Activity form — 3 PRD fields not in the form 🔴

From gap 1.9: `location`, `resourcePersons`, and `outputsResults` are missing from `activity-form.tsx`.

**Fix — `activity-form.tsx`** — add to "When & Where" section:
```tsx
<div className="field" style={{ gridColumn: '1 / -1' }}>
  <label className="label" htmlFor="act-location">Venue / Location</label>
  <input id="act-location" className="input" name="location"
    placeholder="e.g. Gram Panchayat Hall, Murbad" defaultValue={v.location} />
  <p className="help">Specific venue within the village</p>
</div>
```

Add to new "Staff & Resources" section:
```tsx
<div className="field" style={{ gridColumn: '1 / -1' }}>
  <label className="label" htmlFor="act-rp">Resource persons / speakers</label>
  <textarea id="act-rp" className="input" name="resourcePersons" rows={2}
    placeholder="e.g. Dr. Ramesh Patil (ATMA), Block Agriculture Officer"
    defaultValue={v.resourcePersons} />
</div>
```

Rename the current `description` field to `outputsResults` (keep label "Outputs & Results"). Update `saveActivity` action and seed accordingly.

---

### 2.4 SHG group form — 4 fields not in form/detail 🟡

From gap 1.7: `livelihoodActivity`, `bankName`, `ifsc`, `bankLinkageDate`, `supportReceived` missing from both the SHG form and the SHG detail Overview tab.

**Fix — SHG form (wherever it lives):** Add a "Banking & Livelihood" section with:
- `livelihoodActivity`: text ("What income activity does this group do together?")
- `bankName`: text ("Bank name (optional)")
- `ifsc`: text, 11-char limit ("IFSC code")
- `bankLinkageDate`: date ("Date bank account opened")
- `supportReceived`: textarea ("Support received from VOICE Trust / govt schemes")

**Fix — SHG detail Overview tab:** Show these five fields in the Facts grid.

---

### 2.5 Programme / Project detail pages — tabs missing content 🟡

**PRD §7.2:**
> Programmes: detail page tabs: **Overview, Projects, Activities, Team**  
> Projects: detail page tabs: **Overview, Beneficiaries, Activities, Indicators, Team and villages, Budget**

**Current prototype:** Programmes and Projects have Overview only (or placeholder tabs).

**Fix summary (Step 5+ agents):**

| Tab | Content | Queries needed |
|-----|---------|----------------|
| Programme → Projects | List of `db.projects` where `programmeId === id` | Already queryable |
| Programme → Activities | `db.activities.filter(a => a.programmeId === id)` | Already queryable |
| Programme → Team | `db.employees` via `db.projectAllocations` for projects under this programme | Needs join |
| Project → Beneficiaries | `db.beneficiaries.filter(b => b.projectIds.includes(id))` | Already in `beneficiaries` |
| Project → Activities | `db.activities.filter(a => a.projectId === id)` | Already queryable |
| Project → Indicators | `db.indicators.filter(i => i.projectId === id)` | Already queryable |
| Project → Team & Villages | `db.projectAllocations`, `db.employees`, project.villageIds | Already queryable |
| Project → Budget | Show approved budget, sum of `donorDisbursements.amount`, difference | Already in seed |

---

### 2.6 Beneficiary detail — Activities tab is static 🔴

**Current:** The Activities tab on the beneficiary detail page shows seed data only (no live query).

**Fix — `src/app/(app)/beneficiaries/[id]/page.tsx`:**
```ts
const participatedActivities = db.participants
  .filter(p => p.beneficiaryId === id)
  .map(p => {
    const activity = db.activities.find(a => a.id === p.activityId);
    return { ...p, activity };
  })
  .filter(p => p.activity)
  .sort((a, b) => b.activity!.startDate.localeCompare(a.activity!.startDate));
```

Render as a table: Date, Activity title (link to `/activities/[id]`), Type, Village, Attended (yes/no). This is the proof that enrolling a beneficiary in an activity and marking attendance actually creates a record.

---

### 2.7 Projects tab on Beneficiary detail — no "Activities attended" count 🟡

**PRD §10.3 wireframe:** "Enrolled 14 Mar 2025 · 4 activities attended"

**Fix:** When rendering the Projects tab, for each enrolled project compute:
```ts
const activityCount = db.participants.filter(p =>
  p.beneficiaryId === beneficiary.id &&
  db.activities.find(a => a.id === p.activityId && a.projectId === project.id && p.attended)
).length;
```

Show as: `Enrolled 14 Mar 2025 · 4 activities attended (3 as present)`

---

## 3. Workflow Gaps Still Open (from v2)

### WF-02 🔴 — Activities tab on beneficiary detail still uses seed data
See gap 2.6 above — this is the fix.

### WF-05 🟡 — MEL indicator form has no "Activity basis" reference panel
**Step 6 agent:** When rendering the Indicator Value entry form, query `getActivitiesForPeriod(projectId, fromDate, toDate)` and show a read-only reference table: "Activities in this project during this period — X activities, Y total participants." Let the MEL officer use this to decide the indicator value. No auto-calculation.

### WF-06 🟡 — Leave approval writes no attendance rows
**Step 7 agent:** `approveLeave` action must:
1. Update `leaveRequest.status = 'approved'`
2. For each calendar day in `fromDate..toDate`, push an `Attendance` row `{ employeeId, attendanceDate, status: 'on_leave', approvedBy: profile.id }`
3. Skip days that already have an attendance row (don't overwrite)

### WF-07 🟡 — User scope has no admin UI
**Step 8 agent:** User form must have a "Scope" section conditional on role:
- `programme_manager` → multi-select of active programmes
- `project_coordinator` → multi-select of projects
- `field_staff` → multi-select of villages

Write scope rows in `db.userScopes` via `saveUser` action.

---

## 4. GPS / Geolocation Mock Strategy

The PRD uses GPS in two places. Here is the prototype approach for each:

| Where | PRD requirement | Prototype mock |
|-------|----------------|----------------|
| **Farmer profile** | GPS capture button on mobile (`gps_latitude`, `gps_longitude`) | ✅ **Already implemented** — `navigator.geolocation.getCurrentPosition` in `farmer-form.tsx`. Add "View on map" link and India-range validation (gap 2.2) |
| **Village** | `latitude, longitude` on village record | 🔴 **Missing** — Add fields to `Village` type (gap 1.1). Village admin form: "Use my location" button. Seed with real lat/lng for the 18 Maharashtra villages |
| **Activity** | `location text` (venue name, not GPS) | 🔴 **Missing** — Add `location` text field to activity form (gap 2.3). No GPS needed; free text is correct per PRD |
| **Beneficiary home** | `address_line` (text, not GPS) | 🔴 **Missing** — Add `addressLine` text field (gap 1.6). No GPS needed |

**No new GPS library needed.** All geo capture uses `navigator.geolocation.getCurrentPosition` already in the codebase. The "View on map" link opens `https://www.google.com/maps?q=LAT,LNG` — no API key, no dependency.

---

## 5. Missing Table — `activity_staff` and `activity_attachments`

Both are in the PRD (§4.8) and in `Db` interface after gap 1.10 fix. Neither is seeded or has UI.

**Step 5 (now):** Add `activityStaff` and `activityAttachments` to `Db` and seed. Add Staff tab and Attachments tab on the Activity detail page.

**Attachment upload mock:**
```tsx
// In attachments-panel.tsx
<input
  type="file"
  accept="image/*,application/pdf"
  multiple
  onChange={(e) => {
    for (const file of Array.from(e.target.files ?? [])) {
      if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB per file'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        // Call server action with data URL as filePath (prototype only)
        addAttachment(activityId, reader.result as string, file.type.startsWith('image') ? 'photo' : 'document', '');
      };
      reader.readAsDataURL(file);
    }
  }}
/>
```

Production note: `filePath` would be a Supabase Storage signed URL. Prototype stores data URL.

---

## 6. Missing Enums in `types.ts`

| Enum | PRD §4.3 value | Current status |
|------|---------------|----------------|
| `land_ownership` | `owned \| leased \| shared \| landless` | ✅ Present in `Farmer` type |
| `shg_role` | `member \| president \| secretary \| treasurer` | ✅ Present in `ShgMember` type |
| `activity_type` | `training \| awareness \| meeting \| field_visit \| distribution \| other` | ✅ Present |
| `activity_status` | `planned \| completed \| cancelled` | ✅ Present (note: PRD does not include `ongoing` — remove if present) |
| `attendance_status` | `present \| absent \| on_leave \| field_duty \| half_day \| holiday` | ✅ Present |
| `leave_status` | `pending \| approved \| rejected \| cancelled` | ✅ Present |
| `employment_type` | `permanent \| contract \| consultant \| intern` | ✅ Present |
| `employment_status` | `active \| on_notice \| exited` | ✅ Present |

No missing enums. All PRD §4.3 enums are correctly implemented.

---

## 7. Priority Fix Order for Agents

The table below gives the recommended order for agents to work through these gaps, lowest friction first (fields already modelled, just need UI) before structural additions (new types).

| Priority | Gap ID | Effort | Step | What to fix |
|----------|--------|--------|------|-------------|
| 1 | 2.3 | Small | 5 (now) | Add `location`, `resourcePersons`, `outputsResults` to activity form and type |
| 2 | 2.6 | Small | 5 (now) | Wire beneficiary Activities tab to live `db.participants` query |
| 3 | 1.10 | Medium | 5 (now) | Add `ActivityStaff`, `ActivityAttachment` types → seed → Staff + Attachments tabs |
| 4 | 1.9 | Small | 5 (now) | Seed `location`, `resourcePersons`, `outputsResults` in existing activities |
| 5 | 1.6 | Small | Next | Add `addressLine`, `alternateContact` to `Beneficiary`, form, detail |
| 6 | 1.7 | Medium | Next | Add 5 SHG fields to type, form, detail |
| 7 | 1.3 | Small | Next | Add 4 Programme fields to type and form |
| 8 | 1.4 | Small | Next | Add `objectives`, `locationSummary` to `Project` |
| 9 | 1.1 | Small | Next | Add `latitude`, `longitude` to `Village` + GPS button |
| 10 | 2.2 | Tiny | Next | Add "View on map" link and India-range validation to farmer GPS |
| 11 | 1.11 | Small | Step 6 | Add `description`, `dataSource`, `responsibleEmployeeId`, `status` to `Indicator` |
| 12 | 1.12 | Small | Step 6 | Add `remarks`, `enteredBy`, `enteredAt` to `IndicatorValue` |
| 13 | 2.5 | Medium | Step 6 | Add Activities/Indicators tabs to Programme and Project detail pages |
| 14 | 1.13 | Small | Step 7 | Add 5 employee fields (address, emergency contact, qualifications, experience) |
| 15 | 1.14 | Medium | Step 7 | Add 5 Attendance fields (checkIn, checkOut, lateFlag, remarks, approvedBy) |
| 16 | 1.15 | Small | Step 7 | Add `approverId`, `actionedAt` to `LeaveRequest` |
| 17 | 1.5 | Small | Step 7 | Add `toDate` to `ProjectAllocation` |
| 18 | WF-05 | Small | Step 6 | Activity basis reference panel in indicator value form |
| 19 | WF-06 | Medium | Step 7 | Leave approval writes `on_leave` attendance rows |
| 20 | WF-07 | Medium | Step 8 | User scope admin UI |
| 21 | 1.16 | Small | Step 8 | Add `changes` to `AuditEntry`; pass changes in every write action |
| 22 | 1.2 | Tiny | Any | Add `address` to `Donor` type and form |
| 23 | 1.8 | Tiny | Any | Add `note` to `SavingsTransaction` |
| 24 | 2.7 | Small | Step 5 | "Activities attended" count on Projects tab of beneficiary detail |

---

## 8. What the Organisation Missed (Logical Gaps)

These are gaps the PRD didn't explicitly address but which any NGO programme would need:

### 8.1 🔴 No way to record why an activity had zero participants

PRD §7.7: "a `completed` activity needs at least one participant or an **explicit 'no participants' reason**." The reason field (`noParticipantsReason`) does not exist in `Activity` type or the UI.

**Fix:** Add `noParticipantsReason?: string` to `Activity`. On the Participants tab: if activity is `completed` and `participants.length === 0`, show a required text area "Reason for no participants" before allowing save.

### 8.2 🟡 SHG member savings balance is not shown anywhere

The seed has `SavingsTransaction` records. There is no computed balance shown on:
- SHG member row in the members table
- SHG detail Overview (only shows member count, not savings total)
- Beneficiary detail SHG tab

**Fix (no new type needed):** Compute balance inline:
```ts
const balance = db.savings
  .filter(t => t.shgMemberId === member.id)
  .reduce((sum, t) => t.txnType === 'deposit' ? sum + t.amount : sum - t.amount, 0);
```
Show in members table and SHG detail.

### 8.3 🟡 Beneficiary enrolled in a project but activity in a different project counts as "attended"

Currently `ActivityParticipant` links beneficiary → activity. But if a beneficiary is enrolled in Project A and an activity belongs to Project B, adding them as a participant has no validation.

**Fix (soft rule, prototype):** When adding a participant to an activity, show a tooltip-warning if the beneficiary is not enrolled in the activity's project. No hard block — field realities sometimes require cross-project participation. The warning text: "This beneficiary is not enrolled in this activity's project. Add anyway?"

### 8.4 🟢 No "consent" field on photo capture

The beneficiary registration form has a consent checkbox (`consentGivenOn`). But the photo upload (gap IG-03, now fixed) has no separate photo consent note. DPDP Act 2023 requires explicit consent for biometric data.

**Fix:** Add a checkbox below the photo upload: "I confirm the person has consented to their photo being stored." Store as `photoConsentGivenOn: string | null` on `Beneficiary`. Prototype: same date as main consent is fine; note this in `decisions.md`.

---

*Agents: update the Summary Table in `gap-analysis-v2.md` after each gap is closed. Add a "Closed YYYY-MM-DD" note to the row. Do not delete closed rows — the history matters for the handoff report.*
