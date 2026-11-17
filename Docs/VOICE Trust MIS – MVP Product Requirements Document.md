# VOICE Trust MIS – MVP Product Requirements Document

Integrated MIS, HRMS and Programme Management System · MVP v1.0 · Built from the *Data Structures & Dashboard Specifications* PDF

## 0. How an AI agent must use this document

This PRD is written to be executed top to bottom by a coding agent. Follow these rules throughout:

1. **Build in the order of Section 11 (Build Sequence).** Do not start a milestone until the previous one meets its Definition of Done.
2. **Never invent scope.** Anything in Section 2.2 (Out of scope) must not be built, only left room for.
3. **Schema first.** Write migrations from Section 4 before any UI. If a field is missing, add it to the migration and note the change in `/docs/decisions.md`.
4. **One module = one folder** containing schema, validation (Zod), server actions/API, UI, and tests.
5. **Every screen must implement all four states:** loading, empty, error, populated.
6. **Every mutation writes an audit-log row.** Every query is role- and scope-filtered at the database layer, not only in the UI.
7. **Use the design tokens in Section 9.** Do not hardcode colours, spacing or font sizes.
8. After each milestone, run lint, type-check, tests, then update `/docs/progress.md` with what was done and what is next.

## 1. Product summary

### 1.1 Problem

VOICE Trust runs agriculture, SHG (self-help group) and disability-inclusion (PWD/GAP) programmes across villages. Beneficiary, activity, staff and project data sits in spreadsheets and paper, so the Executive Director cannot get one reliable picture, donor reports take weeks, and the same person is counted in several lists.

### 1.2 Vision

One system where every person is registered once (a unique beneficiary record), every activity is linked to a project and a donor, and every role lands on a dashboard that answers its own questions in under five seconds.

### 1.3 Users and primary jobs

| Role | Main job in the MVP |
| --- | --- |
| Executive Director / Chief Administrative Officer (`admin`) | See organisation-wide numbers, approve, manage users |
| Programme Manager (`programme_manager`) | Track own programmes and projects, review activities |
| Project Coordinator (`project_coordinator`) | Run assigned projects, check beneficiaries and activities |
| MEL Officer (`mel_officer`) | Maintain indicators, compare target vs achievement, gender views |
| Field Staff (`field_staff`) | Register beneficiaries and log activities in assigned villages |
| HR / Admin (`hr_admin`) | Employees, attendance, leave |
| Finance Staff (`finance`) | Phase 2 (read-only project budget totals in MVP) |
| Data Entry Operator (`data_entry`) | Enter records from a task list, no dashboards |

### 1.4 MVP success metrics

- 100% of existing beneficiaries imported once, with duplicates flagged by mobile number plus name plus village.
- A field staff member registers a beneficiary in under 90 seconds on a phone.
- Executive dashboard loads in under 3 seconds with 50,000 beneficiaries.
- Zero cross-role data leaks in the access test matrix (Section 12).

## 2. Scope

### 2.1 In scope (MVP)

1. Authentication, roles, project/programme scoping, audit log
2. Masters: Villages, Donors (minimal), Programmes, Projects
3. Beneficiary registry with Farmer, SHG (group, members, savings) and PWD profiles
4. Activities with participant attendance and attachments
5. MEL: indicators and periodic achievement values (target vs achievement)
6. HR-lite: Employees, daily attendance, leave requests and approval, project allocation
7. Dashboards: Executive/Programme, HRMS, and a read-only budget summary card
8. CSV import for villages and beneficiaries, CSV/Excel export from every list

### 2.2 Out of scope (design for it, do not build it)

Payroll runs and payslips · Asset management · Expense vouchers and approvals · SHG internal loans and repayments · Donor-specific report builder · Interactive village map · Native mobile apps and offline sync · Double-entry accounting · Multi-language UI (keep strings in a single file so this is easy later).

## 3. Architecture and stack

These are defaults chosen for speed, safety and a small team. Swap only with a written reason in `/docs/decisions.md`.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript strict | One codebase for UI and server, great for dashboards |
| Database | PostgreSQL (Supabase or Neon) | Relational data with strong constraints and views |
| ORM / migrations | Drizzle ORM (or Prisma) with SQL migrations committed | Typed schema, reviewable history |
| Auth | Supabase Auth or Auth.js, email + password, optional OTP | Fast to ship, role claims in JWT |
| Authorisation | Postgres Row Level Security + server-side guard helpers | Defence in depth |
| UI | Tailwind CSS + shadcn/ui (Radix) + lucide-react icons | Accessible primitives, easy theming by tokens |
| Tables | TanStack Table with server-side pagination, sort, filter | Large lists stay fast |
| Forms | React Hook Form + Zod | One schema for client and server validation |
| Charts | Recharts | Simple, themeable |
| File storage | Supabase Storage / S3, private buckets, signed URLs | Photos and certificates are sensitive |
| Hosting | Vercel (app) + managed Postgres in an India region | Latency and data-residency comfort |
| Quality | ESLint, Prettier, Vitest, Playwright (smoke), GitHub Actions | Minimum professional bar |

### 3.1 Folder structure

```
/src
  /app            routes (route groups: (auth), (app))
  /modules        beneficiaries, farmers, shgs, pwd, programmes, projects,
                  activities, mel, employees, attendance, leave, dashboards
    /<module>     schema.ts  validators.ts  actions.ts  queries.ts  components/  tests/
  /components/ui  shadcn primitives
  /components/app shell, data-table, filter-bar, kpi-card, empty-state
  /lib            db, auth, rbac, audit, format, csv
  /styles         tokens.css
/db  migrations/  seed/
/docs decisions.md  progress.md
```

### 3.2 Engineering conventions

