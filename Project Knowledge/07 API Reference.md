# API Routes & Server Actions

## API routes (`src/app/api/`)

| Route | Method | Purpose | Guard |
|-------|--------|---------|-------|
| `api/dashboard/export/route.ts` | GET | CSV of filtered dashboard view | session |
| `api/beneficiaries/export/route.ts` | GET | CSV of all matching beneficiaries | session |
| `api/masters/export/route.ts` | GET | CSV of current master filters | session |

All exports use `src/lib/csv.ts` (formula-injection guard on `= + - @` prefixes).

## Server actions (`src/app/actions/`)

| Action | File | Writes audit? |
|--------|------|---------------|
| `saveMaster` | `masters.ts` | Yes |
| `archiveMaster` | `masters.ts` | Yes |
| `recordDisbursement` | `masters.ts` | Yes (WF-01) |
| `saveBeneficiary` | `beneficiaries.ts` | Yes |
| `archiveBeneficiary` | `beneficiaries.ts` | Yes |
| `checkDuplicateMobile` | `beneficiaries.ts` | No (check only) |

## Session
`src/lib/session.ts` — server cookie, throws if `SESSION_SECRET` unset in production.
