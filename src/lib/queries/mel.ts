import { db } from "../data/store";
import type { Indicator, IndicatorValue, Profile, RecordStatus } from "../data/types";
import { scopeForRole } from "../rbac";
import { pct } from "../format";
import { PAGE_SIZE } from "../masters";

/**
 * MEL reads (PRD §7.8). "Latest value" and "% achieved" are derived here and in
 * the dashboard from the same `indicator_values` rows, so the Executive
 * target-vs-achievement widget and this screen always agree.
 */

export type AchievementState = "on_track" | "behind" | "no_data";

export type IndicatorListQuery = {
  q: string;
  projectId: string;
  status: string;
  frequency: string;
  page: number;
};

export type IndicatorLatest = {
  value: number;
  maleValue: number | null;
  femaleValue: number | null;
  periodStart: string;
  periodEnd: string;
  remarks: string;
};

export type IndicatorRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  projectId: string;
  projectName: string;
  programmeName: string;
  unit: string;
  baseline: number;
  target: number;
  reportingFrequency: Indicator["reportingFrequency"];
  dataSource: string;
  genderDisaggregated: boolean;
  responsibleEmployeeId: string | null;
  responsibleName: string;
  status: RecordStatus;
  latest: IndicatorLatest | null;
  achieved: number;
  percent: number;
  achievement: AchievementState;
  valueCount: number;
};

export type IndicatorValueRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  maleValue: number | null;
  femaleValue: number | null;
  remarks: string;
  enteredByName: string;
  enteredAt: string;
};

export type IndicatorDetail = IndicatorRow & {
  projectStart: string;
  projectEnd: string;
  values: IndicatorValueRow[];
};

/** One activity of the indicator's project, used by the read-only basis panel. */
export type PeriodActivity = {
  id: string;
  title: string;
  activityType: string;
  startDate: string;
  villageName: string;
  attended: number;
  outputsResults: string;
  status: string;
};

/** PRD §5.1: only the Executive Director and the MEL officer write indicators. */
export const INDICATOR_WRITE_ROLES = ["admin", "mel_officer"] as const;

function latestValue(indicatorId: string): IndicatorValue | null {
  return (
    db.indicatorValues
      .filter((v) => v.indicatorId === indicatorId)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0] ?? null
  );
}

function enrich(indicator: Indicator): IndicatorRow {
  const project = db.projects.find((p) => p.id === indicator.projectId);
  const programme = db.programmes.find((p) => p.id === project?.programmeId);
  const responsible = db.employees.find((e) => e.id === indicator.responsibleEmployeeId);
  const latest = latestValue(indicator.id);
  const achieved = latest?.value ?? 0;
  const percent = pct(achieved, indicator.target);

  return {
    id: indicator.id,
    code: indicator.code,
    name: indicator.name,
    description: indicator.description ?? "",
    projectId: indicator.projectId,
    projectName: project?.name ?? "—",
    programmeName: programme?.name ?? "—",
    unit: indicator.unit,
    baseline: indicator.baseline,
    target: indicator.target,
    reportingFrequency: indicator.reportingFrequency,
    dataSource: indicator.dataSource ?? "",
    genderDisaggregated: indicator.genderDisaggregated,
    responsibleEmployeeId: indicator.responsibleEmployeeId ?? null,
    responsibleName: responsible?.fullName ?? "—",
    status: indicator.status,
    latest: latest
      ? {
          value: latest.value,
          maleValue: latest.maleValue,
          femaleValue: latest.femaleValue,
          periodStart: latest.periodStart,
          periodEnd: latest.periodEnd,
          remarks: latest.remarks ?? "",
        }
      : null,
    achieved,
    percent,
    // Same rule as the dashboard widget (queries/dashboard.ts).
    achievement: !latest ? "no_data" : percent >= 45 ? "on_track" : "behind",
    valueCount: db.indicatorValues.filter((v) => v.indicatorId === indicator.id).length,
  };
}