- Server components fetch data; mutations are server actions or route handlers validated by the same Zod schema used in the form.
- All list screens use URL query params for filters, sort and page, so views are linkable and back-button safe.
- Money is `numeric(14,2)`, dates are `date`, timestamps are `timestamptz` stored in UTC and shown in IST.
- Soft delete (`deleted_at`) on all master and person tables. Hard delete is never exposed in the UI.
- Environment variables are validated at boot. No secrets in the repo.

## 4. Data model

### 4.1 Improvements over the source PDF (and why)

The PDF lists fields, but several are comma-separated or computed values that break at scale. The MVP schema makes these changes:

| PDF field | MVP treatment |
| --- | --- |
| `Project_IDs` on Farmer, SHG, PWD | Replaced by junction tables (`beneficiary_projects`, `shg_projects`) |
| `Crops_Cultivated`, `Seasonal_Crop_Details` | Child table `farmer_crops` |
| `Number_of_Members`, `Beneficiary_Count`, `Actual_Participants`, `Male/Female_Count`, `Savings_Balance`, `Balance`, `Utilised_Amount` | **Derived** via views, never stored |
| `ID_Proof_Number`, `Bank_Account_No` | Store only the **last 4 digits** plus the type. Full Aadhaar must never be stored (UIDAI and DPDP Act 2023). Bank account numbers are Phase 2 and encrypted |
| `Training_Records`, `Attendance_Records`, `Followup_Records`, `Loan_Details` | Child tables or derived from activities |
| Village `Panchayat/Block/District/State` as text | Kept as text columns in MVP with indexes; normalise to a hierarchy in Phase 2 |

### 4.2 Conventions for every table

```
id           uuid primary key default gen_random_uuid()
code         text unique  -- human ID e.g. BEN-000123, generated from a sequence
created_at   timestamptz not null default now()
updated_at   timestamptz not null default now()
created_by   uuid references profiles(id)
updated_by   uuid references profiles(id)
deleted_at   timestamptz null
```

Tables without a `code` (junctions, logs) omit it. Enum columns use Postgres enums. Add an index on every foreign key and on every column used in a dashboard filter.

### 4.3 Enums

```
role:            admin | programme_manager | project_coordinator | mel_officer |
                 field_staff | hr_admin | finance | data_entry
gender:          male | female | other
record_status:   active | inactive | archived
project_status:  draft | active | on_hold | completed | cancelled
activity_type:   training | awareness | meeting | field_visit | distribution | other
activity_status: planned | completed | cancelled
land_ownership:  owned | leased | shared | landless
shg_role:        member | president | secretary | treasurer
attendance_status: present | absent | on_leave | field_duty | half_day | holiday
leave_status:    pending | approved | rejected | cancelled
```

### 4.4 Tables: identity, access and geography

```
profiles            -- one row per login user
  id (= auth user id), full_name, email, role (role), employee_id fk null, is_active bool

user_scopes         -- limits programme_manager / project_coordinator / field_staff
  user_id fk, programme_id fk null, project_id fk null, village_id fk null

villages
  code, name, panchayat, block, district, state, population int null,
  latitude numeric(9,6) null, longitude numeric(9,6) null, status
  unique (name, panchayat, block, district)

audit_log           -- append only, no update or delete permission for any role
  id, actor_id, action (create|update|delete|view_sensitive|export|login),
  table_name, record_id, changes jsonb, ip inet, at timestamptz
```

### 4.5 Tables: funding and programme structure

```
donors
  code, name, donor_type, contact_person, email, phone, address,
  grant_start date, grant_end date, approved_budget numeric(14,2), status

programmes
  code, name, description, objectives, focus_area, target_geography,
  target_beneficiaries text, coordinator_id fk employees, start_date, end_date,
  funding_source, status

projects
  code, name, donor_id fk, programme_id fk, objectives, location_summary,
  start_date, end_date, approved_budget numeric(14,2),
  coordinator_id fk employees, target_beneficiaries int, status (project_status)
  check (end_date >= start_date)

project_villages    (project_id fk, village_id fk, primary key (project_id, village_id))
project_allocations (employee_id fk, project_id fk, allocation_pct int check 1..100,
                     from_date, to_date null)
```

### 4.6 Tables: beneficiaries and profiles

```
beneficiaries
  code, full_name, gender, date_of_birth date null, mobile text,
  alternate_contact text null, address_line, village_id fk,
  id_proof_type (aadhaar|voter|ration|pan|other) null,
  id_proof_last4 char(4) null, photo_path text null,
  enrolment_date date, status (record_status)
  index (village_id), index (mobile), trigram index (full_name)
  -- duplicate warning: same mobile OR (lower(full_name)+village_id+date_of_birth)

beneficiary_projects  (beneficiary_id fk, project_id fk, enrolled_on date,
                       primary key (beneficiary_id, project_id))

farmers
  code, beneficiary_id fk unique, land_holding_acres numeric(7,2),
  land_ownership (land_ownership), farming_type (conventional|organic|mixed),
  organic_status (none|in_conversion|certified), irrigation_source,
  organic_practices text, support_received text, equipment_received text,
  farmer_group text null, gps_latitude, gps_longitude, followup_notes text, status

farmer_crops  (farmer_id fk, season (kharif|rabi|zaid|perennial), crop text,
               area_acres numeric(7,2))

pwd_profiles          -- SENSITIVE
  code, beneficiary_id fk unique, disability_type, disability_percentage int 0..100,
  certificate_no, certificate_issue_date, certificate_issuing_authority,
  education_level, vocational_status, accessibility_needs text,
  assistive_device text, individual_plan text, outcome text, status

pwd_interventions   (pwd_id fk, intervention_type, given_on date, description)
pwd_followups       (pwd_id fk, followup_date, notes, recorded_by fk profiles)
```

