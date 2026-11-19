import { db } from "../data/store";
import type { Profile } from "../data/types";
import { currentFinancialYear, delta, formatDate, fyStart, isWithin, pct } from "../format";
import { scopeForRole, type Scope } from "../rbac";

export type Kpi = {
  label: string;
  value: number;
  trend: "up" | "down" | "flat";
  deltaLabel: string;
  href: string;
  hint: string;
};

export type MonthlyPoint = { label: string; planned: number; completed: number };

export type RangeKey = "month" | "quarter" | "fy" | "custom";

/** Quick filters required by Part B of the source data-structure document. */
export type DashboardFilters = {
  range: RangeKey;
  programmeId: string | null;
  projectId: string | null;
  district: string | null;
  block: string | null;
  villageId: string | null;
  /** YYYY-MM-DD bounds, used only when range is "custom". */
  from: string | null;
  to: string | null;
};

export const DEFAULT_FILTERS: DashboardFilters = {
  range: "fy",
  programmeId: null,
  projectId: null,
  district: null,
  block: null,
  villageId: null,
  from: null,
  to: null,
};

export type BarRow = { key: string; label: string; count: number; percent: number; share?: number };

export type DashboardData = {
  kpi: Kpi[];
  monthly: MonthlyPoint[];
  monthlyTotals: { completed: number; planned: number; trend: "up" | "down" | "flat"; deltaLabel: string };
  reach: {
    total: number;
    segments: { key: "farmers" | "shg" | "pwd"; label: string; count: number; percent: number }[];
  };
  recent: { id: string; title: string; meta: string; value: string; at: string }[];
  genderByProgramme: { programme: string; male: number; female: number; other: number; total: number }[];
  topVillages: BarRow[];
  projectCoverage: BarRow[];
  geoCoverage: BarRow[];
  totals: { trainings: number; shgs: number; shgMembers: number; activeProjects: number; farmers: number; pwd: number };
  budget: { approved: number; activeProjects: number };
  indicators: { name: string; achieved: number; target: number; percent: number; status: "on_track" | "behind" | "no_data" }[];
  inbox: { key: string; title: string; detail: string; href: string; count: number; icon: string }[];
  scopeLabel: string;
  rangeLabel: string;
  filterLabel: string;
  filters: DashboardFilters;
};

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export function parseFilters(params: Record<string, string | string[] | undefined>): DashboardFilters {
  const read = (key: string) => {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;
    return single && single !== "all" ? single : null;
  };
  const range = read("range");
  const readDate = (key: string) => {
    const value = read(key);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  };
  return {
    range: range === "month" || range === "quarter" || range === "custom" ? range : "fy",
    programmeId: read("programme"),
    projectId: read("project"),
    district: read("district"),
    block: read("block"),
    villageId: read("village"),
    from: readDate("from"),
    to: readDate("to"),
  };
}

export function resolveRange(
  range: RangeKey,
  from: string | null = null,
  to: string | null = null,
  now: Date = new Date(),
) {
  if (range === "custom") {
    const start = from ? new Date(`${from}T00:00:00`) : null;
    const end = to ? new Date(`${to}T23:59:59`) : null;
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const [a, b] = start <= end ? [start, end] : [end, start];
      return { from: a, to: b, label: `Custom · ${formatDate(a)} – ${formatDate(b)}` };
    }
    /* Incomplete custom dates fall back to the financial year. */
  }
  if (range === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: now, label: `This month · ${now.toLocaleString("en-IN", { month: "long", year: "numeric" })}` };
  }
  if (range === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), quarter * 3, 1);
    return { from, to: now, label: `This quarter · Q${quarter + 1} ${now.getFullYear()}` };
  }
  const fy = currentFinancialYear(now);
  return { from: fy.start, to: now, label: `This FY · ${fy.label}` };
}

/** Options for the filter bar, limited to the user's scope. */
export function getFilterOptions(profile: Profile) {
  const scope = scopeForRole(profile.id, profile.role);
  const projects = scope.projectIds === null ? db.projects : db.projects.filter((p) => scope.projectIds!.includes(p.id));
  const villages = scope.villageIds === null ? db.villages : db.villages.filter((v) => scope.villageIds!.includes(v.id));

  return {
    programmes: db.programmes.map((p) => ({ id: p.id, name: p.name })),
    projects: projects.map((p) => ({ id: p.id, name: p.name, programmeId: p.programmeId })),
    districts: [...new Set(villages.map((v) => v.district))].sort(),
    blocks: [...new Set(villages.map((v) => `${v.district}|${v.block}`))].sort().map((pair) => {
      const [district, block] = pair.split("|");
      return { district: district!, block: block! };
    }),
    villages: villages.map((v) => ({ id: v.id, name: v.name, block: v.block, district: v.district })),
  };
}

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

