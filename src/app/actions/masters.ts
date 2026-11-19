"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import type {
  AuditEntry,
  Donor,
  Project,
  ProjectStatus,
  Programme,
  RecordStatus,
  Village,
} from "@/lib/data/types";
import {
  asEntity,
  asList,
  canArchive,
  canCreate,
  canEdit,
  formFields,
  type MasterEntity,
  type MasterValues,
  validateMaster,
} from "@/lib/masters";
import { requireSession } from "@/lib/session";
import { scopeForRole } from "@/lib/rbac";

export type SaveState = { error?: string; fieldErrors?: Record<string, string>; values?: MasterValues };

const EMPTY_OPTIONS = { donors: [], programmes: [], villages: [], employees: [] };

/** Only the fields the entity defines, so a stray form field cannot reach the store. */
function readValues(entity: MasterEntity, formData: FormData): MasterValues {
  const values: MasterValues = {};
  for (const field of formFields(entity, EMPTY_OPTIONS)) {
    values[field.name] =
      field.type === "checkboxes"
        ? asList(formData.getAll(field.name).map(String))
        : String(formData.get(field.name) ?? "");
  }
  return values;
}

const text = (values: MasterValues, name: string) => String(values[name] ?? "").trim();
const num = (values: MasterValues, name: string) => Number(text(values, name) || 0);
const status = (values: MasterValues, name: string, fallback: string) => text(values, name) || fallback;

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function nextCode(codes: string[], fallbackPrefix: string) {
  const prefix = codes[0]?.split("-")[0] ?? fallbackPrefix;
  const max = codes.reduce((highest, code) => Math.max(highest, Number(code.split("-")[1]) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function writeAudit(
  actor: { id: string; fullName: string },
  action: AuditEntry["action"],
  tableName: string,
  recordId: string,
) {
  db.audit.push({
    id: `aud-${tableName}-${Date.now()}`,
    actorId: actor.id,
    actorName: actor.fullName,
    action,
    tableName,
    recordId,
    at: new Date().toISOString(),
  });
}

/**
 * Create or update one master record. Codes are generated here and are never
 * editable (PRD §7.2), and a non-admin can only update what §5.1 grants them
 * inside their own scope.
 */
export async function saveMaster(_previous: SaveState, formData: FormData): Promise<SaveState> {
  const profile = await requireSession();
  const entity = asEntity(formData.get("entity"));
  if (!entity) return { error: "That record type does not exist." };

  const id = String(formData.get("id") ?? "");
  const values = readValues(entity, formData);
  const fieldErrors = validateMaster(entity, values);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  if (id ? !canEdit(profile.role, entity) : !canCreate(profile.role)) {
    return { error: "Your role can view these records but not change them.", values };
  }

  const scope = scopeForRole(profile.id, profile.role);
  if (id) {
    if (entity === "projects" && scope.projectIds !== null && !scope.projectIds.includes(id)) {
      return { error: "That project is outside your scope.", values };
    }
    if (entity === "programmes" && scope.programmeIds !== null && !scope.programmeIds.includes(id)) {
      return { error: "That programme is outside your scope.", values };
    }
  }

  let recordId = id;

  if (entity === "villages") {
    const patch = {
      name: text(values, "name"),
      panchayat: text(values, "panchayat"),
      block: text(values, "block"),
      district: text(values, "district"),
      state: text(values, "state") || "Maharashtra",
      population: text(values, "population") ? num(values, "population") : null,
      status: status(values, "status", "active") as RecordStatus,
    };
    const existing = db.villages.find((v) => v.id === id);
    if (existing) Object.assign(existing, patch);
    else {
      recordId = newId("vil");
      const record: Village = {
        id: recordId,
        code: nextCode(db.villages.map((v) => v.code), "VIL"),
        ...patch,
      };
      db.villages.push(record);
    }
  }

  if (entity === "donors") {
    const patch = {
      name: text(values, "name"),
      donorType: text(values, "donorType"),
      contactPerson: text(values, "contactPerson"),
      email: text(values, "email"),
      phone: text(values, "phone"),
      grantStart: text(values, "grantStart"),
      grantEnd: text(values, "grantEnd"),
      approvedBudget: num(values, "approvedBudget"),
      status: status(values, "status", "active") as RecordStatus,
    };
    const existing = db.donors.find((d) => d.id === id);
    if (existing) Object.assign(existing, patch);
    else {
      recordId = newId("don");
      const record: Donor = {
        id: recordId,
        code: nextCode(db.donors.map((d) => d.code), "DON"),
        ...patch,
      };
      db.donors.push(record);
    }
  }

  if (entity === "programmes") {
    const patch = {
      name: text(values, "name"),
      focusArea: text(values, "focusArea"),
      description: text(values, "description"),
      coordinatorId: text(values, "coordinatorId") || null,
      startDate: text(values, "startDate"),
      endDate: text(values, "endDate") || null,
      status: status(values, "status", "active") as RecordStatus,
    };
    const existing = db.programmes.find((p) => p.id === id);
    if (existing) Object.assign(existing, patch);
    else {
      recordId = newId("prg");
      const record: Programme = {
        id: recordId,
        code: nextCode(db.programmes.map((p) => p.code), "PRG"),
        ...patch,
      };
      db.programmes.push(record);
    }
  }

  if (entity === "projects") {
    const patch = {
      name: text(values, "name"),
      donorId: text(values, "donorId"),
      programmeId: text(values, "programmeId"),
      coordinatorId: text(values, "coordinatorId") || null,
      startDate: text(values, "startDate"),
      endDate: text(values, "endDate"),
      approvedBudget: num(values, "approvedBudget"),
      targetBeneficiaries: num(values, "targetBeneficiaries"),
      status: status(values, "status", "draft") as ProjectStatus,
      villageIds: asList(values.villageIds),
    };
    const existing = db.projects.find((p) => p.id === id);
    if (existing) Object.assign(existing, patch);
    else {
      recordId = newId("prj");
      const record: Project = {
        id: recordId,
        code: nextCode(db.projects.map((p) => p.code), "PRJ"),
        ...patch,
      };
      db.projects.push(record);
    }
  }

  writeAudit(profile, id ? "update" : "create", entity, recordId);
  revalidatePath(`/${entity}`);
  revalidatePath(`/${entity}/${recordId}`);
  revalidatePath("/dashboard");
  redirect(`/${entity}?saved=${id ? "updated" : "created"}`);
}

/** Archive keeps the record and its history; it only leaves the pickers (PRD §7.2). */
export async function archiveMaster(formData: FormData) {
  const profile = await requireSession();
  const entity = asEntity(formData.get("entity"));
  const id = String(formData.get("id") ?? "");
  if (!entity || !id) redirect("/dashboard");
  if (!canArchive(profile.role)) redirect(`/${entity}/${id}?error=role`);

  const archive = <T extends { id: string; status: string }>(rows: T[]) => {
    const row = rows.find((item) => item.id === id);
    if (row) row.status = "archived";
    return Boolean(row);
  };

  const archived =
    entity === "projects"
      ? archive(db.projects)
      : entity === "programmes"
        ? archive(db.programmes)
        : entity === "donors"
          ? archive(db.donors)
          : archive(db.villages);

  if (archived) writeAudit(profile, "delete", entity, id);
  revalidatePath(`/${entity}`);
  redirect(`/${entity}/${id}?archived=1`);
}

/** Record a grant disbursement / tranche from a donor to a project (WF-01). */
export async function recordDisbursement(formData: FormData) {
  const profile = await requireSession();
  const allowed = profile.role === "admin" || profile.role === "finance" || canEdit(profile.role, "donors");
  if (!allowed) {
    throw new Error("Unauthorized to record disbursements.");
  }

  const donorId = String(formData.get("donorId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const disbursedOn = String(formData.get("disbursedOn") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const notes = String(formData.get("notes") ?? "").trim();

  if (!donorId || !projectId || amount <= 0) {
    throw new Error("Invalid disbursement details. Project and positive amount are required.");
  }

  const disbursementId = newId("dsb");
  if (!db.donorDisbursements) {
    db.donorDisbursements = [];
  }
  db.donorDisbursements.push({
    id: disbursementId,
    donorId,
    projectId,
    amount,
    disbursedOn,
    notes,
    recordedBy: profile.id,
    recordedAt: new Date().toISOString(),
  });

  writeAudit(profile, "create", "donor_disbursements", disbursementId);
  revalidatePath(`/donors/${donorId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(`/donors/${donorId}?disbursed=1`);
}