### 4.7 Tables: SHG

```
shgs
  code, name, village_id fk, formation_date, livelihood_activity,
  meeting_frequency (weekly|fortnightly|monthly), bank_name null, ifsc null,
  bank_linkage_date null, support_received text, status
shg_projects  (shg_id fk, project_id fk)

shg_members
  id, shg_id fk, beneficiary_id fk, role (shg_role), join_date, status
  unique (shg_id, beneficiary_id)
  -- rule: only one president, secretary, treasurer per active SHG

shg_savings_transactions
  id, shg_member_id fk, txn_date, txn_type (deposit|withdrawal), amount numeric(12,2) > 0, note
```

Derived view `v_shg_member_savings` returns balance and lifetime deposits per member. `v_shg_summary` returns member count and total savings per group.

### 4.8 Tables: activities and MEL

```
activities
  code, programme_id fk, project_id fk, title, description,
  activity_type, start_date, end_date, location text, village_id fk,
  target_participants int, resource_persons text, expenditure numeric(12,2) null,
  outputs_results text, status (activity_status)
activity_participants (activity_id fk, beneficiary_id fk, attended bool default true,
                       primary key (activity_id, beneficiary_id))
activity_staff        (activity_id fk, employee_id fk)
activity_attachments  (id, activity_id fk, file_path, kind (photo|document), caption)

indicators
  code, project_id fk, name, description, unit, baseline numeric, target numeric,
  reporting_frequency (monthly|quarterly|half_yearly|annual), data_source,
  responsible_employee_id fk, gender_disaggregated bool, status
indicator_values
  id, indicator_id fk, period_start, period_end, value numeric,
  male_value numeric null, female_value numeric null, remarks, entered_by, entered_at
  unique (indicator_id, period_start, period_end)
```

Derived: `v_activity_counts` gives actual, male, female and other participant counts and age groups computed from `beneficiaries.date_of_birth`.

### 4.9 Tables: HR-lite

```
employees
  code, full_name, gender, date_of_birth, mobile, email, address, designation,
  department, date_of_joining, employment_type (permanent|contract|consultant|intern),
  employment_status (active|on_notice|exited), emergency_contact_name,
  emergency_contact_phone, qualifications text, experience_summary text, user_id fk null

attendance
  id, employee_id fk, attendance_date, check_in time null, check_out time null,
  status (attendance_status), late_flag bool, remarks, approved_by fk null
  unique (employee_id, attendance_date)

leave_types      (id, name, annual_quota numeric, is_paid bool)
leave_requests
  id, employee_id fk, leave_type_id fk, from_date, to_date, days numeric(4,1),
  reason, status (leave_status), approver_id fk, applied_at, actioned_at
```

Derived: `v_leave_balance` = quota minus approved days in the current financial year (April to March).

### 4.10 Dashboard views (build in Milestone 6)

`v_kpi_beneficiaries`, `v_kpi_activity_monthly`, `v_kpi_project_coverage`, `v_kpi_gender_participation`, `v_kpi_indicator_progress`, `v_kpi_hr_today`. Each view takes filters through SQL functions (`date_from`, `date_to`, `programme_id`, `project_id`, `district`, `block`, `village_id`) and respects RLS. Add materialised views only if a query exceeds 1 second on the 50,000-row seed.

### 4.11 Phase 2 tables (reserved names, do not build)

`payroll_runs`, `payroll_items`, `salary_structures`, `assets`, `asset_allocations`, `asset_maintenance`, `budgets`, `expenses`, `shg_loans`, `shg_loan_repayments`, `shg_meetings`, `donor_reports`.

## 5. Security, privacy and audit

### 5.1 Access matrix (C create, R read, U update, D archive, – none, own/scope = limited to assigned scope)

| Module | admin | prog. mgr | proj. coord | MEL | field | HR | finance | data entry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Users and roles | CRUD | – | – | – | – | – | – | – |
| Villages, Donors | CRUD | R | R | R | R | – | R | R |
| Programmes | CRUD | RU scope | R scope | R | – | – | R | – |
| Projects | CRUD | RU scope | RU scope | R | R scope | – | R | – |
| Beneficiaries, Farmers, SHGs | CRUD | R scope | CRU scope | R | CRU scope | – | – | CRU scope |
| PWD profiles | CRUD | R scope | R scope | R (no names) | CRU scope | – | – | – |
| Activities | CRUD | RU scope | CRU scope | R | CRU scope | – | – | CRU scope |
| MEL indicators | CRUD | R scope | R scope | CRUD | – | – | – | – |
| Employees | R | R basic | R basic | – | own | CRUD | R basic | – |
| Attendance, Leave | R | approve team | – | – | own | CRUD | – | – |

### 5.2 Rules

- **RLS on every table.** Scope for `programme_manager`, `project_coordinator` and `field_staff` comes from `user_scopes`. A policy helper `has_scope(project_id, village_id)` is reused everywhere.
- **PWD data:** fields are hidden unless the role is permitted; every open of a PWD record writes a `view_sensitive` audit row. MEL officers see aggregates only.
- **Files** live in private buckets and are served through signed URLs that expire in 10 minutes.
- **Passwords:** minimum 10 characters, lockout after 5 failed attempts, optional TOTP for `admin`.
- **Audit:** the audit page (admin only) filters by user, table, date, and action, and exports to CSV.
- **Backups:** daily automated backup with a restore drill documented before go-live.
- **Consent:** registration form has a consent checkbox and a stored consent date for beneficiaries (add `consent_given_on date` to `beneficiaries`).

## 6. API and data-access conventions

