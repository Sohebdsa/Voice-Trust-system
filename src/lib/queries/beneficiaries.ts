import { db } from "../data/store";
import type { Beneficiary, Profile } from "../data/types";
import { ageFrom, formatDate } from "../format";
import {
  canViewSensitivePwd,
  BENEFICIARY_PAGE_SIZE,
  type DuplicateMatch,
} from "../beneficiaries";
import { scopeForRole } from "../rbac";

export type BeneficiaryListQuery = {
  q: string;
  district: string;
  block: string;
  villageId: string;
  gender: string;
  profile: string;
  projectId: string;
  status: string;
  flag: string;
  page: number;
};

export function parseBeneficiaryQuery(params: Record<string, string | string[] | undefined>): BeneficiaryListQuery {
  const read = (key: string) => {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;
    return single && single !== "all" ? single : "";
  };
  return {
    q: read("q"),
    district: read("district"),
    block: read("block"),
    villageId: read("village") || read("villageId"),
    gender: read("gender"),
    profile: read("profile"),
    projectId: read("project") || read("projectId"),
    status: read("status"),
    flag: read("flag"),
    page: Math.max(1, Number(read("page")) || 1),
  };
}

export type BeneficiaryRow = {
  id: string;
  code: string;
  fullName: string;
  gender: string;
  age: number | null;
  mobile: string;
  villageName: string;
  block: string;
  district: string;
  projectsCount: number;
  status: string;
  profiles: {
    isFarmer: boolean;
    isShg: boolean;
    isPwd: boolean; // only true if role is allowed to see PWD
  };
};

export function scopedBeneficiaries(profile: Profile): Beneficiary[] {
  const scope = scopeForRole(profile.id, profile.role);
  return db.beneficiaries.filter((b) => {
    // Village scope check
    if (scope.villageIds !== null && !scope.villageIds.includes(b.villageId)) {
      return false;
    }
    // Project scope check
    if (scope.projectIds !== null) {
      const inProject = b.projectIds.some((pId) => scope.projectIds!.includes(pId));
      if (!inProject) return false;
    }
    // Programme scope check
    if (scope.programmeIds !== null && scope.projectIds === null) {
      const allowedProjects = new Set(
        db.projects.filter((p) => scope.programmeIds!.includes(p.programmeId)).map((p) => p.id)
      );
      const inProgrammeProject = b.projectIds.some((pId) => allowedProjects.has(pId));
      if (!inProgrammeProject) return false;
    }
    return true;
  });
}

export function listBeneficiaries(profile: Profile, query: BeneficiaryListQuery, pageSize = BENEFICIARY_PAGE_SIZE) {
  const scoped = scopedBeneficiaries(profile);
  const villageMap = new Map(db.villages.map((v) => [v.id, v]));
  const farmerSet = new Set(db.farmers.map((f) => f.beneficiaryId));
  const shgSet = new Set(db.shgMembers.filter((m) => m.status === "active").map((m) => m.beneficiaryId));
  const pwdSet = new Set(db.pwdProfiles.map((p) => p.beneficiaryId));
  const allowPwd = canViewSensitivePwd(profile.role);

  // Pre-calculate duplicate mobiles for flag=duplicate
  const mobileCounts = new Map<string, number>();
  db.beneficiaries.forEach((b) => {
    mobileCounts.set(b.mobile, (mobileCounts.get(b.mobile) ?? 0) + 1);
  });

  const filtered = scoped.filter((b) => {
    const v = villageMap.get(b.villageId);

    // Text search (name, code, mobile)
    if (query.q) {
      const needle = query.q.toLowerCase();
      const match =
        b.fullName.toLowerCase().includes(needle) ||
        b.code.toLowerCase().includes(needle) ||
        b.mobile.includes(needle);
      if (!match) return false;
    }

    // Cascade filters
    if (query.district && v?.district !== query.district) return false;
    if (query.block && v?.block !== query.block) return false;
    if (query.villageId && b.villageId !== query.villageId) return false;

    // Demographic & status
    if (query.gender && b.gender !== query.gender) return false;
    if (query.status && b.status !== query.status) return false;

    // Project filter
    if (query.projectId && !b.projectIds.includes(query.projectId)) return false;

    // Profile type chip filter
    if (query.profile) {
      const p = query.profile.toLowerCase();
      if ((p === "farmer" || p === "farmers") && !farmerSet.has(b.id)) return false;
      if ((p === "shg" || p === "shgs") && !shgSet.has(b.id)) return false;
      if ((p === "pwd" || p === "pwds") && (!allowPwd || !pwdSet.has(b.id))) return false;
    }

    // Duplicate flag from inbox
    if (query.flag === "duplicate" && (mobileCounts.get(b.mobile) ?? 0) <= 1) {
      return false;
    }

    return true;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(query.page, 1), pages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: BeneficiaryRow[] = paged.map((b) => {
    const v = villageMap.get(b.villageId);
    return {
      id: b.id,
      code: b.code,
      fullName: b.fullName,
      gender: b.gender,
      age: ageFrom(b.dateOfBirth),
      mobile: b.mobile,
      villageName: v ? v.name : "—",
      block: v ? v.block : "—",
      district: v ? v.district : "—",
      projectsCount: b.projectIds.length,
      status: b.status,
      profiles: {
        isFarmer: farmerSet.has(b.id),
        isShg: shgSet.has(b.id),
        isPwd: allowPwd && pwdSet.has(b.id),
      },
    };
  });

  return { rows, total, page, pages };
}

export function findDuplicates(
  mobile: string,
  idProofType?: string | null,
  idProofLast4?: string | null,
  excludeId?: string
): DuplicateMatch[] {
  const cleanMobile = mobile?.trim().replace(/\D/g, "") ?? "";
  const cleanLast4 = idProofLast4?.trim() ?? "";
  const villageMap = new Map(db.villages.map((v) => [v.id, v.name]));

  const matches: DuplicateMatch[] = [];

  for (const b of db.beneficiaries) {
    if (excludeId && b.id === excludeId) continue;

    let matchedBy: "mobile" | "idProof" | null = null;
    if (cleanMobile && b.mobile === cleanMobile) {
      matchedBy = "mobile";
    } else if (
      cleanLast4 &&
      cleanLast4.length === 4 &&
      b.idProofLast4 === cleanLast4 &&
      (!idProofType || b.idProofType === idProofType)
    ) {
      matchedBy = "idProof";
    }

    if (matchedBy) {
      matches.push({
        id: b.id,
        code: b.code,
        fullName: b.fullName,
        mobile: b.mobile,
        villageName: villageMap.get(b.villageId) ?? "Unknown",
        matchedBy,
      });
    }
  }

  return matches;
}

export function getBeneficiaryFormOptions(profile: Profile) {
  const scope = scopeForRole(profile.id, profile.role);
  const villages = db.villages
    .filter((v) => scope.villageIds === null || scope.villageIds.includes(v.id))
    .map((v) => ({ value: v.id, label: `${v.name} (${v.block}, ${v.district})` }));

  const projects = db.projects
    .filter((p) => p.status === "active" && (scope.projectIds === null || scope.projectIds.includes(p.id)))
    .map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }));

  const districts = Array.from(new Set(db.villages.map((v) => v.district))).sort();
  const blocks = Array.from(new Set(db.villages.map((v) => v.block))).sort();

  return { villages, projects, districts, blocks };
}

