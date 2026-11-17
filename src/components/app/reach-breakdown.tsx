import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format";
import type { DashboardData } from "@/lib/queries/dashboard";

const SEGMENT_COLORS = ["var(--series-1)", "var(--series-3)", "var(--series-4)"];
const ICONS = { farmers: "layers", shg: "group", pwd: "accessibility" } as const;

/**
 * Beneficiary distribution by type — the source document (B1) asks for a
 * donut; the segmented bar from the UI reference is kept alongside it, plus the
 * percent/count rows and the overlap note.
 */
export function DistributionCard({ reach }: { reach: DashboardData["reach"] }) {
  const segments = reach.segments;
  const total = Math.max(reach.total, 1);
  let cursor = 0;
  const stops = segments.map((segment, index) => {
    const start = cursor;
    cursor += (segment.count / total) * 100;
    return `${SEGMENT_COLORS[index]} ${start}% ${cursor}%`;
  });
  const gradient = `conic-gradient(${stops.join(", ")})`;

  return (
    <section className="card" aria-labelledby="reach-title">
      <div className="card-head">
        <Icon name="people" size={14} />
        <span id="reach-title">Beneficiary distribution by type</span>
        <Link className="card-link" href="/beneficiaries">
          View all
        </Link>
      </div>

      <div className="distribution">
        <div className="donut" style={{ background: gradient }} role="img" aria-label={segments.map((s) => `${s.label} ${s.percent}%`).join(", ")}>
          <span className="visually-hidden">
            {segments.map((s) => `${s.label}: ${s.count}`).join(", ")}
          </span>
        </div>

        <div className="distribution-body">
          <p className="breakdown-total">{formatNumber(reach.total)}</p>
          <div className="segbar" aria-hidden="true">
            {segments.map((segment, index) => (
              <span
                key={segment.key}
                style={{ inlineSize: `${Math.max(segment.percent, 2)}%`, background: SEGMENT_COLORS[index] }}
              />
            ))}
          </div>
          <div className="seg-legend">
            {segments.map((segment, index) => (
              <span key={segment.key}>
                <i style={{ background: SEGMENT_COLORS[index] }} aria-hidden="true" />
                {segment.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="breakdown-rows">
        {segments.map((segment) => (
          <Link key={segment.key} className="breakdown-row" href={`/beneficiaries?profile=${segment.key}`}>
            <span className="breakdown-icon">
              <Icon name={ICONS[segment.key]} size={14} />
            </span>
            <span className="breakdown-name">{segment.label}</span>
            <span className="breakdown-pct num">{segment.percent}%</span>
            <span className="breakdown-count num">{formatNumber(segment.count)}</span>
          </Link>
        ))}
      </div>
      <p className="footnote">People can belong to more than one group.</p>
    </section>
  );
}
