"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/data/store";
import type { AuditEntry, Indicator, IndicatorValue, RecordStatus } from "@/lib/data/types";
import { INDICATOR_WRITE_ROLES, nextIndicatorId, nextIndicatorValueId } from "@/lib/queries/mel";
import { scopeForRole } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

const FREQUENCIES: Indicator["reportingFrequency"][] = ["monthly", "quarterly", "half_yearly", "annual"];
const RECORD_STATUSES: RecordStatus[] = ["active", "inactive", "archived"];

function canWrite(role: string): boolean {
  return (INDICATOR_WRITE_ROLES as readonly string[]).includes(role);
}

function writeAudit(
  actor: { id: string; fullName: string },
  action: AuditEntry["action"],
  tableName: string,
  recordId: string,
) {
  db.audit.push({
    id: `aud-${tableName}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    actorId: actor.id,
    actorName: actor.fullName,
    action,
    tableName,
    recordId,
    at: new Date().toISOString(),
  });
}

function revalidateIndicatorPaths(projectId: string) {
  revalidatePath("/mel");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
}

export type IndicatorSaveState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  indicatorId?: string;
};

/**
 * Create or update one indicator (PRD §4.8). The code is generated here and is
 * never editable, and only the fields the schema defines are read from the form.
 */
export async function saveIndicator(
  _prev: IndicatorSaveState,
  formData: FormData,
): Promise<IndicatorSaveState> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return { error: "Only the MEL officer or the Executive Director can maintain indicators." };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dataSource = String(formData.get("dataSource") ?? "").trim();
  const responsibleEmployeeId = String(formData.get("responsibleEmployeeId") ?? "").trim();
  const baseline = Number(formData.get("baseline") ?? 0);
  const target = Number(formData.get("target") ?? 0);
  const reportingFrequency = String(formData.get("reportingFrequency") ?? "") as Indicator["reportingFrequency"];
  const genderDisaggregated = formData.get("genderDisaggregated") === "1";
  const status = (String(formData.get("status") ?? "active").trim() || "active") as RecordStatus;

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Indicator name is required.";
  if (!projectId) errors.projectId = "Project is required.";
  if (!unit) errors.unit = "Unit is required, e.g. farmers, acres, persons.";
  if (!FREQUENCIES.includes(reportingFrequency)) errors.reportingFrequency = "Reporting frequency is required.";
  if (!RECORD_STATUSES.includes(status)) errors.status = "Choose a valid record status.";
  if (!Number.isFinite(baseline) || baseline < 0) errors.baseline = "Baseline must be a number of 0 or more.";
  if (!Number.isFinite(target) || target <= 0) errors.target = "Target must be a number greater than 0.";
  if (Object.keys(errors).length) return { fieldErrors: errors };

  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return { error: "Project not found." };

  const scope = scopeForRole(profile.id, profile.role);
  if (scope.projectIds && !scope.projectIds.includes(projectId)) {
    return { error: "That project is outside your scope." };
  }

  if (responsibleEmployeeId && !db.employees.some((e) => e.id === responsibleEmployeeId)) {
    return { fieldErrors: { responsibleEmployeeId: "Choose an employee from the list." } };
  }

  const fields = {
    name,
    projectId,
    unit,
    description,
    dataSource,
    responsibleEmployeeId: responsibleEmployeeId || null,
    baseline,
    target,
    reportingFrequency,
    genderDisaggregated,
    status,
  };

  if (id) {
    const index = db.indicators.findIndex((i) => i.id === id);
    if (index < 0) return { error: "Indicator not found." };
    const existing = db.indicators[index]!;
    if (scope.projectIds && !scope.projectIds.includes(existing.projectId)) {
      return { error: "That indicator is outside your scope." };
    }
    db.indicators[index] = { ...existing, ...fields };
    writeAudit(profile, "update", "indicators", id);
    revalidateIndicatorPaths(existing.projectId);
    if (existing.projectId !== projectId) revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/mel/${id}`);
    return { indicatorId: id };
  }

  const newId = nextIndicatorId();
  const num = Number(newId.slice(4)) || db.indicators.length + 1;
  const indicator: Indicator = {
    id: newId,
    code: `IND-${String(num).padStart(3, "0")}`,
    ...fields,
  };
  db.indicators.push(indicator);
  writeAudit(profile, "create", "indicators", newId);
  revalidateIndicatorPaths(projectId);
  return { indicatorId: newId };
}

