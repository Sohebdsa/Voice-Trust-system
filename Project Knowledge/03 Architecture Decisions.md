# Architecture Decisions

Full log: `Docs/decisions.md` — only deviations from PRD are recorded.

## D1 — Mock data layer instead of Postgres + Drizzle
Seed object graph in `store.ts`/`seed.ts`, swapable via query modules (`{ rows, total }` shape).

## D2 — No shadcn/ui, Radix, chart library, icon package
Hand-written primitives in `src/components/ui` + `src/components/app`, inline SVG icons.

## D3 — Plain CSS with design tokens instead of Tailwind
`src/styles/tokens.css` is the source of truth; `app.css` implements it (~700 lines).

## D4 — Fonts are a CSS stack, not bundled webfont
`--font-sans` lists Inter first, falls back to system UI + Noto Sans Devanagari.

## D5 — Token colours corrected from screenshot
Sampled from `Docs/ui-reference/dashboard-reference.png` (PRD says screenshot wins).

## D6 — `lib/nav.ts` split from `lib/rbac.ts`
Nav metadata is pure data (client-safe); RBAC helpers needing the store stay server-side.

## D7 — Catch-all placeholder route
`src/app/(app)/[...slug]/page.tsx` renders "planned for Step N" for unbuilt modules. Remove as each lands.

## Progress status (`Docs/progress.md`)
- Step 1 (shell, sign-in, starting pages): DONE
- Step 2 (masters: villages, donors, programmes, projects): DONE
- Step 3 (beneficiary registry): DONE
- Step 4 (farmers, SHGs, PWD): DONE
- Step 5 (activities, attendance): NEXT

## Open gaps
See `Docs/gap-analysis-v2.md` — IG-01 to IG-10, WF-01 to WF-08, TD-01 to TD-02, plus IG-07, IG-10 notes.
