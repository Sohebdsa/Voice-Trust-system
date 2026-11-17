import Link from "next/link";
import { DeltaPill } from "./delta-pill";
import { Icon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format";
import type { MonthlyPoint } from "@/lib/queries/dashboard";

function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / step) * step;
}

/** Paired-bar chart card: completed (violet gradient) vs planned (lavender). */
export function ActivityChart({
  monthly,
  totals,
  rangeLabel,
  href = "/activities",
}: {
  monthly: MonthlyPoint[];
  totals: { completed: number; planned: number; trend: "up" | "down" | "flat"; deltaLabel: string };
  rangeLabel: string;
  href?: string;
}) {
  const max = niceMax(Math.max(...monthly.map((m) => Math.max(m.completed, m.planned)), 1));
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <section className="card" aria-labelledby="activity-chart-title">
      <div className="card-head">
        <Icon name="activity" size={14} />
        <span id="activity-chart-title">Activities per month</span>
        <Link className="card-link" href={href}>
          View all
        </Link>
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-key">
            <i aria-hidden="true" /> Completed
          </span>
          <span className="legend-total">
            {formatNumber(totals.completed)}
            <DeltaPill trend={totals.trend} label={totals.deltaLabel} context="versus last month" />
          </span>
        </div>
        <div className="legend-item">
          <span className="legend-key">
            <i className="secondary" aria-hidden="true" /> Planned
          </span>
          <span className="legend-total small">{formatNumber(totals.planned)}</span>
        </div>
        <span className="range-select">
          {rangeLabel}
          <Icon name="chevronDown" size={12} />
        </span>
      </div>

      <div className="bars" role="img" aria-label={`Completed and planned activities per month for ${rangeLabel}`}>
        <div className="y-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{formatNumber(Math.round(max * tick))}</span>
          ))}
        </div>
        {monthly.map((month) => (
          <div className="bar-group" key={month.label}>
            <span
              className="bar primary"
              style={{ blockSize: `${Math.max((month.completed / max) * 100, 1)}%` }}
              title={`${month.label}: ${month.completed} completed`}
            />
            <span
              className="bar secondary"
              style={{ blockSize: `${Math.max((month.planned / max) * 100, 1)}%` }}
              title={`${month.label}: ${month.planned} planned`}
            />
            <span className="bar-label">{month.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
