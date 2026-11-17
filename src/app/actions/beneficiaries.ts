"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import type { Beneficiary, Gender, RecordStatus } from "@/lib/data/types";
import {
  canArchiveBeneficiary,
  canCreateBeneficiary,
  canEditBeneficiary,
  type BeneficiaryFormValues,
  type DuplicateMatch,
  validateBeneficiary,
} from "@/lib/beneficiaries";
import { findDuplicates } from "@/lib/queries/beneficiaries";
import { requireSession } from "@/lib/session";
import { scopeForRole } from "@/lib/rbac";

export type BeneficiarySaveState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  duplicateWarning?: {
    matches: DuplicateMatch[];
    count: number;
  };
  values?: BeneficiaryFormValues;
};

function readFormValues(formData: FormData): BeneficiaryFormValues {
  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    fullName: String(formData.get("fullName") ?? "").trim(),
    gender: (String(formData.get("gender") ?? "").trim() as Gender) || "",
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim(),
    mobile: String(formData.get("mobile") ?? "").trim(),
    villageId: String(formData.get("villageId") ?? "").trim(),
    idProofType: String(formData.get("idProofType") ?? "").trim(),
    idProofLast4: String(formData.get("idProofLast4") ?? "").trim(),
    photoPath: String(formData.get("photoPath") ?? "").trim() || undefined,
    projectIds: formData.getAll("projectIds").map(String).filter(Boolean),
    consentGiven: String(formData.get("consentGiven") ?? ""),
    allowDuplicate: String(formData.get("allowDuplicate") ?? ""),
    duplicateReason: String(formData.get("duplicateReason") ?? "").trim(),
  };
}

export async function saveBeneficiary(
  _previous: BeneficiarySaveState,
  formData: FormData
): Promise<BeneficiarySaveState> {
  const profile = await requireSession();
  const values = readFormValues(formData);
  const isNew = !values.id;

  if (isNew ? !canCreateBeneficiary(profile.role) : !canEditBeneficiary(profile.role)) {
    return { error: "Your role is not permitted to register or edit beneficiaries.", values };
  }

  // Role scope validation (PRD §5.2)
  const scope = scopeForRole(profile.id, profile.role);
  if (scope.villageIds !== null && !scope.villageIds.includes(values.villageId)) {
    return {
      fieldErrors: { villageId: "Selected village is outside your assigned scope." },
      values,
    };
  }

  // Field validation
  const fieldErrors = validateBeneficiary(values, isNew);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  // Duplicate check (PRD §7.3)
  const matches = findDuplicates(values.mobile, values.idProofType, values.idProofLast4, values.id);
  if (matches.length > 0 && values.allowDuplicate !== "true") {
    return {
      duplicateWarning: {
        matches,
        count: matches.length,
      },
      values,
    };
  }

  let beneficiaryId = values.id;

  if (isNew) {
    // Generate next sequential code
    const maxCodeNum = db.beneficiaries.reduce((max, b) => {
      const numPart = Number(b.code.replace(/\D/g, "")) || 0;
      return Math.max(max, numPart);
    }, 0);
    const code = `BEN-${String(maxCodeNum + 1).padStart(6, "0")}`;
    beneficiaryId = `ben-${Date.now().toString(36)}`;

    const newRecord: Beneficiary = {
      id: beneficiaryId,
      code,
      fullName: values.fullName,
      gender: values.gender as Gender,
      dateOfBirth: values.dateOfBirth || null,
      mobile: values.mobile.replace(/\D/g, ""),
      villageId: values.villageId,
      enrolmentDate: new Date().toISOString(),
      status: "active",
      idProofType: (values.idProofType as any) || null,
      idProofLast4: values.idProofLast4 || null,
      photoPath: values.photoPath || null,
      projectIds: values.projectIds,
      consentGivenOn: new Date().toISOString(),
    };

    db.beneficiaries.push(newRecord);

    db.audit.push({
      id: `aud-ben-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "create",
      tableName: "beneficiaries",
      recordId: beneficiaryId,
      at: new Date().toISOString(),
    });
  } else {
    // Update existing
    const existingIndex = db.beneficiaries.findIndex((b) => b.id === values.id);
    if (existingIndex === -1) {
      return { error: "Beneficiary record was not found.", values };
    }

    const current = db.beneficiaries[existingIndex]!;
    db.beneficiaries[existingIndex] = {
      ...current,
      fullName: values.fullName,
      gender: values.gender as Gender,
      dateOfBirth: values.dateOfBirth || null,
      mobile: values.mobile.replace(/\D/g, ""),
      villageId: values.villageId,
      idProofType: (values.idProofType as any) || null,
      idProofLast4: values.idProofLast4 || null,
      photoPath: values.photoPath !== undefined ? (values.photoPath || null) : current.photoPath,
      projectIds: values.projectIds,
    };

    db.audit.push({
      id: `aud-ben-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "update",
      tableName: "beneficiaries",
      recordId: values.id!,
      at: new Date().toISOString(),
    });
  }

  revalidatePath("/beneficiaries");
  revalidatePath("/dashboard");
  redirect(`/beneficiaries/${beneficiaryId}`);
}

export async function archiveBeneficiary(formData: FormData) {
  const profile = await requireSession();
  if (!canArchiveBeneficiary(profile.role)) {
    throw new Error("Only administrators can archive beneficiaries.");
  }

  const id = String(formData.get("id") ?? "");
  const target = db.beneficiaries.find((b) => b.id === id);
  if (!target) throw new Error("Beneficiary not found.");

  target.status = "archived";

  db.audit.push({
    id: `aud-ben-arc-${Date.now()}`,
    actorId: profile.id,
    actorName: profile.fullName,
    action: "delete",
    tableName: "beneficiaries",
    recordId: id,
    at: new Date().toISOString(),
  });

  revalidatePath("/beneficiaries");
  revalidatePath("/dashboard");
  redirect("/beneficiaries");
}

/** Check duplicate mobile on blur (IG-02 / PRD §7.3). */
export async function checkDuplicateMobile(mobile: string, excludeId?: string): Promise<DuplicateMatch[]> {
  await requireSession();
  if (!mobile || mobile.replace(/\D/g, "").length !== 10) return [];
  return findDuplicates(mobile, null, null, excludeId);
}

