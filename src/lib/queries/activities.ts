import { db } from "../data/store";
import type { Activity, ActivityAttachment, ActivityParticipant, ActivityStatus, ActivityType, Profile } from "../data/types";
import { scopeForRole } from "../rbac";
import { buildQuery, PAGE_SIZE } from "../masters";

export type ActivityListQuery = {
  q: string;
  type: string;
  status: string;
  projectId: string;
  villageId: string;
  page: number;
};

export type ActivityRow = Activity & {
  projectName: string;
  programmeName: string;
  villageName: string;
  actualCount: number;
  maleCount: number;
  femaleCount: number;
};

export type ParticipantRow = {
  activityId: string;
  beneficiaryId: string;
  attended: boolean;
  fullName: string;
  code: string;
  gender: string;
  villageName: string;
};

export type ActivityStaffRow = { employeeId: string; fullName: string; designation: string };

export type ActivityDetail = ActivityRow & {
  participants: ParticipantRow[];
  staff: ActivityStaffRow[];
  attachments: ActivityAttachment[];
};

function enrichActivity(a: Activity): ActivityRow {
  const project = db.projects.find((p) => p.id === a.projectId);
  const programme = db.programmes.find((p) => p.id === a.programmeId);
  const village = db.villages.find((v) => v.id === a.villageId);

  const actParticipants = db.participants.filter((p) => p.activityId === a.id && p.attended);
  let male = 0, female = 0, other = 0;
  for (const p of actParticipants) {
    const ben = db.beneficiaries.find((b) => b.id === p.beneficiaryId);
    if (!ben) continue;
    if (ben.gender === "male") male++;
    else if (ben.gender === "female") female++;
    else other++;
  }

  return {
    ...a,
    projectName: project?.name ?? "—",
    programmeName: programme?.name ?? "—",
    villageName: village?.name ?? "—",
    actualCount: male + female + other,
    maleCount: male,
    femaleCount: female,
  };
}

export function listActivities(
  profile: Profile,
  query: ActivityListQuery,
): { rows: ActivityRow[]; total: number; page: number; pages: number } {
  const scope = scopeForRole(profile.id, profile.role);
  const q = query.q.toLowerCase();

  let rows = db.activities.filter((a) => {
    if (scope.villageIds && !scope.villageIds.includes(a.villageId)) return false;
    if (scope.projectIds && !scope.projectIds.includes(a.projectId)) return false;
    if (query.type && a.activityType !== query.type) return false;
    if (query.status && a.status !== query.status) return false;
    if (query.projectId && a.projectId !== query.projectId) return false;
    if (query.villageId && a.villageId !== query.villageId) return false;
    if (q) {
      const title = a.title.toLowerCase();
      const code = a.code.toLowerCase();
      if (!title.includes(q) && !code.includes(q)) return false;
    }
    return true;
  });

  // Newest first
  rows.sort((a, b) => b.startDate.localeCompare(a.startDate));

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  rows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { rows: rows.map(enrichActivity), total, page, pages };
}

export function getActivity(id: string, profile: Profile): ActivityDetail | null {
  const scope = scopeForRole(profile.id, profile.role);
  const a = db.activities.find((x) => x.id === id);
  if (!a) return null;
  if (scope.villageIds && !scope.villageIds.includes(a.villageId)) return null;
  if (scope.projectIds && !scope.projectIds.includes(a.projectId)) return null;

  const participants: ParticipantRow[] = db.participants
    .filter((p) => p.activityId === a.id)
    .map((p) => {
      const ben = db.beneficiaries.find((b) => b.id === p.beneficiaryId);
      const village = db.villages.find((v) => v.id === ben?.villageId);
      return {
        activityId: p.activityId,
        beneficiaryId: p.beneficiaryId,
        attended: p.attended,
        fullName: ben?.fullName ?? "Unknown",
        code: ben?.code ?? "—",
        gender: ben?.gender ?? "—",
        villageName: village?.name ?? "—",
      };
    });

  const staff: ActivityStaffRow[] = db.activityStaff
    .filter((s) => s.activityId === a.id)
    .map((s) => {
      const e = db.employees.find((x) => x.id === s.employeeId);
      return { employeeId: s.employeeId, fullName: e?.fullName ?? "Unknown", designation: e?.designation ?? "—" };
    });

  const attachments = db.activityAttachments.filter((x) => x.activityId === a.id);

  return { ...enrichActivity(a), participants, staff, attachments };
}

/** Active employees not already assigned to this activity. */
export function assignableEmployees(activityId: string) {
  const assigned = new Set(
    db.activityStaff.filter((s) => s.activityId === activityId).map((s) => s.employeeId),
  );
  return db.employees.filter((e) => e.employmentStatus === "active" && !assigned.has(e.id));
}

/** Counts for activities the current user can see — used for quick stats. */
export function activityStats(profile: Profile) {
  const scope = scopeForRole(profile.id, profile.role);
  const visible = db.activities.filter((a) => {
    if (scope.villageIds && !scope.villageIds.includes(a.villageId)) return false;
    if (scope.projectIds && !scope.projectIds.includes(a.projectId)) return false;
    return true;
  });
  const planned = visible.filter((a) => a.status === "planned").length;
  const completed = visible.filter((a) => a.status === "completed").length;
  const cancelled = visible.filter((a) => a.status === "cancelled").length;
  return { total: visible.length, planned, completed, cancelled };
}

/** Beneficiaries NOT already in this activity, scoped by village if supplied. */
export function availableBeneficiaries(activityId: string, villageId: string) {
  const existing = new Set(
    db.participants.filter((p) => p.activityId === activityId).map((p) => p.beneficiaryId),
  );
  return db.beneficiaries
    .filter((b) => {
      if (b.status !== "active") return false;
      if (existing.has(b.id)) return false;
      if (villageId && b.villageId !== villageId) return false;
      return true;
    })
    .slice(0, 60); // cap for dropdown
}

/** All beneficiaries in a village not yet in the activity. */
export function beneficiariesForVillage(activityId: string, villageId: string) {
  const existing = new Set(
    db.participants.filter((p) => p.activityId === activityId).map((p) => p.beneficiaryId),
  );
  return db.beneficiaries.filter(
    (b) => b.status === "active" && b.villageId === villageId && !existing.has(b.id),
  );
}

/** Make a next numeric ID for activities. */
export function nextActivityId() {
  const nums = db.activities.map((a) => Number(a.id.slice(4)));
  const max = nums.length ? Math.max(...nums) : 0;
  return `act-${String(max + 1).padStart(4, "0")}`;
}

export { buildQuery };
