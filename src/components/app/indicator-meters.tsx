import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { StatusPill, statusTone } from "./status-pill";
import type { DashboardData } from "@/lib/queries/dashboard";

const STATUS_LABEL = { on_track: "On track", behind: "Behind", no_data: "No data" } as const;

/** Target vs achievement — same numbers as the MEL screen (PRD §8.2). */
export function IndicatorMeters({ indicators }: { indicators: DashboardData["indicators"] }) {
  return (
    <section className="card" aria-labelledby="indicators-title">
      <div className="card-head">
        <Icon name="target" size={14} />
        <span id="indicators-title">Target vs achievement</span>
        <Link className="card-link" href="/mel">
          View all
        </Link>
      </div>

      {indicators.map((indicator) => (
        <div className="meter" key={indicator.name}>
          <div className="meter-top">
            <span>{indicator.name}</span>
            <StatusPill label={STATUS_LABEL[indicator.status]} tone={statusTone(indicator.status)} />
            <span className="meter-value">
              {indicator.achieved} / {indicator.target} · {indicator.percent}%
            </span>
          </div>
          <div
            className="meter-track"
            role="progressbar"
            aria-valuenow={indicator.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${indicator.name}: ${indicator.percent}% of target`}
          >
            <div
              className="meter-fill"
              data-tone={indicator.status}
              style={{ inlineSize: `${Math.min(indicator.percent, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