export type IndicatorValueState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  valueId?: string;
};

/**
 * Record one period value (PRD §7.8 / §4.8): `entered_by` and `entered_at` come
 * from the session, and when the indicator is gender-disaggregated the male and
 * female values must add up to the total.
 */
export async function saveIndicatorValue(
  _prev: IndicatorValueState,
  formData: FormData,
): Promise<IndicatorValueState> {
  const profile = await requireSession();
  if (!canWrite(profile.role)) return { error: "Only the MEL officer or the Executive Director can enter values." };

  const indicatorId = String(formData.get("indicatorId") ?? "").trim();
  const valueId = String(formData.get("valueId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = Number(valueRaw);
  const maleRaw = String(formData.get("maleValue") ?? "").trim();
  const femaleRaw = String(formData.get("femaleValue") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();

  const indicator = db.indicators.find((i) => i.id === indicatorId);
  if (!indicator) return { error: "Indicator not found." };

  const scope = scopeForRole(profile.id, profile.role);
  if (scope.projectIds && !scope.projectIds.includes(indicator.projectId)) {
    return { error: "That indicator is outside your scope." };
  }

  const errors: Record<string, string> = {};
  if (!periodStart) errors.periodStart = "Period start is required.";
  if (!periodEnd) errors.periodEnd = "Period end is required.";
  if (periodStart && periodEnd && periodEnd < periodStart) {
    errors.periodEnd = "Period end cannot be before the period start.";
  }
  if (!valueRaw || !Number.isFinite(value) || value < 0) {
    errors.value = "Enter the value as a number of 0 or more.";
  }

  let maleValue: number | null = null;
  let femaleValue: number | null = null;
  if (indicator.genderDisaggregated) {
    if (!maleRaw) errors.maleValue = "Male value is required for a gender-disaggregated indicator.";
    if (!femaleRaw) errors.femaleValue = "Female value is required for a gender-disaggregated indicator.";
    maleValue = maleRaw ? Number(maleRaw) : null;
    femaleValue = femaleRaw ? Number(femaleRaw) : null;
    if (maleValue !== null && (!Number.isFinite(maleValue) || maleValue < 0)) {
      errors.maleValue = "Male value must be a number of 0 or more.";
    }
    if (femaleValue !== null && (!Number.isFinite(femaleValue) || femaleValue < 0)) {
      errors.femaleValue = "Female value must be a number of 0 or more.";
    }
    if (!errors.maleValue && !errors.femaleValue && !errors.value && maleValue! + femaleValue! !== value) {
      errors.maleValue = `Male + female must add up to the total (${maleValue! + femaleValue!} entered, ${value} expected).`;
    }
  }
  if (Object.keys(errors).length) return { fieldErrors: errors };

  // PRD §4.8 unique (indicator_id, period_start, period_end).
  const duplicate = db.indicatorValues.find(
    (v) =>
      v.indicatorId === indicatorId &&
      v.periodStart === periodStart &&
      v.periodEnd === periodEnd &&
      v.id !== valueId,
  );
  if (duplicate) {
    return { fieldErrors: { periodStart: "A value already exists for this period. Open that period to edit it." } };
  }

  const stamp = new Date().toISOString();

  if (valueId) {
    const index = db.indicatorValues.findIndex((v) => v.id === valueId && v.indicatorId === indicatorId);
    if (index < 0) return { error: "That period value no longer exists." };
    const existing = db.indicatorValues[index]!;
    db.indicatorValues[index] = {
      ...existing,
      periodStart,
      periodEnd,
      value,
      maleValue,
      femaleValue,
      remarks,
      // The person who last touched the number is the one recorded against it.
      enteredBy: profile.id,
      enteredAt: stamp,
    };
    writeAudit(profile, "update", "indicator_values", valueId);
    revalidateIndicatorPaths(indicator.projectId);
    revalidatePath(`/mel/${indicatorId}`);
    return { ok: true, valueId };
  }

  const newValue: IndicatorValue = {
    id: nextIndicatorValueId(),
    indicatorId,
    periodStart,
    periodEnd,
    value,
    maleValue,
    femaleValue,
    remarks,
    enteredBy: profile.id,
    enteredAt: stamp,
  };
  db.indicatorValues.push(newValue);
  writeAudit(profile, "create", "indicator_values", newValue.id);
  revalidateIndicatorPaths(indicator.projectId);
  revalidatePath(`/mel/${indicatorId}`);
  return { ok: true, valueId: newValue.id };
}