function visible(profile: Profile, projectId: string) {
  const scope = scopeForRole(profile.id, profile.role);
  return scope.projectIds === null || scope.projectIds.includes(projectId);
}

export function listIndicators(
  profile: Profile,
  query: IndicatorListQuery,
): { rows: IndicatorRow[]; total: number; page: number; pages: number } {
  const q = query.q.toLowerCase();

  let rows = db.indicators.filter((indicator) => {
    if (!visible(profile, indicator.projectId)) return false;
    if (query.projectId && indicator.projectId !== query.projectId) return false;
    if (query.status && indicator.status !== query.status) return false;
    if (query.frequency && indicator.reportingFrequency !== query.frequency) return false;
    if (q && !`${indicator.name} ${indicator.code}`.toLowerCase().includes(q)) return false;
    return true;
  });

  rows.sort(
    (a, b) =>
      (db.projects.find((p) => p.id === a.projectId)?.name ?? "").localeCompare(
        db.projects.find((p) => p.id === b.projectId)?.name ?? "",
      ) || a.code.localeCompare(b.code),
  );

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pages);

  return {
    rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(enrich),
    total,
    page,
    pages,
  };
}

/** All indicators of one project — the project detail Indicators tab. */
export function indicatorsForProject(projectId: string, profile: Profile): IndicatorRow[] {
  if (!visible(profile, projectId)) return [];
  return db.indicators
    .filter((indicator) => indicator.projectId === projectId)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(enrich);
}

export function getIndicatorDetail(id: string, profile: Profile): IndicatorDetail | null {
  const indicator = db.indicators.find((x) => x.id === id);
  if (!indicator) return null;
  if (!visible(profile, indicator.projectId)) return null;

  const project = db.projects.find((p) => p.id === indicator.projectId);

  const values: IndicatorValueRow[] = db.indicatorValues
    .filter((v) => v.indicatorId === indicator.id)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
    .map((v) => ({
      id: v.id,
      periodStart: v.periodStart,
      periodEnd: v.periodEnd,
      value: v.value,
      maleValue: v.maleValue,
      femaleValue: v.femaleValue,
      remarks: v.remarks ?? "",
      enteredByName: db.profiles.find((p) => p.id === v.enteredBy)?.fullName ?? "—",
      enteredAt: v.enteredAt,
    }));

  return {
    ...enrich(indicator),
    projectStart: project?.startDate ?? "",
    projectEnd: project?.endDate ?? "",
    values,
  };
}

/**
 * WF-05: activities of a project inside a period, with the attended count and
 * their narrative outputs. Reference only — nothing is added to a value.
 */
export function getActivitiesForPeriod(projectId: string, fromDate: string, toDate: string): PeriodActivity[] {
  return db.activities
    .filter((a) => a.projectId === projectId && a.startDate >= fromDate && a.startDate <= toDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((a) => ({
      id: a.id,
      title: a.title,
      activityType: a.activityType,
      startDate: a.startDate,
      villageName: db.villages.find((v) => v.id === a.villageId)?.name ?? "—",
      attended: db.participants.filter((p) => p.activityId === a.id && p.attended).length,
      outputsResults: a.outputsResults ?? "",
      status: a.status,
    }));
}

/** Period a value entry starts from, following the indicator's frequency. */
export function suggestedPeriod(frequency: Indicator["reportingFrequency"], now = new Date()) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  let start: Date;
  switch (frequency) {
    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarterly":
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "half_yearly":
      start = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
      break;
    default: {
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(fyYear, 3, 1);
    }
  }
  return { start: iso(start), end: iso(now) };
}

/** Active employees for the "Responsible" picker. */
export function indicatorEmployees() {
  return db.employees
    .filter((e) => e.employmentStatus === "active")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function nextIndicatorId() {
  const nums = db.indicators.map((i) => Number(i.id.slice(4)) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `ind-${String(max + 1).padStart(4, "0")}`;
}

export function nextIndicatorValueId() {
  const nums = db.indicatorValues.map((v) => Number(v.id.slice(4)) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `inv-${String(max + 1).padStart(4, "0")}`;
}