export function getBeneficiaryDetail(id: string, profile: Profile) {
  const beneficiary = db.beneficiaries.find((b) => b.id === id);
  if (!beneficiary) return null;

  // Check role scope
  const scope = scopeForRole(profile.id, profile.role);
  if (scope.villageIds !== null && !scope.villageIds.includes(beneficiary.villageId)) {
    return null;
  }
  if (scope.projectIds !== null && !beneficiary.projectIds.some((pId) => scope.projectIds!.includes(pId))) {
    return null;
  }

  const village = db.villages.find((v) => v.id === beneficiary.villageId);
  const projects = db.projects.filter((p) => beneficiary.projectIds.includes(p.id));
  const farmer = db.farmers.find((f) => f.beneficiaryId === beneficiary.id);

  const shgMember = db.shgMembers.find((m) => m.beneficiaryId === beneficiary.id);
  const shg = shgMember ? db.shgs.find((s) => s.id === shgMember.shgId) : null;
  const shgSavings = shgMember
    ? db.savings.filter((s) => s.shgMemberId === shgMember.id)
    : [];
  const totalSavings = shgSavings.reduce((acc, s) => {
    return s.txnType === "deposit" ? acc + s.amount : acc - s.amount;
  }, 0);

  const allowPwd = canViewSensitivePwd(profile.role);
  const pwd = allowPwd ? db.pwdProfiles.find((p) => p.beneficiaryId === beneficiary.id) : null;

  // Activities attended
  const attendedParticipations = db.participants.filter(
    (pt) => pt.beneficiaryId === beneficiary.id && pt.attended
  );
  const attendedActivityIds = new Set(attendedParticipations.map((pt) => pt.activityId));
  const activities = db.activities
    .filter((a) => attendedActivityIds.has(a.id))
    .map((a) => {
      const proj = db.projects.find((p) => p.id === a.projectId);
      return {
        id: a.id,
        code: a.code,
        title: a.title,
        activityType: a.activityType,
        date: formatDate(a.startDate),
        projectName: proj ? proj.name : "—",
        status: a.status,
      };
    });

  // Audit timeline
  const timeline = db.audit
    .filter((a) => a.recordId === beneficiary.id || a.recordId === beneficiary.code)
    .sort((a, b) => b.at.localeCompare(a.at));

  // Duplicates check for information on detail
  const duplicates = findDuplicates(
    beneficiary.mobile,
    beneficiary.idProofType,
    beneficiary.idProofLast4,
    beneficiary.id
  );

  return {
    beneficiary,
    age: ageFrom(beneficiary.dateOfBirth),
    village,
    projects,
    farmer,
    shg,
    shgMember,
    totalSavings,
    pwd,
    allowPwd,
    activities,
    timeline,
    duplicates,
  };
}
