import Link from "next/link";
import { ActivityChart } from "@/components/app/activity-chart";
import { BarList } from "@/components/app/bar-list";
import { DashboardFiltersBar, DASHBOARD_FILTER_PARAM_MAP } from "@/components/app/dashboard-filters";
import { GenderStack } from "@/components/app/gender-stack";
import { IndicatorMeters } from "@/components/app/indicator-meters";
import { KpiCard } from "@/components/app/kpi-card";
import { ListCard } from "@/components/app/list-card";
import { DistributionCard } from "@/components/app/reach-breakdown";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { formatCurrencyCompact, formatNumber, pct, relativeTime } from "@/lib/format";
import { getDashboardData, getFilterOptions, parseFilters, type DashboardFilters } from "@/lib/queries/dashboard";
import { roleLabel } from "@/lib/rbac";
import { requireRole } from "@/lib/session";

function exportHref(filters: DashboardFilters) {
  const params = new URLSearchParams();
  for (const [key, paramName] of Object.entries(DASHBOARD_FILTER_PARAM_MAP) as [keyof DashboardFilters, string][]) {
    const val = filters[key];
    if (val && !(key === "range" && val === "fy")) {
      params.set(paramName, val);
    }
  }
  const query = params.toString();
  return query ? `/api/dashboard/export?${query}` : "/api/dashboard/export";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole([
    "admin",
    "programme_manager",
    "project_coordinator",
    "mel_officer",
  ]);

  const filters = parseFilters(await searchParams);
  const data = getDashboardData(profile, filters);
  const options = getFilterOptions(profile);
  const melFirst = profile.role === "mel_officer";

  const women = data.genderByProgramme.reduce((sum, row) => sum + row.female, 0);
  const participants = data.genderByProgramme.reduce((sum, row) => sum + row.total, 0);
  const insight =
    participants === 0
      ? "No participation recorded for the current filters."
      : `Women are ${pct(women, participants)}% of recorded participants · ${data.filterLabel}`;

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${roleLabel(profile.role)} · ${data.scopeLabel} · ${data.rangeLabel}`}
        action={{ label: "Add beneficiary", href: "/beneficiaries/new" }}
        secondary={
          <a className="btn" href={exportHref(filters)} download>
            <Icon name="download" size={14} /> Export
          </a>
        }
      />

      <DashboardFiltersBar options={options} filters={filters} />

      <div className="main-body">
        <section className="kpi-grid" aria-label="Headline numbers">
          {data.kpi.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              deltaLabel={kpi.deltaLabel}
              href={kpi.href}
              hint={kpi.hint}
            />
          ))}
        </section>

        {melFirst ? (
          <div className="chart-row-bottom">
            <IndicatorMeters indicators={data.indicators} />
            <GenderStack rows={data.genderByProgramme} />
          </div>
        ) : null}

        <ActivityChart
          monthly={data.monthly}
          totals={data.monthlyTotals}
          rangeLabel={`Last 12 months · ${data.rangeLabel}`}
        />

        <div className="chart-row-bottom">
          <DistributionCard reach={data.reach} />
          <ListCard
            title="Recent activities"
            icon="activity"
            viewAllHref="/activities"
            rows={data.recent.map((row) => ({
              id: row.id,
              title: row.title,
              subtitle: row.meta,
              value: row.value,
              meta: relativeTime(row.at),
              icon: "activity",
            }))}
          />
        </div>

        {melFirst ? null : (
          <div className="chart-row-bottom">
            <IndicatorMeters indicators={data.indicators} />
            <GenderStack rows={data.genderByProgramme} />
          </div>
        )}

        <div className="chart-row-bottom">
          <BarList
            title="Project-wise beneficiary coverage"
            icon="folder"
            rows={data.projectCoverage}
            href="/projects"
          />
          <BarList title="Top villages by beneficiaries" icon="map" rows={data.topVillages} href="/villages" />
        </div>

        <div className="chart-row-bottom">
          <BarList
            title="Geographic coverage by block"
            icon="map"
            rows={data.geoCoverage}
            href="/villages"
            linkLabel="Village register"
          />
          <section className="card" aria-labelledby="budget-title">
            <div className="card-head">
              <Icon name="wallet" size={14} />
              <span id="budget-title">Project-wise approved budget</span>
              <Link className="card-link" href="/dashboard/finance">
                Budget summary
              </Link>
            </div>
            <div className="budget-card">
              <span className="budget-amount">{formatCurrencyCompact(data.budget.approved)}</span>
              <span className="muted num" style={{ fontSize: 12 }}>
                {data.budget.activeProjects} active projects · {formatNumber(data.totals.trainings)} trainings ·{" "}
                {data.totals.shgs} SHGs · {formatNumber(data.totals.shgMembers)} members
              </span>
              <span className="budget-note">
                Expenditure and utilisation become available once the Finance module is enabled.{" "}
                <strong>Coming in Phase 2.</strong>
              </span>
            </div>
          </section>
        </div>

        <p className="footnote">{insight}</p>
      </div>
    </>
  );
}