- Name actions by verb and noun: `createBeneficiary`, `updateBeneficiary`, `archiveBeneficiary`, `listBeneficiaries`.
- Every list query accepts `{ q, filters, sort, page, pageSize }` and returns `{ rows, total }`. Page size defaults to 25, maximum 100.
- Every action returns `{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`. Error messages tell the user what to fix.
- Validation lives in `validators.ts` and is shared by form and server.
- CSV import is a two-step flow: upload and validate (shows row-level errors), then confirm and commit in a single transaction.
- Exports respect the current filters and write an `export` audit row.

## 7. Module specifications (screens, rules, acceptance)

Every module below gets the same four screens unless stated: **List**, **Detail**, **Create/Edit form**, **Archive confirmation**. Patterns for these screens are defined once in Section 9.4 and reused.

### 7.1 Auth, users and scopes

- **Screens:** Sign in, Forgot password, Users list (admin), User form (role, active flag, scopes), Audit log (admin).
- **Rules:** a user with a scoped role must have at least one scope row. Deactivating a user ends their sessions.
- **Acceptance:**
  - Each role lands on its own dashboard after sign-in (see 8.5).
  - A `field_staff` user cannot read a beneficiary outside assigned villages, even by guessing the URL or calling the API directly.
  - Every create, update, archive, export and sensitive view appears in the audit log.

### 7.2 Masters: Villages, Donors, Programmes, Projects

- **Villages:** list with search and district/block filters; CSV import; beneficiary count column (derived).
- **Donors:** minimal form; grant period; list of linked projects.
- **Programmes:** detail page tabs: Overview, Projects, Activities, Team.
- **Projects:** detail page tabs: Overview, Beneficiaries, Activities, Indicators, Team and villages, Budget (read-only summary of `approved_budget`).
- **Rules:** a project must have a donor and a programme to move from `draft` to `active`. End date cannot precede start date. Programme and project codes are generated automatically and cannot be edited.
- **Acceptance:** creating a project, attaching villages and allocating two employees works end to end; archived masters disappear from pickers but remain on historical records.

### 7.3 Beneficiary registry (core module)

- **List columns:** Code, Name, Gender, Age (derived), Village, Mobile, Profiles (chips: Farmer, SHG, PWD), Projects count, Status. Sensitive PWD chip is shown only to permitted roles.
- **Filters:** Village cascade (district, block, village), gender, profile type, project, programme, status, enrolment date range. Search by name, code or mobile.
- **Create form (sectioned, single page):** 1) Identity (name, gender, date of birth), 2) Contact and address (mobile, village picker, address), 3) ID proof (type and last 4 digits only), 4) Projects to enrol in, 5) Photo (optional, camera or upload), 6) Consent. Optional step 7: add a Farmer, SHG membership or PWD profile.
- **Duplicate guard:** on blur of mobile and on save, show a non-blocking panel "Possible match" with the existing record. The user can open it or continue with a reason.
- **Detail page tabs:** Profile, Farmer, SHG, PWD (only if permitted), Projects, Activities attended, Timeline (audit-derived).
- **Acceptance:**
  - Registration completes in under 90 seconds with the keyboard only and on a 390px-wide phone.
  - Importing a 5,000-row CSV reports row-level errors and flags duplicates without creating them silently.
  - Exactly one Farmer profile and one PWD profile per beneficiary, enforced by unique constraints.

### 7.4 Farmer profile

- Form sections: Land (acres, ownership, irrigation), Practices (farming type, organic status, practices), Crops (repeatable rows: season, crop, area), Support and equipment received, Location (GPS capture button on mobile), Follow-up notes.
- **Rules:** sum of crop areas may exceed land (multi-cropping) but show an info hint. GPS is optional but must be valid India-range coordinates.
- **Acceptance:** farmer list filters by organic status, crop and village; counts match the dashboard card exactly.

### 7.5 SHG module

- **Group:** list (name, village, members, total savings, last meeting), detail tabs: Overview, Members, Savings, Linked projects.
- **Members:** add existing beneficiaries by search; assign role; one president, one secretary, one treasurer rule.
- **Savings:** a fast entry grid, one row per member for a given date, with total at the bottom; saves in one transaction. Corrections are made by a reversing entry, not by editing.
- **Acceptance:** member count and balances on list and detail always agree with the views; removing a member sets status to inactive and keeps history.

### 7.6 PWD / GAP module (sensitive)

- **Access:** list and detail hidden from roles without permission, not just greyed out. A banner on the detail page reads "Confidential. Views are logged."
- **Form sections:** Disability (type, percentage, certificate details), Education and vocation, Accessibility needs and assistive devices, Individual plan, Interventions (repeatable), Follow-ups (timeline, newest first), Outcome.
- **Acceptance:** audit row is created on every detail view; MEL officer sees only aggregated counts by disability type and gender, never names.

### 7.7 Activities

- **List:** calendar toggle plus table. Columns: Date, Title, Type, Project, Village, Participants (actual/target), Status.
- **Form:** Basics (title, type, project, programme auto-filled from project), When and where, Target participants, Staff and resource persons, Outputs and results, Expenditure (optional), Attachments (multiple photos or files, max 10 MB each).
- **Participants:** after saving, a participants tab lets staff add beneficiaries by search or **bulk add by village**, and toggle attended. Actual, male, female and other counts are derived.
- **Rules:** a `completed` activity needs at least one participant or an explicit "no participants" reason. Completed activities lock to editing by field staff after 7 days (coordinator can unlock).
- **Acceptance:** adding participants updates dashboard gender charts and village counts on next load.

### 7.8 MEL

- **Indicators:** list by project with baseline, target, latest value, % achieved, frequency, and a status chip (On track, Behind, No data).
- **Values entry:** one form per period; if `gender_disaggregated`, male and female are required and must sum to the total.
- **Acceptance:** the Executive dashboard target-vs-achievement widget uses the same view as this screen.

