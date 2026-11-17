import { db } from "../data/store";
import type { Farmer, PwdProfile, Shg, ShgMember, Profile, RecordStatus } from "../data/types";
import { formatCurrency, formatDate } from "../format";
import { canAccessPwd } from "../profiles";
import { scopeForRole } from "../rbac";

export const PROFILES_PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/* FARMER QUERIES                                                     */
/* ------------------------------------------------------------------ */

export type FarmerQuery = {
  q: string;
  villageId: string;
  organicStatus: string;
  crop: string;
  page: number;
};

export type FarmerRow = {
  id: string;
  code: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryCode: string;
  villageName: string;
  landHoldingAcres: number;
  farmingType: string;
  organicStatus: string;
  cropsSummary: string;
  status: RecordStatus;
};

export function listFarmers(profile: Profile, query: FarmerQuery, pageSize = PROFILES_PAGE_SIZE) {
  const scope = scopeForRole(profile.id, profile.role);
  const villageMap = new Map(db.villages.map((v) => [v.id, v]));
  const beneficiaryMap = new Map(db.beneficiaries.map((b) => [b.id, b]));

  const filtered = db.farmers.filter((f) => {
    const ben = beneficiaryMap.get(f.beneficiaryId);
    if (!ben) return false;
    if (scope.villageIds !== null && !scope.villageIds.includes(ben.villageId)) return false;

    if (query.q) {
      const needle = query.q.toLowerCase();
      const match =
        f.code.toLowerCase().includes(needle) ||
        ben.fullName.toLowerCase().includes(needle) ||
        ben.code.toLowerCase().includes(needle);
      if (!match) return false;
    }

    if (query.villageId && ben.villageId !== query.villageId) return false;
    if (query.organicStatus && f.organicStatus !== query.organicStatus) return false;
    if (query.crop) {
      const hasCrop = f.crops.some((c) => c.crop.toLowerCase().includes(query.crop.toLowerCase()));
      if (!hasCrop) return false;
    }

    return true;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(query.page, 1), pages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: FarmerRow[] = paged.map((f) => {
    const ben = beneficiaryMap.get(f.beneficiaryId)!;
    const v = villageMap.get(ben.villageId);
    return {
      id: f.id,
      code: f.code,
      beneficiaryId: f.beneficiaryId,
      beneficiaryName: ben.fullName,
      beneficiaryCode: ben.code,
      villageName: v ? v.name : "—",
      landHoldingAcres: f.landHoldingAcres,
      farmingType: f.farmingType,
      organicStatus: f.organicStatus,
      cropsSummary: f.crops.map((c) => `${c.crop} (${c.areaAcres} ac)`).join(", ") || "None",
      status: f.status ?? "active",
    };
  });

  return { rows, total, page, pages };
}

/* ------------------------------------------------------------------ */
/* SHG QUERIES                                                        */
/* ------------------------------------------------------------------ */

export type ShgQuery = {
  q: string;
  villageId: string;
  page: number;
};

export type ShgRow = {
  id: string;
  code: string;
  name: string;
  villageName: string;
  formationDate: string;
  meetingFrequency: string;
  memberCount: number;
  totalSavings: number;
  status: RecordStatus;
};

export function listShgs(profile: Profile, query: ShgQuery, pageSize = PROFILES_PAGE_SIZE) {
  const scope = scopeForRole(profile.id, profile.role);
  const villageMap = new Map(db.villages.map((v) => [v.id, v]));

  // Pre-calculate member count and savings per SHG
  const memberCounts = new Map<string, number>();
  const savingsPerShg = new Map<string, number>();

  const memberToShg = new Map<string, string>();
  db.shgMembers.forEach((m) => {
    if (m.status === "active") {
      memberCounts.set(m.shgId, (memberCounts.get(m.shgId) ?? 0) + 1);
      memberToShg.set(m.id, m.shgId);
    }
  });

  db.savings.forEach((s) => {
    const shgId = memberToShg.get(s.shgMemberId);
    if (shgId) {
      const delta = s.txnType === "deposit" ? s.amount : -s.amount;
      savingsPerShg.set(shgId, (savingsPerShg.get(shgId) ?? 0) + delta);
    }
  });

  const filtered = db.shgs.filter((s) => {
    if (scope.villageIds !== null && !scope.villageIds.includes(s.villageId)) return false;
    if (query.villageId && s.villageId !== query.villageId) return false;
    if (query.q) {
      const needle = query.q.toLowerCase();
      const match = s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle);
      if (!match) return false;
    }
    return true;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(query.page, 1), pages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: ShgRow[] = paged.map((s) => {
    const v = villageMap.get(s.villageId);
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      villageName: v ? v.name : "—",
      formationDate: formatDate(s.formationDate),
      meetingFrequency: s.meetingFrequency,
      memberCount: memberCounts.get(s.id) ?? 0,
      totalSavings: savingsPerShg.get(s.id) ?? 0,
      status: s.status,
    };
  });

  return { rows, total, page, pages };
}

export function getShgDetail(id: string, profile: Profile) {
  const shg = db.shgs.find((s) => s.id === id);
  if (!shg) return null;

  const scope = scopeForRole(profile.id, profile.role);
  if (scope.villageIds !== null && !scope.villageIds.includes(shg.villageId)) {
    return null;
  }

  const village = db.villages.find((v) => v.id === shg.villageId);
  const beneficiaryMap = new Map(db.beneficiaries.map((b) => [b.id, b]));

  const members = db.shgMembers
    .filter((m) => m.shgId === shg.id)
    .map((m) => {
      const b = beneficiaryMap.get(m.beneficiaryId);
      const memberTxns = db.savings.filter((s) => s.shgMemberId === m.id);
      const balance = memberTxns.reduce(
        (sum, s) => (s.txnType === "deposit" ? sum + s.amount : sum - s.amount),
        0
      );
      return {
        id: m.id,
        beneficiaryId: m.beneficiaryId,
        name: b ? b.fullName : "Unknown",
        code: b ? b.code : "—",
        mobile: b ? b.mobile : "—",
        role: m.role,
        joinDate: formatDate(m.joinDate),
        balance,
        status: m.status,
      };
    });

  const memberIds = new Set(members.map((m) => m.id));
  const memberNameMap = new Map(members.map((m) => [m.id, m.name]));

  const savings = db.savings
    .filter((s) => memberIds.has(s.shgMemberId))
    .sort((a, b) => b.txnDate.localeCompare(a.txnDate))
    .map((s) => ({
      id: s.id,
      memberName: memberNameMap.get(s.shgMemberId) ?? "Member",
      txnDate: formatDate(s.txnDate),
      txnType: s.txnType,
      amount: s.amount,
    }));

  const totalSavings = members.reduce((sum, m) => sum + m.balance, 0);

  const projects = db.projects.filter(
    (p) => shg.projectIds?.includes(p.id) || p.villageIds.includes(shg.villageId)
  );

  return {
    shg,
    village,
    members,
    savings,
    totalSavings,
    projects,
  };
}

/* ------------------------------------------------------------------ */
/* PWD QUERIES (CONFIDENTIAL / SENSITIVE)                             */
/* ------------------------------------------------------------------ */

export type PwdQuery = {
  q: string;
  villageId: string;
  disabilityType: string;
  page: number;
};

export type PwdRow = {
  id: string;
  code: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryCode: string;
  villageName: string;
  disabilityType: string;
  disabilityPercentage: number;
  certificateNo: string;
  educationLevel: string;
  vocationalStatus: string;
  status: RecordStatus;
};

export function listPwdProfiles(profile: Profile, query: PwdQuery, pageSize = PROFILES_PAGE_SIZE) {
  if (!canAccessPwd(profile.role)) {
    return { rows: [], total: 0, page: 1, pages: 1 };
  }

  const scope = scopeForRole(profile.id, profile.role);
  const villageMap = new Map(db.villages.map((v) => [v.id, v]));
  const beneficiaryMap = new Map(db.beneficiaries.map((b) => [b.id, b]));

  const filtered = db.pwdProfiles.filter((p) => {
    const ben = beneficiaryMap.get(p.beneficiaryId);
    if (!ben) return false;
    if (scope.villageIds !== null && !scope.villageIds.includes(ben.villageId)) return false;

    if (query.q) {
      const needle = query.q.toLowerCase();
      const match =
        p.code.toLowerCase().includes(needle) ||
        p.certificateNo.toLowerCase().includes(needle) ||
        ben.fullName.toLowerCase().includes(needle) ||
        ben.code.toLowerCase().includes(needle);
      if (!match) return false;
    }

    if (query.villageId && ben.villageId !== query.villageId) return false;
    if (query.disabilityType && p.disabilityType !== query.disabilityType) return false;

    return true;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(query.page, 1), pages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: PwdRow[] = paged.map((p) => {
    const ben = beneficiaryMap.get(p.beneficiaryId)!;
    const v = villageMap.get(ben.villageId);
    return {
      id: p.id,
      code: p.code,
      beneficiaryId: p.beneficiaryId,
      beneficiaryName: profile.role === "mel_officer" ? "Confidential PWD" : ben.fullName,
      beneficiaryCode: ben.code,
      villageName: v ? v.name : "—",
      disabilityType: p.disabilityType,
      disabilityPercentage: p.disabilityPercentage,
      certificateNo: p.certificateNo,
      educationLevel: p.educationLevel,
      vocationalStatus: p.vocationalStatus,
      status: p.status ?? "active",
    };
  });

  return { rows, total, page, pages };
}

export function getPwdDetail(id: string, profile: Profile) {
  if (!canAccessPwd(profile.role)) return null;

  const pwd = db.pwdProfiles.find((p) => p.id === id);
  if (!pwd) return null;

  const beneficiary = db.beneficiaries.find((b) => b.id === pwd.beneficiaryId);
  if (!beneficiary) return null;

  const scope = scopeForRole(profile.id, profile.role);
  if (scope.villageIds !== null && !scope.villageIds.includes(beneficiary.villageId)) {
    return null;
  }

  const village = db.villages.find((v) => v.id === beneficiary.villageId);
  const interventions = (db.pwdInterventions ?? []).filter((i) => i.pwdId === pwd.id);
  const followups = (db.pwdFollowups ?? []).filter((f) => f.pwdId === pwd.id);

  return {
    pwd,
    beneficiary,
    village,
    interventions,
    followups,
  };
}
