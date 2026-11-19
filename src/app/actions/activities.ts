"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/data/store";
import type { Activity, ActivityStatus, ActivityType } from "@/lib/data/types";
import { requireSession } from "@/lib/session";
import { scopeForRole } from "@/lib/rbac";
import { nextActivityId, beneficiariesForVillage } from "@/lib/queries/activities";

const WRITE_ROLES = ["admin", "programme_manager", "project_coordinator", "field_staff", "data_entry"] as const;
type WriteRole = (typeof WRITE_ROLES)[number];

function canWrite(role: string): role is WriteRole {
  return (WRITE_ROLES as readonly string[]).includes(role);
}

/** Is this activity locked for field_staff? Completed + older than 7 days. */
function isLocked(activity: Activity, role: string): boolean {
  if (role !== "field_staff") return false;
  if (activity.status !== "completed") return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return new Date(activity.endDate) < cutoff;
}

export type ActivitySaveState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  activityId?: string;
};

export async function saveActivity(
  _prev: ActivitySaveState,
  formData: FormData,
): Promise<ActivitySaveState> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return { error: "Not permitted." };

  const id = String(formData.get("id") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "").trim();
  const activityType = String(formData.get("activityType") ?? "").trim() as ActivityType;
  const projectId = String(formData.get("projectId") ?? "").trim();
  const villageId = String(formData.get("villageId") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim() || startDate;
  const status = (String(formData.get("status") ?? "planned").trim()) as ActivityStatus;
  const targetParticipants = Number(formData.get("targetParticipants") ?? 0) || 0;
  const expenditure = formData.get("expenditure") ? Number(formData.get("expenditure")) : null;
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const resourcePersons = String(formData.get("resourcePersons") ?? "").trim();
  const outputsResults = String(formData.get("outputsResults") ?? "").trim();
  const noParticipantsReason = String(formData.get("noParticipantsReason") ?? "").trim();

  // Validate
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Title is required.";
  if (!activityType) errors.activityType = "Activity type is required.";
  if (!projectId) errors.projectId = "Project is required.";
  if (!villageId) errors.villageId = "Village is required.";
  if (!startDate) errors.startDate = "Start date is required.";
  if (endDate && startDate && endDate < startDate) errors.endDate = "End date cannot be before start date.";
  const enrolled = db.participants.filter((p) => p.activityId === id).length;
  if (status === "completed" && enrolled === 0 && !noParticipantsReason) {
    errors.noParticipantsReason = "A completed activity with no participants needs a reason.";
  }
  if (Object.keys(errors).length) return { fieldErrors: errors };

  // Scope check for field_staff
  const scope = scopeForRole(profile.id, profile.role);
  if (scope.villageIds && !scope.villageIds.includes(villageId)) {
    return { error: "You can only create activities in your assigned villages." };
  }

  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return { error: "Project not found." };

  if (id) {
    // Edit
    const idx = db.activities.findIndex((a) => a.id === id);
    if (idx < 0) return { error: "Activity not found." };
    const existing = db.activities[idx]!;
    if (isLocked(existing, profile.role)) return { error: "Completed activities older than 7 days are locked. Ask a coordinator to unlock." };
    db.activities[idx] = { ...existing, title, activityType, projectId, programmeId: project.programmeId, villageId, startDate, endDate, status, targetParticipants, expenditure, description, location, resourcePersons, outputsResults, noParticipantsReason };
    revalidatePath("/activities");
    revalidatePath("/dashboard");
    return { activityId: id };
  } else {
    // Create
    const newId = nextActivityId();
    const num = Number(newId.slice(4));
    const newActivity: Activity = {
      id: newId,
      code: `ACT-${String(num).padStart(5, "0")}`,
      programmeId: project.programmeId,
      projectId,
      title,
      description,
      activityType,
      startDate,
      endDate,
      villageId,
      targetParticipants,
      status,
      expenditure,
      location,
      resourcePersons,
      outputsResults,
      noParticipantsReason,
    };
    db.activities.push(newActivity);
    revalidatePath("/activities");
    revalidatePath("/dashboard");
    return { activityId: newId };
  }
}

export type ParticipantActionState = { error?: string; ok?: boolean };

