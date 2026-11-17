# Data Model

Source of truth: `src/lib/data/types.ts` — field names follow PRD §4 verbatim so the mock layer reads like the production schema.

## Core entities (in `Db` interface)
- `profiles` — user accounts with role + `employeeId`
- `userScopes` — per-user programme/project/village scoping
- `villages` — 18 seeded, code like `VIL-019`
- `donors` — 4 seeded, grant dates + approved budget
- `programmes` — 3 seeded
- `projects` — 6 seeded, linked to donor + programme + villages
- `employees` — 14 seeded
- `projectAllocations` — employee → project + pct
- `beneficiaries` — 120 seeded, `projectIds`, `photoPath`, `consentGivenOn`
- `farmers` — 46 seeded, linked to beneficiary, crops array, GPS
- `pwdProfiles` — 18 seeded, sensitive, audited on view
- `shgs` — 4 seeded, 32 members, `projectIds`
- `savings` — SHG transactions (deposit/withdrawal)
- `activities` — 30 seeded, participants tracked
- `indicators` / `indicatorValues` — 12 indicators, MEL values
- `leaveTypes`, `leaveRequests`, `attendance`
- `audit` — 40+ rows, actions: create/update/delete/view_sensitive/export/login

## Key type relationships
- `Beneficiary.projectIds` — many-to-many with projects
- `Farmer.beneficiaryId` — one-to-one with beneficiary
- `PwdProfile.beneficiaryId` — one-to-one with beneficiary
- `Shg.projectIds` — junction to projects
- `ShgMember.beneficiaryId` — member links to beneficiary
- `Activity.projectId` / `Activity.villageId` — activity belongs to project + village
- `ProjectAllocation.employeeId` + `projectId` — staff allocation

## Role scope rules (`src/lib/rbac.ts`)
- `admin`, `mel_officer`, `hr_admin`, `finance`: all programmes/projects/villages (`null`)
- `programme_manager`: own programmes + projects under them
- `project_coordinator`: assigned projects
- `field_staff`: assigned villages only
- Empty scopes → `[]` (see nothing)

## Adding a new entity
1. Add interface to `types.ts` + add array to `Db`
2. Add seed data to `seed.ts` (deterministic)
3. Add query module under `src/lib/queries/` returning `{ rows, total }`
4. Add server action under `src/app/actions/` writing audit rows
5. Add route/page under `src/app/` with `requireRole` guard
