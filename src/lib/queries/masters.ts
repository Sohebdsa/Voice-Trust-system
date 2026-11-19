import { db } from "../data/store";
import type { Donor, Programme, Project, Profile, Village } from "../data/types";
import { formatCurrency, formatDate, pct } from "../format";
import { PAGE_SIZE, type MasterEntity, type MasterValues } from "../masters";
import { scopeForRole } from "../rbac";

/**
 * Master-record queries (PRD §6: every list takes { q, filters, page } and
 * returns { rows, total }). Rows are already formatted for the tables so the
 * pages stay markup only.
 */

export type ListQuery = {
  q: string;
  district: string;
  block: string;
  status: string;
  programme: string;
  donor: string;
  page: number;
};

export function parseListQuery(params: Record<string, string | string[] | undefined>): ListQuery {
  const read = (key: string) => {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;
    return single && single !== "all" ? single : "";
  };
  return {
    q: read("q"),
    district: read("district"),
    block: read("block"),
    status: read("status"),
    programme: read("programme"),
    donor: read("donor"),
    page: Math.max(1, Number(read("page")) || 1),
  };
}

export type ListResult<T> = { rows: T[]; total: number; page: number; pages: number };

function paginate<T>(rows: T[], page: number, pageSize: number): ListResult<T> {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(page, 1), pages);
  return {
    rows: rows.slice((current - 1) * pageSize, current * pageSize),
    total: rows.length,
    page: current,
    pages,
  };
}

const matches = (haystack: string[], needle: string) =>
  !needle || haystack.some((value) => value.toLowerCase().includes(needle.toLowerCase()));

/* ------------------------------------------------------------------ */
/* Scope (PRD §5.2 — the prototype's stand-in for RLS)                 */
/* ------------------------------------------------------------------ */

export function scopedProjects(profile: Profile): Project[] {
  const scope = scopeForRole(profile.id, profile.role);
  return scope.projectIds === null ? db.projects : db.projects.filter((p) => scope.projectIds!.includes(p.id));
}

export function scopedProgrammes(profile: Profile): Programme[] {
  const scope = scopeForRole(profile.id, profile.role);
  if (scope.programmeIds === null && scope.projectIds === null) return db.programmes;
  const ids = new Set(scope.programmeIds ?? scopedProjects(profile).map((p) => p.programmeId));
  return db.programmes.filter((p) => ids.has(p.id));
}

export function scopedVillages(profile: Profile): Village[] {
  const scope = scopeForRole(profile.id, profile.role);
  return scope.villageIds === null ? db.villages : db.villages.filter((v) => scope.villageIds!.includes(v.id));
}

/** Villages a caller may put a project into: their scope, and anyone's for admins. */
export function scopedDonors(profile: Profile): Donor[] {
  // Donors are read-only for every non-admin role in §5.1, so scope never narrows them.
  void profile;
  return db.donors;
}

const beneficiariesInVillage = (villageId: string) =>
  db.beneficiaries.filter((b) => b.villageId === villageId && b.status === "active").length;

const beneficiariesInProject = (projectId: string) =>
  db.beneficiaries.filter((b) => b.projectIds.includes(projectId) && b.status === "active").length;

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

export type VillageRow = {
  id: string;
  code: string;
  name: string;
  panchayat: string;
  block: string;
  district: string;
  population: number | null;
  status: string;
  beneficiaries: number;
  projects: number;
};

export function listVillages(profile: Profile, query: ListQuery, pageSize = PAGE_SIZE): ListResult<VillageRow> {
  const rows = scopedVillages(profile)
    .filter((v) => matches([v.name, v.code, v.panchayat], query.q))
    .filter((v) => (query.district ? v.district === query.district : true))
    .filter((v) => (query.block ? v.block === query.block : true))
    .filter((v) => (query.status ? v.status === query.status : true))
    .map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      panchayat: v.panchayat,
      block: v.block,
      district: v.district,
      population: v.population,
      status: v.status,
      beneficiaries: beneficiariesInVillage(v.id),
      projects: db.projects.filter((p) => p.villageIds.includes(v.id)).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return paginate(rows, query.page, pageSize);
}

export type DonorRow = {
  id: string;
  code: string;
  name: string;
  donorType: string;
  contactPerson: string;
  grantPeriod: string;
  approvedBudget: number;
  status: string;
  projects: number;
};