export async function addParticipant(
  _prev: ParticipantActionState,
  formData: FormData,
): Promise<ParticipantActionState> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return { error: "Not permitted." };

  const activityId = String(formData.get("activityId") ?? "").trim();
  const beneficiaryId = String(formData.get("beneficiaryId") ?? "").trim();
  if (!activityId || !beneficiaryId) return { error: "Missing fields." };

  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity) return { error: "Activity not found." };
  if (isLocked(activity, profile.role)) return { error: "Activity is locked." };

  const existing = db.participants.find((p) => p.activityId === activityId && p.beneficiaryId === beneficiaryId);
  if (existing) return { error: "Already added." };

  db.participants.push({ activityId, beneficiaryId, attended: false });
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function bulkAddByVillage(
  _prev: ParticipantActionState,
  formData: FormData,
): Promise<ParticipantActionState> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return { error: "Not permitted." };

  const activityId = String(formData.get("activityId") ?? "").trim();
  const villageId = String(formData.get("villageId") ?? "").trim();
  if (!activityId) return { error: "Missing activity." };

  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity) return { error: "Activity not found." };
  if (isLocked(activity, profile.role)) return { error: "Activity is locked." };

  const toAdd = beneficiariesForVillage(activityId, villageId || activity.villageId);
  for (const b of toAdd) {
    db.participants.push({ activityId, beneficiaryId: b.id, attended: false });
  }
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleAttendance(
  _prev: ParticipantActionState,
  formData: FormData,
): Promise<ParticipantActionState> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return { error: "Not permitted." };

  const activityId = String(formData.get("activityId") ?? "").trim();
  const beneficiaryId = String(formData.get("beneficiaryId") ?? "").trim();
  const attended = formData.get("attended") === "1";

  const idx = db.participants.findIndex((p) => p.activityId === activityId && p.beneficiaryId === beneficiaryId);
  if (idx < 0) return { error: "Participant not found." };

  const activity = db.activities.find((a) => a.id === activityId);
  if (activity && isLocked(activity, profile.role)) return { error: "Activity is locked." };

  db.participants[idx] = { ...db.participants[idx]!, attended };
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeParticipant(
  _prev: ParticipantActionState,
  formData: FormData,
): Promise<ParticipantActionState> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return { error: "Not permitted." };

  const activityId = String(formData.get("activityId") ?? "").trim();
  const beneficiaryId = String(formData.get("beneficiaryId") ?? "").trim();

  const activity = db.activities.find((a) => a.id === activityId);
  if (activity && isLocked(activity, profile.role)) return { error: "Activity is locked." };

  const idx = db.participants.findIndex((p) => p.activityId === activityId && p.beneficiaryId === beneficiaryId);
  if (idx >= 0) db.participants.splice(idx, 1);

  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Staff and attachments are fire-and-forget forms: the page re-renders from state. */
export async function assignStaff(formData: FormData): Promise<void> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return;

  const activityId = String(formData.get("activityId") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity || !employeeId || isLocked(activity, profile.role)) return;
  if (!db.employees.some((e) => e.id === employeeId)) return;
  if (db.activityStaff.some((s) => s.activityId === activityId && s.employeeId === employeeId)) return;

  db.activityStaff.push({ activityId, employeeId });
  revalidatePath(`/activities/${activityId}`);
}

export async function removeStaff(formData: FormData): Promise<void> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return;

  const activityId = String(formData.get("activityId") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity || isLocked(activity, profile.role)) return;

  const idx = db.activityStaff.findIndex((s) => s.activityId === activityId && s.employeeId === employeeId);
  if (idx >= 0) db.activityStaff.splice(idx, 1);
  revalidatePath(`/activities/${activityId}`);
}

export async function addAttachment(formData: FormData): Promise<void> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return;

  const activityId = String(formData.get("activityId") ?? "").trim();
  const file = formData.get("file");
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity || isLocked(activity, profile.role)) return;
  if (!(file instanceof File) || !file.name) return;

  db.activityAttachments.push({
    id: `att-${Date.now()}-${db.activityAttachments.length + 1}`,
    activityId,
    // Name only: a prototype never holds the org's files.
    filePath: file.name,
    kind: /\.(jpe?g|png|webp|gif|heic)$/i.test(file.name) ? "photo" : "document",
    caption: String(formData.get("caption") ?? "").trim(),
  });
  revalidatePath(`/activities/${activityId}`);
}

export async function removeAttachment(formData: FormData): Promise<void> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return;

  const activityId = String(formData.get("activityId") ?? "").trim();
  const attachmentId = String(formData.get("attachmentId") ?? "").trim();
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity || isLocked(activity, profile.role)) return;

  const idx = db.activityAttachments.findIndex((x) => x.id === attachmentId && x.activityId === activityId);
  if (idx >= 0) db.activityAttachments.splice(idx, 1);
  revalidatePath(`/activities/${activityId}`);
}
