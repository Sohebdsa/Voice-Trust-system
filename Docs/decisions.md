# Decisions log

Only deviations from the PRD are recorded here, with the reason (PRD §0.3 and §3).

## D1 — Mock data layer instead of Postgres + RLS (approved by owner)

PRD §3 prescribes PostgreSQL, Drizzle migrations and row-level security. The deliverable is a
prototype with dummy data and logins for every department, so persistence is a seeded object
graph in `src/lib/data/seed.ts` held in `store.ts`.

Consequences and guardrails:

- Domain types in `src/lib/data/types.ts` use the PRD §4 field names verbatim.
- Query modules (`src/lib/queries/*`) keep the PRD §6 result shape (`{ rows, total }` where
  lists are involved), so swapping in Drizzle changes query bodies, not screens.
- `src/lib/rbac.ts::scopeForRole` filters at the data layer, standing in for RLS. It is applied
  in every query, not in components.
- Audit rows are appended by every mutation and by `view_sensitive` paths as they land.
- Seed is deterministic (fixed PRNG seed) so screenshots and demos are reproducible.

## D2 — No shadcn/ui, no Radix, no chart library, no icon package

PRD §3 lists shadcn/ui (Radix), TanStack Table and Recharts. For Step 1 the shell needs about
ten primitives, one bar chart and one segmented bar, so they are hand-written in
`src/components/ui` and `src/components/app` with the same visual result and no runtime
dependencies beyond Next and React. Icons are a 28-glyph inline SVG set in
`src/components/ui/icons.tsx`.

Revisit when lists arrive in Step 2: TanStack Table is worth adding for server-side sort,
filter, pagination and column visibility.

## D3 — Plain CSS with design tokens instead of Tailwind

PRD §3 chooses Tailwind. The screen set is small and the token table in §9.2 is already the
source of truth, so `src/styles/tokens.css` plus `src/styles/app.css` implements it directly in
about 700 lines, with logical properties and container queries for the dashboard grids.

Revisit if component count grows past roughly 25; the class names are already token-driven, so
a Tailwind migration would not change the design.

## D4 — Fonts are a CSS stack, not a bundled webfont

PRD §9.2 asks for Inter with Noto Sans Devanagari in the fallback stack. `next/font/google`
would fetch at build time and make the build network-dependent, so `--font-sans` lists
`Inter` first and falls back to the platform UI stack and `Noto Sans Devanagari`. On this
machine Inter is not installed, so the prototype renders in the system UI face. Drop the woff2
files into `public/fonts` and add `@font-face` to switch cleanly.

## D5 — Token colours corrected from the owner's screenshot

PRD §9.1 says the screenshot wins and §9.2 says to colour-pick it. Sampled values in
`Docs/ui-reference/dashboard-reference.png`:

| Token | PRD value | Sampled | Used |
| --- | --- | --- | --- |
| page background | `#E9E9EB` | `#E2E2E2` | `#E2E2E2` |
| app frame | `#FAFAFB` | `#FFFFFF` | `#FFFFFF` |
| primary violet | `#5B3FD9` | `#5F3BE3` | `#5F3BE3` |
| secondary bars | `#C9BFF5` | `#DCD3FB` | `#DCD3FB` |
| amber segment | `#F2A413` | `#F0A812` | `#F0A812` |

The reference also draws cards as white surfaces with a hairline border rather than the
grey-outer/white-inner nesting described in §9.3; the prototype follows the screenshot for
cards while keeping the `--panel` token for active nav and hover states.

## D6 — `lib/nav.ts` split from `lib/rbac.ts`

The sidebar is a client component, and importing `rbac.ts` pulled the seeded store (and
`node:crypto`) into the browser bundle, which fails the build with `UnhandledSchemeError`.
Navigation and role labels are pure metadata, so they live in `src/lib/nav.ts`; scope helpers
that need data stay in `src/lib/rbac.ts`.

## D7 — Catch-all placeholder route

`src/app/(app)/[...slug]/page.tsx` renders "planned for Step N" for modules that do not exist
yet, so every sidebar item and KPI drill-down is clickable during a demo and explains itself
instead of 404ing. Static routes take precedence, so the four built pages are unaffected.
Remove it as each module lands.
