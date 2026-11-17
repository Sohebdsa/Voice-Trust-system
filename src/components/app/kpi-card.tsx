import Link from "next/link";
import { DeltaPill } from "./delta-pill";
import { formatNumber } from "@/lib/format";

/** KPI card from the reference screenshot: label strip, value, delta pill. */
export function KpiCard({
  label,
  value,
  trend,
  deltaLabel,
  href,
  hint,
}: {
  label: string;
  value: number;
  trend: "up" | "down" | "flat";
  deltaLabel: string;
  href: string;
  hint?: string;
}) {
  return (
    <Link className="card" href={href} style={{ display: "block" }}>
      <div className="card-head">
        <span>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span className="kpi-value num">{formatNumber(value)}</span>
        <DeltaPill trend={trend} label={deltaLabel} />
      </div>
      {hint ? (
        <p className="footnote" style={{ paddingBlockStart: 6 }}>
          {hint}
        </p>
      ) : null}
    </Link>
  );
}