export function listDonors(profile: Profile, query: ListQuery, pageSize = PAGE_SIZE): ListResult<DonorRow> {
  const rows = scopedDonors(profile)
    .filter((d) => matches([d.name, d.code, d.contactPerson], query.q))
    .filter((d) => (query.status ? d.status === query.status : true))
    .map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      donorType: d.donorType,
      contactPerson: d.contactPerson,
      grantPeriod: `${formatDate(d.grantStart)} – ${formatDate(d.grantEnd)}`,
      approvedBudget: d.approvedBudget,
      status: d.status,
      projects: db.projects.filter((p) => p.donorId === d.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return paginate(rows, query.page, pageSize);
}

export type ProgrammeRow = {
  id: string;
  code: string;
  name: string;
  focusArea: string;
  period: string;
  status: string;
  projects: number;
  beneficiaries: number;
};

export function listProgrammes(profile: Profile, query: ListQuery, pageSize = PAGE_SIZE): ListResult<ProgrammeRow> {
  const rows = scopedProgrammes(profile)
    .filter((p) => matches([p.name, p.code, p.focusArea], query.q))
    .filter((p) => (query.status ? p.status === query.status : true))
    .map((p) => {
      const projects = db.projects.filter((project) => project.programmeId === p.id);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        focusArea: p.focusArea,
        period: `${formatDate(p.startDate)} – ${p.endDate ? formatDate(p.endDate) : "open"}`,
        status: p.status,
        projects: projects.length,
        beneficiaries: projects.reduce((sum, project) => sum + beneficiariesInProject(project.id), 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return paginate(rows, query.page, pageSize);
}

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  donor: string;
  programme: string;
  period: string;
  budget: number;
  status: string;
  villages: number;
  beneficiaries: number;
  target: number;
};

export function listProjects(profile: Profile, query: ListQuery, pageSize = PAGE_SIZE): ListResult<ProjectRow> {
  const rows = scopedProjects(profile)
    .filter((p) => matches([p.name, p.code], query.q))
    .filter((p) => (query.programme ? p.programmeId === query.programme : true))
    .filter((p) => (query.donor ? p.donorId === query.donor : true))
    .filter((p) => (query.status ? p.status === query.status : true))
    .map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      donor: db.donors.find((d) => d.id === p.donorId)?.name ?? "—",
      programme: db.programmes.find((programme) => programme.id === p.programmeId)?.name ?? "—",
      period: `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`,
      budget: p.approvedBudget,
      status: p.status,
      villages: p.villageIds.length,
      beneficiaries: beneficiariesInProject(p.id),
      target: p.targetBeneficiaries,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return paginate(rows, query.page, pageSize);
}

export function listMaster(
  profile: Profile,
  entity: MasterEntity,
  query: ListQuery,
  pageSize = PAGE_SIZE,
): ListResult<VillageRow | DonorRow | ProgrammeRow | ProjectRow> {
  switch (entity) {
    case "villages":
      return listVillages(profile, query, pageSize);
    case "donors":
      return listDonors(profile, query, pageSize);
    case "programmes":
      return listProgrammes(profile, query, pageSize);
    case "projects":
      return listProjects(profile, query, pageSize);
  }
}

/** Filter option lists, limited to the caller's scope. */
export function getListOptions(profile: Profile) {
  const villages = scopedVillages(profile);
  return {
    districts: [...new Set(villages.map((v) => v.district))].sort(),
    blocks: [...new Set(villages.map((v) => v.block))].sort(),
    programmes: scopedProgrammes(profile).map((p) => ({ value: p.id, label: p.name })),
    donors: scopedDonors(profile).map((d) => ({ value: d.id, label: d.name })),
  };
}

/** Select options for the create/edit forms. */
export function getFormOptions(profile: Profile) {
  const employees = db.employees
    .filter((e) => e.employmentStatus === "active")
    .map((e) => ({ value: e.id, label: `${e.fullName} · ${e.designation}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return {
    donors: scopedDonors(profile).map((d) => ({ value: d.id, label: d.name })),
    programmes: scopedProgrammes(profile).map((p) => ({ value: p.id, label: p.name })),
    villages: scopedVillages(profile).map((v) => ({ value: v.id, label: `${v.name} · ${v.block}` })),
    employees,
  };
}

/* ------------------------------------------------------------------ */
/* Detail pages                                                        */
/* ------------------------------------------------------------------ */

export type Facts = { label: string; value: string }[];

export function masterValues(entity: MasterEntity, id: string): MasterValues {
  const str = (value: string | number | null) => (value === null ? "" : String(value));
  if (entity === "villages") {
    const row = findVillage(id);
    if (!row) return {};
    return {
      name: row.name,
      panchayat: row.panchayat,
      block: row.block,
      district: row.district,
      state: row.state,
      population: str(row.population),
      status: row.status,
    };
  }
  if (entity === "donors") {
    const row = findDonor(id);
    if (!row) return {};
    return {
      name: row.name,
      donorType: row.donorType,
      contactPerson: row.contactPerson,
      email: row.email,
      phone: row.phone,
      grantStart: row.grantStart,
      grantEnd: row.grantEnd,
      approvedBudget: str(row.approvedBudget),
      status: row.status,
    };
  }
  if (entity === "programmes") {
    const row = findProgramme(id);
    if (!row) return {};
    return {
      name: row.name,
      focusArea: row.focusArea,
      description: row.description,
      coordinatorId: str(row.coordinatorId),
      startDate: row.startDate,
      endDate: str(row.endDate),
      status: row.status,
    };
  }
  const row = findProject(id);
  if (!row) return {};
  return {
    name: row.name,
    donorId: row.donorId,
    programmeId: row.programmeId,
    coordinatorId: str(row.coordinatorId),
    startDate: row.startDate,
    endDate: row.endDate,
    approvedBudget: str(row.approvedBudget),
    targetBeneficiaries: str(row.targetBeneficiaries),
    status: row.status,
    villageIds: row.villageIds,
  };
}

export function findVillage(id: string) {
  return db.villages.find((v) => v.id === id) ?? null;
}
export function findDonor(id: string) {
  return db.donors.find((d) => d.id === id) ?? null;
}
export function findProgramme(id: string) {
  return db.programmes.find((p) => p.id === id) ?? null;
}
export function findProject(id: string) {
  return db.projects.find((p) => p.id === id) ?? null;
}

export function villageFacts(village: Village): Facts {
  return [
    { label: "Gram panchayat", value: village.panchayat },
    { label: "Block", value: village.block },
    { label: "District", value: village.district },
    { label: "State", value: village.state },
    { label: "Population", value: village.population ? String(village.population) : "—" },
    { label: "Status", value: village.status },
  ];
}

export function donorFacts(donor: Donor): Facts {
  return [
    { label: "Donor type", value: donor.donorType },
    { label: "Contact", value: donor.contactPerson || "—" },
    { label: "Email", value: donor.email || "—" },
    { label: "Phone", value: donor.phone || "—" },
    { label: "Grant period", value: `${formatDate(donor.grantStart)} – ${formatDate(donor.grantEnd)}` },
    { label: "Approved budget", value: formatCurrency(donor.approvedBudget) },
  ];
}

export function programmeFacts(programme: Programme, coordinator: string): Facts {
  return [
    { label: "Focus area", value: programme.focusArea },
    { label: "Coordinator", value: coordinator },
    {
      label: "Period",
      value: `${formatDate(programme.startDate)} – ${programme.endDate ? formatDate(programme.endDate) : "open"}`,
    },
    { label: "Description", value: programme.description || "—" },
  ];
}

export function projectFacts(project: Project): Facts {
  const donor = db.donors.find((d) => d.id === project.donorId)?.name ?? "—";
  const programme = db.programmes.find((p) => p.id === project.programmeId)?.name ?? "—";
  const coordinator = db.employees.find((e) => e.id === project.coordinatorId)?.fullName ?? "—";
  return [
    { label: "Donor", value: donor },
    { label: "Programme", value: programme },
    { label: "Coordinator", value: coordinator },
    { label: "Period", value: `${formatDate(project.startDate)} – ${formatDate(project.endDate)}` },
    { label: "Approved budget", value: formatCurrency(project.approvedBudget) },
    { label: "Target beneficiaries", value: String(project.targetBeneficiaries) },
  ];
}

export function linkedProjects(projectIds: string[]) {
  return projectIds.map((id) => {
    const project = db.projects.find((p) => p.id === id)!;
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      donor: db.donors.find((d) => d.id === project.donorId)?.name ?? "—",
      status: project.status,
      villages: project.villageIds.length,
      beneficiaries: beneficiariesInProject(project.id),
      budget: project.approvedBudget,
    };
  });
}

export function villageDetail(village: Village, profile: Profile) {
  const visible = new Set(scopedProjects(profile).map((p) => p.id));
  return {
    facts: villageFacts(village),
    projects: linkedProjects(db.projects.filter((p) => p.villageIds.includes(village.id) && visible.has(p.id)).map((p) => p.id)),
    beneficiaries: beneficiariesInVillage(village.id),
    activities: db.activities.filter((a) => a.villageId === village.id).length,
  };
}

export function donorDetail(donor: Donor, profile: Profile) {
  const visible = new Set(scopedProjects(profile).map((p) => p.id));
  const projects = linkedProjects(db.projects.filter((p) => p.donorId === donor.id && visible.has(p.id)).map((p) => p.id));
  const rawDisbursements = (db.donorDisbursements ?? []).filter((d) => d.donorId === donor.id);
  const disbursements = rawDisbursements
    .sort((a, b) => b.disbursedOn.localeCompare(a.disbursedOn))
    .map((d) => {
      const proj = db.projects.find((p) => p.id === d.projectId);
      const recorder = db.profiles.find((pr) => pr.id === d.recordedBy);
      return {
        id: d.id,
        projectId: d.projectId,
        projectName: proj?.name ?? "—",
        projectCode: proj?.code ?? "—",
        amount: d.amount,
        disbursedOn: formatDate(d.disbursedOn),
        notes: d.notes,
        recordedByName: recorder?.fullName ?? "Staff",
      };
    });
  const totalDisbursed = rawDisbursements.reduce((sum, d) => sum + d.amount, 0);
  const remaining = Math.max(0, donor.approvedBudget - totalDisbursed);
  return {
    facts: donorFacts(donor),
    projects,
    committed: projects.reduce((sum, row) => sum + row.budget, 0),
    disbursements,
    totalDisbursed,
    remaining,
    percentDisbursed: donor.approvedBudget > 0 ? Math.round((totalDisbursed / donor.approvedBudget) * 100) : 0,
  };
}

export function programmeDetail(programme: Programme, profile: Profile) {
  const coordinator = db.employees.find((e) => e.id === programme.coordinatorId)?.fullName ?? "—";
  const projects = linkedProjects(db.projects.filter((p) => p.programmeId === programme.id).map((p) => p.id));
  const visible = new Set(scopedProjects(profile).map((p) => p.id));
  const projectIds = projects.map((p) => p.id).filter((id) => visible.has(id));
  const activities = db.activities
    .filter((a) => a.programmeId === programme.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  return {
    facts: programmeFacts(programme, coordinator),
    projects,
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      village: db.villages.find((v) => v.id === a.villageId)?.name ?? "—",
      date: formatDate(a.startDate),
      status: a.status,
    })),
    beneficiaries: projects.reduce((sum, row) => sum + row.beneficiaries, 0),
  };
}

export function projectDetail(project: Project, profile: Profile) {
  const visible = new Set(scopedVillages(profile).map((v) => v.id));
  const villages = db.villages
    .filter((v) => project.villageIds.includes(v.id) && visible.has(v.id))
    .map((v) => ({ id: v.id, name: v.name, block: v.block, beneficiaries: beneficiariesInVillage(v.id) }));

  const beneficiaries = db.beneficiaries
    .filter((b) => b.projectIds.includes(project.id) && b.status === "active")
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      name: b.fullName,
      code: b.code,
      village: db.villages.find((v) => v.id === b.villageId)?.name ?? "—",
      gender: b.gender,
    }));

  const activities = db.activities
    .filter((a) => a.projectId === project.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((a) => ({
      id: a.id,
      title: a.title,
      type: a.activityType.replace("_", " "),
      village: db.villages.find((v) => v.id === a.villageId)?.name ?? "—",
      date: formatDate(a.startDate),
      status: a.status,
    }));

  const indicators = db.indicators
    .filter((i) => i.projectId === project.id)
    .map((i) => {
      const latest = db.indicatorValues
        .filter((v) => v.indicatorId === i.id)
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
      const achieved = latest?.value ?? 0;
      return {
        id: i.id,
        name: i.name,
        unit: i.unit,
        target: i.target,
        achieved,
        percent: pct(achieved, i.target),
        status: !latest ? "no_data" : pct(achieved, i.target) >= 45 ? "on_track" : "behind",
      };
    });

  const donor = db.donors.find((d) => d.id === project.donorId);
  const rawDisbursements = (db.donorDisbursements ?? []).filter((d) => d.projectId === project.id);
  const disbursements = rawDisbursements
    .sort((a, b) => b.disbursedOn.localeCompare(a.disbursedOn))
    .map((d) => ({
      id: d.id,
      amount: d.amount,
      disbursedOn: formatDate(d.disbursedOn),
      notes: d.notes,
    }));
  const totalDisbursed = rawDisbursements.reduce((sum, d) => sum + d.amount, 0);

  return {
    facts: projectFacts(project),
    villages,
    beneficiaries,
    beneficiaryTotal: beneficiariesInProject(project.id),
    activities,
    indicators,
    donor,
    disbursements,
    totalDisbursed,
    fundingBalance: Math.max(0, project.approvedBudget - totalDisbursed),
  };
}