### 7.9 HR-lite

- **Employees:** list, detail tabs: Profile, Allocation (projects and percentage, total must not exceed 100), Attendance, Leave.
- **Attendance:** HR marks daily status in a bulk grid (default present, change exceptions); employees can self check-in/out with the late flag computed against a configurable office start time. One row per employee per day.
- **Leave:** employee applies, approver (programme manager or HR) approves or rejects with a remark; balance is shown at application time; overlapping requests are blocked.
- **Acceptance:** today's attendance summary on the HRMS dashboard equals the sum of rows for today; leave approval updates attendance to `on_leave` automatically for the date range.

## 8. Dashboard specifications

### 8.1 Global behaviour

- Filters (date range, programme, project, district to block to village) live in a sticky bar under the top bar and are mirrored in the URL.
- Every number is a link that opens the matching filtered list with the same filters applied.
- Default date range: current financial year (April to March). Presets: This month, This quarter, This FY, Last 12 months, Custom.
- Every widget shows loading skeleton, empty message that explains the next step, and error state with a retry button.
- Export button exports the underlying data of the current view to Excel or CSV; PDF export is Phase 2.
- Target: each dashboard loads under 3 seconds on the 50,000-beneficiary seed.

### 8.2 Executive and Programme dashboard (`/dashboard`)

Audience: admin, programme manager, MEL officer, project coordinator (scoped).

| Widget | Definition | Drill-down |
| --- | --- | --- |
| **Reach band (hero)** | Unique active beneficiaries as the main figure, with one segmented bar for Farmers, SHG members and PWD (a person can fall in more than one, so show the overlap note) | Click a segment to filter beneficiary list by profile type |
| Active projects | Count of projects with status `active` | Projects list |
| Activities this period | Completed and planned counts | Activities list |
| Trainings conducted | Activities of type `training`, completed | Activities list filtered |
| Villages covered | Distinct villages with a beneficiary or an activity | Villages list |
| SHGs | Active groups and total members | SHG list |
| Target vs achievement | Up to 5 pinned indicators, bar showing % achieved | Indicator detail |

Charts, each with a one-line takeaway title in plain language ("Women are 58% of participants"):

1. Beneficiaries by type: donut with legend counts.
2. Gender-disaggregated participation: horizontal stacked bar per programme.
3. Monthly activity volume: column chart, last 12 months.
4. Project-wise beneficiary coverage: horizontal bars sorted descending.
5. Top 10 villages by beneficiaries: ranked list with inline bars.
6. District or block coverage bar chart (placeholder for the Phase 2 map).

### 8.3 HRMS dashboard (`/dashboard/hr`)

Total employees (active) · Staff by department or programme · Today's attendance (present, absent, on leave, field duty, with %) · Leave this month (approved days by type, pending count linking to the approval queue) · Staff allocation across projects (stacked bar) · Birthdays and anniversaries in the next 14 days (optional small list). Payroll status card shows "Coming in Phase 2" and is hidden for non-HR roles.

### 8.4 Budget summary card (finance preview)

A single card on the Executive dashboard and Project detail: approved budget per active project and total. Expenditure and utilisation show "Available once Finance module is enabled". Do not build expense entry in the MVP.

### 8.5 Role landing pages

| Role | Lands on | Sees |
| --- | --- | --- |
| admin | `/dashboard` | Everything, all filters, HR summary card |
| programme\_manager | `/dashboard` | Own programmes and projects, team leave queue |
| project\_coordinator | `/dashboard` | Assigned projects only |
| mel\_officer | `/dashboard` with MEL tab first | Indicators, gender and inclusion views, no PWD names |
| field\_staff | `/home` | Assigned villages, "Add beneficiary" and "Log activity" buttons, recent entries, simple counts |
| hr\_admin | `/dashboard/hr` | HRMS dashboard, headline programme counts |
| finance | `/dashboard/finance` (stub) | Budget summary card |
| data\_entry | `/home` | Task list only, no dashboards |

## 9. UI design system

### 9.1 Visual reference (from the owner's screenshot)

The owner supplied a screenshot of a light finance dashboard (Finixia-style). It is the visual brief and overrides any conflicting guidance in this PRD. Save it as `/docs/ui-reference/dashboard-reference.png` before Milestone 1. Copy its structure and feel; replace its finance content with VOICE Trust content. Colour values below were sampled by eye, so colour-pick the screenshot and correct `tokens.css` if they differ.

**What to copy**

- A three-column shell inside one rounded white frame on a light-grey page: left navigation, centre content, right inbox rail.
- Sidebar: workspace switcher on top, small group labels, a user card pinned at the bottom.
- Page header: a plain greeting on the left, one violet primary button on the right.
- **Nested cards.** Every widget is a pale-grey outer container with a small icon and label strip (and a 'View all' link), holding a white inner card.
- KPI cards: small label, one number, a small green or red delta pill with an arrow.
- Main chart card: legend with totals and delta pills, date-range dropdown at right, paired vertical bars (violet fading downward, and a lighter lavender), faint grid lines.
- Breakdown card: large total, segmented bar in three colours, then a table of icon, category, percent, total.
- List card: rows with a round icon, title, subtitle, value at the right and relative time.
- Right rail: a heading and a pinned input area at the bottom.

**How the reference maps to VOICE Trust**

