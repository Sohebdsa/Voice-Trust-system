# Demo accounts — VOICE Trust MIS prototype

Sign-in is a normal email + password form (no role buttons). Every department shares the demo password
`Voice@2026` (10 characters, meets PRD §5.2). After sign-in the server redirects each role to its landing page.

| Department | Role code | Name | Email | Lands on |
| --- | --- | --- | --- | --- |
| Executive Director / CAO | `admin` | Asha Deshmukh | asha.deshmukh@voicetrust.org | `/dashboard` |
| Programme | `programme_manager` | Pranav Joshi | pranav.joshi@voicetrust.org | `/dashboard` (own programmes) |
| Project coordination | `project_coordinator` | Meera Kulkarni | meera.kulkarni@voicetrust.org | `/dashboard` (assigned projects) |
| Monitoring & Evaluation | `mel_officer` | Sameer Patil | sameer.patil@voicetrust.org | `/dashboard?tab=mel` |
| Field operations | `field_staff` | Ravi Shinde | ravi.shinde@voicetrust.org | `/home` |
| HR / Administration | `hr_admin` | Neha Kadam | neha.kadam@voicetrust.org | `/dashboard/hr` |
| Finance | `finance` | Suresh Naik | suresh.naik@voicetrust.org | `/dashboard/finance` (budget card stub) |
| Data entry | `data_entry` | Pooja More | pooja.more@voicetrust.org | `/home` (task list only) |

Password for all: **`Voice@2026`**

Prototype-only notes:
- Sessions are a signed cookie; there is no email delivery, so "Forgot password" shows the mock reset flow.
- Lockout after 5 failed attempts is simulated in memory and resets when the dev server restarts.
- This file exists so demo users do not have to read the plan document. It is not part of the production PRD.
