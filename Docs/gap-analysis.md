# Source document vs PRD vs prototype — gap analysis

Source: `VOICE_Trust_Data_Structures_and_Dashboards 01.pdf` (Part A data structures, Part B dashboards).
Reference: `Docs/VOICE Trust MIS – MVP Product Requirements Document.md` (derived from that PDF).
Prototype: this repository, Step 1.

Three-way check. Where the PRD deliberately changes the PDF, the PRD wins and the reason is noted.
Where the prototype drifted from both, the prototype was corrected.

## Part A — data structures

| PDF entity | Prototype type | Status |
| --- | --- | --- |
| A1 Beneficiary Master | `Beneficiary` | ✅ all fields except `ID_Proof_Number` → `idProofLast4` (PRD §4.1, DPDP/UIDAI) and flattened Panchayat/Block/District/State (PRD keeps them on `Village`) |
| A2 Farmer | `Farmer` + `crops[]` | ✅ `Crops_Cultivated` / `Seasonal_Crop_Details` became child rows (PRD §4.1); `Project_IDs` → `beneficiary.projectIds` |
| A3 SHG group | `Shg` | ✅ `Number_of_Members` derived, `Bank_Account_No` deliberately absent (Phase 2, PRD §4.1) |
| A4 SHG member | `ShgMember` + `SavingsTransaction` | ✅ `Savings_Balance` / `Total_Savings_To_Date` derived from transactions (PRD §4.1); loan tables reserved |
| A5 PWD / GAP | `PwdProfile` | ⚠️ core fields present; `Family_Details`, `Employment_Livelihood`, `Followup_Records` arrive with the Step 4 form (PRD §7.6) |
| A6 Programme | `Programme` | ✅ |
| A7 Activity | `Activity` + `ActivityParticipant` | ✅ `Actual_Participants`, `Male/Female/Other_Count`, `Age_Group_Summary` derived from participants (PRD §4.1) |
| A8 Project | `Project` + `ProjectAllocation` | ✅ |
| A9 Village | `Village` | ✅ `Beneficiary_Count` derived |
| A10 MEL indicators / values | `Indicator`, `IndicatorValue` | ✅ |
| A11 Donor | `Donor` | ⚠️ `Donor_Specific_Indicators` and `Report_Deadlines` deferred to the Phase 2 report builder (PRD §2.2) |
| A12 Employee | `Employee` | ✅ except `Salary_Structure_ID` and `Documents` (payroll Phase 2) |
| A13 Attendance / A14 Leave | `Attendance`, `LeaveRequest`, `LeaveType` | ✅ leave balance derived (PRD §4.9) |
| A15 Payroll / A16 Assets / A17 Finance | — | ⛔ out of MVP scope by PRD §2.2, reserved table names in PRD §4.11 |

## Part B — dashboards

### B1 Programme / Executive dashboard

| PDF requirement | Prototype | Status |
| --- | --- | --- |
| Total beneficiaries | KPI 1 | ✅ |
| Farmers registered (link to farmer list) | KPI 2 | ✅ |
| SHGs formed + total members | KPI 3 | ✅ (member count as the delta line) |
| PWD / GAP beneficiaries | KPI 4 | ✅ |
| Active projects | KPI 5 | ✅ |
| Activities this month/quarter | KPI 6, honours the period filter | ✅ |
| Training programmes conducted | KPI 7 | ✅ |
| Villages covered | KPI 8 | ✅ |
| Target vs achievement | `IndicatorMeters` (3 pinned) | ✅ |
| Beneficiary distribution by type (pie/donut) | `DistributionCard` — donut + segmented bar + rows | ✅ |
| Gender-disaggregated participation (stacked bar) | `GenderStack` per programme | ✅ |
| Geographic coverage (district/block bar; map later) | `BarList` by block | ✅ bar chart (map is Phase 2) |
| Monthly activity volume, last 12 months | `ActivityChart` paired bars | ✅ |
| Project-wise beneficiary coverage (horizontal bar) | `BarList` | ✅ |
| Top villages by beneficiary count | `BarList` | ✅ |
| Quick filters: date range, programme, project, district → block → village | `DashboardFiltersBar`, URL-driven, cascading | ✅ |
| Drill-down from every number | Every KPI and row links to a filtered list | ✅ (lists are Step 2–3 placeholders) |

### B2 HRMS dashboard

| PDF requirement | Prototype | Status |
| --- | --- | --- |
| Total employees (active) | KPI | ✅ |
| Department / programme-wise breakdown | card | ✅ |
| Today's attendance: present / absent / on leave / field duty + % | card | ✅ |
| Leave summary (month): approved days by type, pending count | card | ✅ |
| Upcoming birthdays / anniversaries | card | ✅ birthdays (no anniversary field in the schema yet) |
| Open positions / vacancies | — | ⛔ not tracked anywhere in the PDF's data structures |
| Payroll status (last run) | card | ⛔ shown as "Coming in Phase 2" — payroll is excluded by PRD §2.2 |
| Staff allocation across projects | card | ✅ staff count per project with FTE total (see change below) |
| Leave balance summary by employee | — | ⏳ listed as an additional/optional view; lands with the Leave screen in Step 7 |

### B3 Asset & Finance dashboard

The PDF asks for assets, expenditure to date, utilisation % and pending expense approvals.
**This conflicts with the PRD**, which excludes asset management and expense entry from the MVP
(§2.2) and allows only a read-only approved-budget card (§8.4). The PRD is binding, so the
finance screen shows approved budget per active project plus "available once the Finance module
is enabled". Nothing asset-related was built.

### B4 Role-based dashboard access

Matches the PDF table exactly: Executive full, Programme Manager scoped, Coordinator
project-scoped, MEL indicators-first, Field staff `/home` counts only, HR full HRMS, Finance
budget summary, Data entry task list only.

### B5 Common behaviours

| Requirement | Status |
| --- | --- |
| KPI drill-down | ✅ |
| Role-appropriate landing after login | ✅ |
| Load < 3–5 s | ✅ on the 120-row seed (not measured at 50k) |
| Saved filter sets / personal default views | ⏳ "desirable" in the PDF; not built |
| Export current view (Excel / PDF) | ✅ CSV of KPIs, monthly volume, distribution, project/village/block breakdowns; PDF is PRD Phase 2 |
| Mobile-responsive | ✅ layout rules at 1100/768 px; not yet checked at 390 px |

## Changes made in this pass

1. Dashboard query rewritten to the PDF's B1 list: 8 KPI cards instead of 4; recent/indicator
   widgets kept.
2. Added charts the PDF requires and the prototype was missing: beneficiary distribution donut,
   project-wise coverage, top villages, district/block coverage.
3. Added functional quick filters (period, programme, project, district → block → village) with
   cascade clearing and URL mirroring, replacing the decorative filter pills.
4. Added `GET /api/dashboard/export` — CSV of the current filtered view, session-guarded.
5. Fixed a real bug found during alignment: the filter component wrote `programmeId` into the URL
   while the parser read `programme`, so filtering silently did nothing.
6. HR allocation showed "260% FTE" per project because percentages were summed across staff;
   it now leads with the staff count and shows the FTE total beside it.

## Still open (deliberate)

- Asset/finance monitoring from PDF B3 (blocked by PRD §2.2).
- Payroll status, open positions, employee anniversaries (no data in the MVP schema).
- Saved filter views and PDF export.
- PWD family/employment/follow-up fields — Step 4.
- Donor-specific indicators and report deadlines — Phase 2.