function scopedProjects(scope: Scope) {
  if (scope.projectIds === null) return db.projects;
  return db.projects.filter((p) => scope.projectIds!.includes(p.id));
}

function scopedActivities(scope: Scope) {
  const projects = scopedProjects(scope).map((p) => p.id);
  return db.activities.filter((a) => projects.includes(a.projectId));
}

function scopedBeneficiaries(scope: Scope) {
  if (scope.projectIds === null && scope.villageIds === null) return db.beneficiaries;
  const projects = scopedProjects(scope).map((p) => p.id);
  return db.beneficiaries.filter(
    (b) =>
      b.projectIds.some((id) => projects.includes(id)) ||
      (scope.villageIds !== null && scope.villageIds.includes(b.villageId)),
  );
}

/** Right-rail action items (PRD §9.1 inbox). Shared by the shell and the dashboard. */
export function getInbox(profile: Profile): DashboardData["inbox"] {
  const scope = scopeForRole(profile.id, profile.role);
  const beneficiaries = scopedBeneficiaries(scope);
  const projects = scopedProjects(scope).map((p) => p.id);

  const duplicateGroups = new Map<string, number>();
  beneficiaries.forEach((b) => duplicateGroups.set(b.mobile, (duplicateGroups.get(b.mobile) ?? 0) + 1));
  const duplicates = [...duplicateGroups.values()].filter((count) => count > 1).length;

  const indicatorDue = db.indicators.filter((indicator) => {
    if (!projects.includes(indicator.projectId)) return false;
    const latest = db.indicatorValues
      .filter((v) => v.indicatorId === indicator.id)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
    if (!latest) return true;
    return Date.now() - new Date(latest.periodEnd).getTime() > 30 * 864e5;
  }).length;

  const canSeeBeneficiaries = ["admin", "programme_manager", "project_coordinator", "mel_officer", "field_staff", "data_entry"].includes(profile.role);

  return [
    // IG-08: Only show to roles that can read the beneficiaries page
    ...(canSeeBeneficiaries ? [{
      key: "duplicates",
      title: `${duplicates} possible duplicates`,
      detail: "Same mobile number on more than one record",
      href: "/beneficiaries?flag=duplicate",
      count: duplicates,
      icon: "people",
    }] : []),
    {
      key: "indicators",
      title: `${indicatorDue} indicator entries due`,
      detail: "No value recorded in the current period",
      href: "/mel?status=due",
      count: indicatorDue,
      icon: "target",
    },
  ].filter((item) => item.count > 0);
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getDashboardData(
  profile: Profile,
  filters: DashboardFilters = DEFAULT_FILTERS,
): DashboardData {
  const scope = scopeForRole(profile.id, profile.role);
  const range = resolveRange(filters.range, filters.from, filters.to);

  /* Geography narrowing: district → block → village. */
  const allowedVillages = new Set(
    db.villages
      .filter((v) => (scope.villageIds === null ? true : scope.villageIds.includes(v.id)))
      .filter((v) => (filters.district ? v.district === filters.district : true))
      .filter((v) => (filters.block ? v.block === filters.block : true))
      .filter((v) => (filters.villageId ? v.id === filters.villageId : true))
      .map((v) => v.id),
  );

  const allProjects = scopedProjects(scope)
    .filter((p) => (filters.programmeId ? p.programmeId === filters.programmeId : true))
    .filter((p) => (filters.projectId ? p.id === filters.projectId : true));

  /* A project qualifies when at least one of its villages survives the geography filter. */
  const projects = allProjects.filter((p) => p.villageIds.some((id) => allowedVillages.has(id)));
  const projectIds = projects.map((p) => p.id);

  const activities = db.activities
    .filter((a) => projectIds.includes(a.projectId))
    .filter((a) => allowedVillages.has(a.villageId));

  const beneficiaries = scopedBeneficiaries(scope).filter(
    (b) => allowedVillages.has(b.villageId) && b.projectIds.some((id) => projectIds.includes(id)),
  );

  const rangeActivities = activities.filter((a) => isWithin(a.startDate, range.from, range.to));
  const completed = rangeActivities.filter((a) => a.status === "completed").length;
  const planned = rangeActivities.filter((a) => a.status === "planned").length;

  /* Previous equal-length window, for the activity delta. */
  const spanMs = Math.max(range.to.getTime() - range.from.getTime(), 864e5);
  const previous = activities.filter((a) =>
    isWithin(a.startDate, new Date(range.from.getTime() - spanMs), range.from),
  ).length;
  const activityDelta = delta(rangeActivities.length, previous);

  const villagesCovered = new Set<string>([
    ...beneficiaries.map((b) => b.villageId),
    ...rangeActivities.map((a) => a.villageId),
  ]);

  /* 12-month activity volume stays independent of the range so the chart always has shape. */
  const now = new Date();
  const monthly: MonthlyPoint[] = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    const inMonth = activities.filter((a) => isWithin(a.startDate, from, to));
    return {
      label: MONTHS[date.getMonth()]!,
      planned: inMonth.filter((a) => a.status === "planned").length,
      completed: inMonth.filter((a) => a.status === "completed").length,
    };
  });
  const monthDiff = (monthly[11]?.completed ?? 0) - (monthly[10]?.completed ?? 0);
  const monthlyTotals = {
    completed: monthly.reduce((sum, m) => sum + m.completed, 0),
    planned: monthly.reduce((sum, m) => sum + m.planned, 0),
    trend: (monthDiff > 0 ? "up" : monthDiff < 0 ? "down" : "flat") as "up" | "down" | "flat",
    deltaLabel: `${monthDiff > 0 ? "+" : ""}${monthDiff} vs last month`,
  };

  /* Profiles: a person can hold more than one (source doc B1, PRD §8.2). */
  const beneficiaryIds = new Set(beneficiaries.map((b) => b.id));
  const farmers = db.farmers.filter((f) => beneficiaryIds.has(f.beneficiaryId) && f.status === "active");
  const pwd = db.pwdProfiles.filter((p) => beneficiaryIds.has(p.beneficiaryId) && p.status === "active");
  const shgMembers = db.shgMembers.filter((m) => beneficiaryIds.has(m.beneficiaryId) && m.status === "active");
  const shgIds = new Set(shgMembers.map((m) => m.shgId));
  const shgs = db.shgs.filter((s) => shgIds.has(s.id) && s.status === "active");
  const activeBeneficiaries = beneficiaries.filter((b) => b.status === "active");
  const totalBeneficiaries = activeBeneficiaries.length;

  const last30 = beneficiaries.filter((b) => isWithin(b.enrolmentDate, new Date(Date.now() - 30 * 864e5), now)).length;
  const prev30 = beneficiaries.filter(
    (b) => isWithin(b.enrolmentDate, new Date(Date.now() - 60 * 864e5), new Date(Date.now() - 30 * 864e5)),
  ).length;
  const enrolmentDelta = delta(last30, prev30);

  const trainings = rangeActivities.filter(
    (a) => a.activityType === "training" && a.status === "completed",
  ).length;
  const trainingsPlanned = rangeActivities.filter(
    (a) => a.activityType === "training" && a.status === "planned",
  ).length;

  const kpi: Kpi[] = [
    {
      label: "Total beneficiaries",
      value: totalBeneficiaries,
      trend: enrolmentDelta.trend,
      deltaLabel: enrolmentDelta.label,
      href: "/beneficiaries?status=active",
      hint: `${last30} enrolled in the last 30 days`,
    },
    {
      label: "Farmers registered",
      value: farmers.length,
      trend: "flat",
      deltaLabel: `${pct(farmers.length, totalBeneficiaries)}% of total`,
      href: "/beneficiaries?profile=farmers",
      hint: "Active farmer profiles",
    },
    {
      label: "SHGs formed",
      value: shgs.length,
      trend: "flat",
      deltaLabel: `${shgMembers.length} members`,
      href: "/shgs",
      hint: "Active self-help groups",
    },
    {
      label: "PWD / GAP beneficiaries",
      value: pwd.length,
      trend: "flat",
      deltaLabel: `${pct(pwd.length, totalBeneficiaries)}% of total`,
      href: "/beneficiaries?profile=pwd",
      hint: "Access restricted and audited",
    },
    {
      label: "Active projects",
      value: projects.filter((p) => p.status === "active").length,
      trend: "flat",
      deltaLabel: `${projects.length} in scope`,
      href: "/projects?status=active",
      hint: "Projects matching the filters",
    },
    {
      label: "Activities this period",
      value: rangeActivities.length,
      trend: activityDelta.trend,
      deltaLabel: activityDelta.label,
      href: "/activities",
      hint: `${completed} completed, ${planned} planned`,
    },
    {
      label: "Trainings conducted",
      value: trainings,
      trend: "flat",
      deltaLabel: `${trainingsPlanned} planned`,
      href: "/activities?type=training",
      hint: "Completed trainings · planned shown as delta",
    },
    {
      label: "Villages covered",
      value: villagesCovered.size,
      trend: "flat",
      deltaLabel: `${allowedVillages.size} in filter`,
      href: "/villages",
      hint: "Villages with a beneficiary or activity",
    },
  ];

  const recent = [...activities]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 5)
    .map((a) => {
      const village = db.villages.find((v) => v.id === a.villageId);
      const participants = db.participants.filter((p) => p.activityId === a.id && p.attended).length;
      return {
        id: a.id,
        title: a.title,
        meta: `${village?.name ?? "—"} · ${a.activityType.replace("_", " ")}`,
        value: a.status === "planned" ? `Target ${a.targetParticipants}` : `${participants} people`,
        at: a.startDate,
      };
    });

  const genderByProgramme = db.programmes
    .filter((programme) => projects.some((p) => p.programmeId === programme.id))
    .map((programme) => {
      const programmeActivities = rangeActivities.filter((a) => a.programmeId === programme.id);
      const ids = new Set(
        db.participants
          .filter((p) => p.attended && programmeActivities.some((a) => a.id === p.activityId))
          .map((p) => p.beneficiaryId),
      );
      const people = db.beneficiaries.filter((b) => ids.has(b.id));
      return {
        programme: programme.focusArea,
        male: people.filter((p) => p.gender === "male").length,
        female: people.filter((p) => p.gender === "female").length,
        other: people.filter((p) => p.gender === "other").length,
        total: people.length,
      };
    })
    .filter((row) => row.total > 0);

  const toBars = (rows: { label: string; count: number }[], limit = 6): BarRow[] => {
    const max = Math.max(...rows.map((r) => r.count), 1);
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    return rows
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((r) => ({
        key: r.label,
        label: r.label,
        count: r.count,
        percent: Math.round((r.count / max) * 100),
        share: total === 0 ? 0 : Math.round((r.count / total) * 100),
      }));
  };

  const topVillages = toBars(
    db.villages
      .filter((v) => allowedVillages.has(v.id))
      .map((v) => ({ label: v.name, count: beneficiaries.filter((b) => b.villageId === v.id).length })),
  );

  const projectCoverage = toBars(
    projects
      .filter((p) => p.status !== "draft")
      .map((p) => ({
        label: p.name,
        count: beneficiaries.filter((b) => b.projectIds.includes(p.id)).length,
      })),
    5,
  );

  const geoCoverage = toBars(
    [...new Set(db.villages.filter((v) => allowedVillages.has(v.id)).map((v) => v.block))].map((block) => ({
      label: block,
      count: beneficiaries.filter(
        (b) => db.villages.find((v) => v.id === b.villageId)?.block === block,
      ).length,
    })),
  );

  const indicators = db.indicators
    .filter((i) => projectIds.includes(i.projectId))
    .slice(0, 3)
    .map((i) => {
      const values = db.indicatorValues.filter((v) => v.indicatorId === i.id);
      const latest = values.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
      const achieved = latest?.value ?? 0;
      const percent = pct(achieved, i.target);
      return {
        name: i.name,
        achieved,
        target: i.target,
        percent,
        status: (!latest ? "no_data" : percent >= 45 ? "on_track" : "behind") as "on_track" | "behind" | "no_data",
      };
    });

  const scopeLabel =
    scope.projectIds === null ? "All programmes" : `${projects.length} project${projects.length === 1 ? "" : "s"} in your scope`;

  const filterBits = [
    db.programmes.find((p) => p.id === filters.programmeId)?.name,
    db.projects.find((p) => p.id === filters.projectId)?.name,
    filters.villageId
      ? db.villages.find((v) => v.id === filters.villageId)?.name
      : [filters.block, filters.district].filter(Boolean).join(", ") || null,
  ].filter(Boolean);

  return {
    kpi,
    monthly,
    monthlyTotals,
    reach: {
      total: totalBeneficiaries,
      segments: [
        { key: "farmers", label: "Farmers", count: farmers.length, percent: pct(farmers.length, totalBeneficiaries) },
        { key: "shg", label: "SHG members", count: shgMembers.length, percent: pct(shgMembers.length, totalBeneficiaries) },
        { key: "pwd", label: "PWD", count: pwd.length, percent: pct(pwd.length, totalBeneficiaries) },
      ],
    },
    recent,
    genderByProgramme,
    topVillages,
    projectCoverage,
    geoCoverage,
    totals: {
      trainings,
      shgs: shgs.length,
      shgMembers: shgMembers.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      farmers: farmers.length,
      pwd: pwd.length,
    },
    budget: {
      approved: projects.filter((p) => p.status === "active").reduce((sum, p) => sum + p.approvedBudget, 0),
      activeProjects: projects.filter((p) => p.status === "active").length,
    },
    indicators,
    inbox: getInbox(profile),
    scopeLabel,
    rangeLabel: range.label,
    filterLabel: filterBits.length > 0 ? filterBits.join(" · ") : "All programmes, all villages",
    filters,
  };
}
