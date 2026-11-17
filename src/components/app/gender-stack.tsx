import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { pct } from "@/lib/format";
import type { DashboardData } from "@/lib/queries/dashboard";

/** Gender-disaggregated participation per programme, as stacked bars (PRD §8.2 chart 2). */
export function GenderStack({ rows }: { rows: DashboardData["genderByProgramme"] }) {
  return (
    <section className="card" aria-labelledby="gender-title">
      <div className="card-head">
        <Icon name="people" size={14} />
        <span id="gender-title">Gender participation by programme</span>
        <Link className="card-link" href="/activities">
          View all
        </Link>
      </div>

      <div className="stack-bars">
        {rows.map((row) => {
          const female = pct(row.female, row.total);
          const male = pct(row.male, row.total);
          const other = Math.max(100 - female - male, 0);
          return (
            <div className="stack-row" key={row.programme}>
              <span className="stack-label">
                <span>{row.programme}</span>
                <span className="num">
                  {female}% women · {row.total} people
                </span>
              </span>
              <span
                className="stack-track"
                role="img"
                aria-label={`${row.programme}: ${female}% women, ${male}% men, ${other}% other`}
              >
                <span style={{ inlineSize: `${female}%`, background: "var(--series-1)" }} />
                <span style={{ inlineSize: `${male}%`, background: "var(--series-2)" }} />
                <span style={{ inlineSize: `${other}%`, background: "var(--series-4)" }} />
              </span>
            </div>
          );
        })}
      </div>

      <p className="footnote" style={{ paddingBlockStart: 10 }}>
        Counted from attendance at completed activities. A person attending two activities is counted once per
        programme.
      </p>
    </section>
  );
}