| Reference widget | VOICE Trust widget |
| --- | --- |
| Welcome greeting and 'Add new' | 'Good morning, Asha' and 'Add beneficiary' |
| Four KPI cards (revenue, expense, profit, cashflow) | Beneficiaries reached, Active projects, Activities this FY, Villages covered |
| Total revenue bar chart, revenue vs expense | Activities per month, planned vs completed, with a range dropdown |
| Spending breakdown | **Reach breakdown**: Farmers, SHG members, PWD as a segmented bar plus a table of percent and count (this is the 'Reach band' in 8.2; it is a card, not a full-width hero) |
| Transactions list | Recent activities: title, type and village, participants, time ago |
| AI Inbox rail | **Inbox** rail: items that need action (leave approvals, possible duplicates, overdue indicator entries, follow-ups due) and two quick-add buttons. The 'Ask me anything' assistant box is Phase 2 and must not be built now |
| Sidebar groups 'Track' and 'Services' | Overview, People, Work, Organisation, Admin |

The memorable element stays disciplined: the segmented Reach bar. Everything else is quiet.

### 9.2 Design tokens (`/src/styles/tokens.css`)

| Token | Value (approx.) | Use |
| --- | --- | --- |
| `--violet-600` | `#5B3FD9` | Primary button, primary bars, links, focus ring |
| `--violet-200` | `#C9BFF5` | Secondary series bars, soft highlights |
| `--ink` | `#14161B` | Primary text |
| `--muted` | `#6B7280` | Labels, captions, axis text |
| `--page` | `#E9E9EB` | Page background outside the frame |
| `--frame` | `#FAFAFB` | App frame and main surface |
| `--panel` | `#F3F4F6` | Outer card container and active nav item |
| `--paper` | `#FFFFFF` | Inner cards, tables, forms |
| `--line` | `#E7E8EC` | Hairlines, dividers, grid lines |
| `--positive` / `--positive-bg` | `#0B7A3E` / `#E6F6EC` | Up delta, on track |
| `--negative` / `--negative-bg` | `#C2253F` / `#FDECEF` | Down delta, errors, behind target |
| `--green-500` | `#22C55E` | Chart and segmented-bar segment |
| `--amber-500` | `#F2A413` | Chart and segmented-bar segment, warnings |

Chart series order: violet, lavender, green, amber, sky `#38A3D1`, stone `#8A93A5`. Primary bars use a vertical gradient from `--violet-600` at the top to a pale tint at the base; secondary bars use `--violet-200`. Delta and status always carry an arrow, sign or label, never colour alone. Text colours must meet 4.5:1 on their background.

**Typography**

- One family, as in the reference: **Inter** (Geist is an acceptable substitute), with **Noto Sans Devanagari** in the fallback stack for Marathi and Hindi names.
- Weights 400, 500 and 600 only. Greetings and numbers are 500, not bold.
- Scale (px): 11 card header label, 12 meta and axis, 13 dense table, 14 body and navigation, 16 form inputs, 20 greeting and page title, 24 KPI value, 28 chart total.
- Use `font-variant-numeric: tabular-nums` for all figures. Sentence case everywhere, no all-caps labels.

**Spacing, shape, elevation**

- 4px base. Gap between panels 16px. Outer panel padding 8px around a white inner card with 16px padding.
- Radius: app frame 20px (desktop only), panels 14px, inner cards 10px, buttons and inputs 8px, pills fully round.
- Separation comes from the grey-on-white nesting and 1px `--line`, not shadows. Shadows only on menus, popovers and the side drawer.
- Motion: 150ms ease-out for menus, drawers and button feedback. One entrance moment: chart bars grow from the baseline once on first load (600ms). Respect `prefers-reduced-motion`.

### 9.3 App shell and card specifications

**Shell**

- Page background `--page` with a 24px margin; the frame is rounded and uses `--frame`. Below 1280px the frame goes full-bleed.
- **Left sidebar, 240px.** Workspace switcher card (logo, 'VOICE Trust', signed-in email, chevron). Group labels in muted 12px: Overview, People, Work, Organisation, Admin. Items are 36px high with a 16px lucide icon; the active item has a `--panel` background and weight 500. The user card sits at the bottom with avatar, name, email and a menu (profile, sign out). Collapses to a 64px icon rail below 1100px and to a bottom tab bar below 768px.
- **Centre column.** Header row: greeting (20px, 500) at left; at right a search button (Ctrl/Cmd+K) and the primary button. The filter bar below holds quiet dropdown pills: date range, programme, project, district to block to village.
- **Right Inbox rail, 320px.** Heading 'Inbox', then a scroll list of action cards (icon, title, one-line detail, action link). Two quick-add buttons are pinned at the bottom: 'Add beneficiary' and 'Log activity'. Shown at 1440px and wider; between 1100px and 1440px it opens from a top-bar button as a drawer; on mobile its items move to the Home screen.

**Card specifications**

- **Panel:** outer `--panel`, radius 14, padding 8. Header strip 28px high: 14px icon, 12px muted label, optional 'View all' link at right. Body is a white inner card, radius 10, padding 16.
- **KpiCard:** a Panel with label strip; inner card shows the value (24px, 500) and a `DeltaPill` (arrow, percent, change versus the previous period). Four per row on desktop, two on tablet, one on phone.
- **ChartCard (paired bars):** legend row with each series total and delta pill, range dropdown at right, bars 14px wide with 4px between the pair and 3px top radius, dashed `--line` grid, five y ticks, 11px muted x labels, tooltip with both values on hover, click a bar to drill down.
- **BreakdownCard (Reach):** total at 28px with delta pill; segmented bar 8px high with 6px gaps and round ends; legend dots; then rows of 32px tinted icon square, name, percent, count at 48px row height with hairlines. A footnote reads 'People can belong to more than one group.' The bar is proportional to profile counts.
- **ListCard (recent activities, inbox items):** rows 56px high with a 36px round icon, title 14px (500), subtitle 12px muted, value at the right, relative time beneath it, hairline dividers.
- Add `Panel`, `DeltaPill`, `SegmentedBar` and `InboxRail` to the component list in 9.5. Where 9.4 says 'hero band', use the card order in the wireframe in 10.1.

### 9.4 Reusable page patterns

1. **List page:** title and primary action (right), filter bar, active filter chips, data table, pagination, bulk actions. Saved views menu is Phase 1.5.
2. **Detail page:** header with name, code, status pill and actions; tabs below; two-column overview (facts left, activity right).
3. **Form:** drawer (right, 560px) for short forms, full page for registration; sections separated by headings, labels above inputs, helper text under inputs, sticky footer with "Save" and "Cancel". Primary button label names the action ("Save beneficiary", "Approve leave").
4. **Dashboard:** filter bar, hero band, KPI row, chart grid (2 columns desktop, 1 mobile).
5. **Confirm dialog:** states the consequence ("Archive Sunita Patil? She will stop appearing in lists but her history is kept.") and uses the same verb on the button.

### 9.5 Core components (build once, in `/components`)

`AppShell`, `DataTable` (server-side sort, filter, pagination, column visibility, row click, CSV export), `FilterBar` (with village cascade), `KpiCard`, `ReachBand`, `ChartCard` (title, takeaway, chart, export, empty and error states), `StatusPill`, `EntityPicker` (async search select), `FormSection`, `Field`, `FileDropzone`, `ConfirmDialog`, `EmptyState`, `Toast`, `Skeleton`, `Timeline`, `PermissionGate`.

### 9.6 States and copy rules

- **Empty:** explain and offer the action. Example: "No activities yet. Log your first activity to see it here." \[Log activity\]
- **Error:** say what failed and how to fix. Example: "Mobile number must be 10 digits." Never "Something went wrong" alone.
- **Success toast** repeats the action verb: "Beneficiary saved."
- **Destructive actions** are always "Archive", never "Delete", in the UI.
- Use plain terms users know: "Self-help group", not "SHG entity"; "Village", not "geo unit".

### 9.7 Accessibility and responsiveness (quality floor)

- WCAG 2.1 AA contrast; visible 2px indigo focus ring with 2px offset; full keyboard use of tables, drawers and dialogs; labels on every input; form errors announced with `aria-live`.
- Touch targets at least 44px on mobile. Inputs at 16px to avoid iOS zoom.
- Field staff screens (`/home`, registration, activity log) are designed mobile-first. Tables collapse to stacked cards below 768px.
- Numbers are localised to the Indian grouping (12,34,567) with a currency helper for rupees.

## 10. Wireframes

### 10.1 Executive dashboard (desktop)

```
+----------+-------------------------------------------------------+--------------+
| VOICE  v | Good morning, Asha        [search] [This FY v] [+ Add beneficiary]  | Inbox        |
| Trust    | [Programme v] [Project v] [District > Block > Village v]| Needs action |
|          | +-------------+-------------+-------------+-----------+ | +----------+ |
| Overview | | Beneficiaries| Active      | Activities  | Villages  | | | 6 leave  | |
|  Dashboard| | reached     | projects    | this FY     | covered   | | | requests | |
| People   | | 48,215 +4.2%| 14    +2    | 862  +12.5% | 318  +9   | | +----------+ |
|  Benef.  | +-------------+-------------+-------------+-----------+ | | 12 possible| |
|  SHGs    | +-----------------------------------------------------+ | | duplicates | |
| Work     | | Activities per month   Planned  Completed [12 mo v] | | +----------+ |
| Organis. | | 862 completed  +12%                                 | | | 3 overdue | |
| Admin    | |  ||  |  ||  ||  |  ||  | |  ||  ||  |  ||  ||        | | | indicators| |
|          | | Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec     | | +----------+ |
|          | +-----------------------------------------------------+ |              |
|          | +-----------------------------+-----------------------+ |              |
|          | | Reach breakdown   View all  | Recent activities     | |              |
|          | | 48,215 [=Farmers=][SHG][PWD]| Soil health training  | | [+ Beneficiary]|
|          | | Farmers   44%   21,300      | Kalyan | 42 people    | | [+ Activity] |
| [Asha v] | | SHG       41%   19,800      | Women SHG meeting ... | |              |
+----------+ +-----------------------------+-----------------------+ +--------------+
```

### 10.2 Beneficiary list

```
Beneficiaries                                     [Import CSV] [+ Add beneficiary]
[Search name, code, mobile] [District>Block>Village] [Type v] [Project v] [Status v]
Chips: Village: Kalyan x   Type: Farmer x                      48 results [Export]
+------+---------------+--------+-----+-----------+------------+----------+--------+
| Code | Name          | Gender | Age | Village   | Mobile     | Profiles | Status |
+------+---------------+--------+-----+-----------+------------+----------+--------+
| BEN- | Sunita Patil  | F      | 41  | Kalyan    | 98xxxxxx12 | Farmer SHG| Active|
+------+---------------+--------+-----+-----------+------------+----------+--------+
```

### 10.3 Beneficiary detail

```
< Beneficiaries   Sunita Patil   BEN-001245   [Active]        [Edit] [Archive]
[Profile] [Farmer] [SHG] [PWD*] [Projects] [Activities] [Timeline]
+------------------------------+-------------------------------------------+
| Facts: gender, age, village, | Recent activity: training on organic      |
| mobile, ID type (xxxx 4821), | inputs, 12 Oct; SHG meeting, 3 Oct        |
| enrolled 14 Mar 2025         | Enrolled in: Soil Health 2025, Women SHG  |
+------------------------------+-------------------------------------------+
* tab visible only to permitted roles
```

### 10.4 Field staff home and registration (mobile, 390px)

```
+--------------------------+     +--------------------------+
| Good morning, Ravi       |     | < New beneficiary    1/4 |
| Kalyan, Murbad (6 vill.) |     | Full name  [___________] |
| [+ Add beneficiary]      |     | Gender  (F) (M) (Other)  |
| [+ Log activity]         |     | Date of birth [dd/mm/yy] |
| This week: 23 added,     |     | Mobile  [__________]     |
| 4 activities             |     | ! Possible match: ...    |
| Recent entries ...       |     | [Continue]               |
| [Home][People][Work][Me] |     +--------------------------+
+--------------------------+
```

## 11. Build sequence (follow in order)

Each milestone lists tasks and a Definition of Done (DoD). Do not skip ahead.

### M0 Foundation (day 1–2)

- Create repo, TypeScript strict, lint, format, Vitest, Playwright smoke, CI.
- Provision Postgres and storage; add environment validation.
- Install Tailwind and shadcn/ui; load fonts; write `tokens.css` from 9.2; build `AppShell` with static navigation.
- **DoD:** CI green, empty shell deploys to a preview URL, fonts and tokens render on a style-guide page at `/dev/styleguide`.

### M1 Auth, roles, audit (day 3–5)

- Migrations for `profiles`, `user_scopes`, `audit_log`; enums; RLS helpers; `audit()` helper wrapping mutations.
- Sign in, forgot password, Users list and form, role-based navigation, `PermissionGate`.
- **DoD:** access test matrix for roles passes for Users and Audit; field-staff scope test passes at the database level.

### M2 Masters (day 6–10)

- Migrations and screens for `villages`, `donors`, `programmes`, `projects`, `project_villages`, `employees` (basic), `project_allocations`.
- Build `DataTable`, `FilterBar`, `EntityPicker`, form patterns; CSV import for villages.
- **DoD:** create programme, project, link villages and donors; list filters are URL-driven; import reports row errors.

### M3 Beneficiaries and profiles (day 11–18)

- Migrations for `beneficiaries`, `beneficiary_projects`, `farmers`, `farmer_crops`, `shgs`, `shg_members`, `shg_savings_transactions`, `pwd_*`; views for savings and member counts.
- Registration form, duplicate guard, detail page with tabs, Farmer, SHG and PWD forms, savings entry grid, CSV import, photo upload.
- **DoD:** acceptance criteria 7.3 to 7.6 pass; PWD view audit rows created; seed with 50,000 beneficiaries and confirm list query under 300 ms.

### M4 Activities (day 19–23)

- Migrations for `activities`, `activity_participants`, `activity_staff`, `activity_attachments`; derived count views.
- List and calendar, form, participants tab with bulk add by village, attachments.
- **DoD:** acceptance 7.7 passes; counts match derived views.

### M5 MEL and HR-lite (day 24–29)

- Indicators and values; employees detail; attendance grid; leave request, approval, balance view; allocation total check.
- **DoD:** acceptance 7.8 and 7.9 pass; leave approval updates attendance.

### M6 Dashboards (day 30–36)

- Build `v_kpi_*` views and filter functions; `ReachBand`, `KpiCard`, `ChartCard`; Executive, HRMS, field home, role landing redirects, budget card.
- Drill-down links on every number; Excel and CSV export.
- **DoD:** every dashboard number equals the count on its drill-down list (automated test); load under 3 s on seed data; mobile layout verified at 390px.

### M7 Hardening and launch (day 37–42)

- Accessibility pass (keyboard, contrast, screen reader smoke test); error monitoring; rate limiting; backup restore drill; user guide with 6 short task walkthroughs; training session for staff.
- Migrate real data: villages first, then beneficiaries, then profiles, then activities.
- **DoD:** UAT sign-off from one user per role; go-live checklist complete; `/docs/progress.md` and `/docs/decisions.md` current.

## 12. Quality, testing and release

- **Unit tests:** validators, derived views (counts, balances, leave), duplicate detection.
- **Access matrix test:** an automated test per role and module asserting allow or deny for list, read, create, update; includes cross-scope reads and direct API calls.
- **E2E smoke (Playwright):** sign in per role; register beneficiary; log activity with participants; approve leave; open each dashboard.
- **Performance:** seed 50,000 beneficiaries, 5,000 activities and 150,000 participant rows; record query timings in `/docs/performance.md`.
- **Release:** preview deployment per pull request; production deploy only from main after CI; database migrations run before app deploy and are reversible.
- **Definition of Done for any task:** types pass, lint passes, tests added, all four UI states handled, audit written, copy follows 9.6.

## 13. Risks, open questions and Phase 2

### 13.1 Risks

| Risk | Mitigation |
| --- | --- |
| Poor connectivity in villages | Keep forms small, optimistic UI, draft autosave; offline PWA is the first Phase 2 item |
| Duplicate or messy legacy data | Import with validation report and manual merge screen; never auto-merge |
| Sensitive PWD and ID data | Last-4 storage, RLS, audit, private files, least-privilege roles |
| Scope creep from payroll, assets, finance | Section 2.2 is binding for the MVP |
| Staff adoption | Mobile-first field flows, one-page guide, training before launch |

### 13.2 Open questions for VOICE Trust (assumptions are noted)

1. Is Marathi or Hindi UI needed at launch? *Assumed: English only, strings centralised.*
2. Who approves leave for programme staff? *Assumed: programme manager, with HR override.*
3. Is the financial year April to March? *Assumed yes.*
4. Are SHG savings entered monthly or per meeting? *Assumed per meeting date.*
5. Do donors require specific indicator formats now? *Assumed no; Phase 2.*

### 13.3 Phase 2 backlog (in suggested order)

Offline PWA for field entry · Finance: budgets, expenses, approvals and utilisation · Payroll runs and payslips · Asset register · SHG loans and repayments · Donor report builder and PDF export · Interactive village map · Normalised geography · Saved filter views · Marathi and Hindi UI · SMS or WhatsApp reminders for follow-ups.
