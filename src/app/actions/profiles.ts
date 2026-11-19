"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import type { Farmer, PwdProfile, Shg, ShgMember, SavingsTransaction, PwdFollowup, RecordStatus } from "@/lib/data/types";
import {
  canCreateFarmer,
  canEditFarmer,
  canCreateShg,
  canEditShg,
  canRecordShgSavings,
  canCreatePwd,
  canEditPwd,
  validateFarmer,
  validateShg,
  validatePwd,
  type FarmerFormValues,
  type ShgFormValues,
  type PwdFormValues,
} from "@/lib/profiles";
import { requireSession } from "@/lib/session";

export type ProfileSaveState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

/* ------------------------------------------------------------------ */
/* FARMER ACTIONS                                                     */
/* ------------------------------------------------------------------ */

export async function saveFarmerProfile(
  _previous: ProfileSaveState,
  formData: FormData
): Promise<ProfileSaveState> {
  const profile = await requireSession();
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const isNew = !id;

  if (isNew ? !canCreateFarmer(profile.role) : !canEditFarmer(profile.role)) {
    return { error: "Your role is not permitted to modify farmer profiles." };
  }

  const cropsRaw = formData.getAll("crop_name").map(String);
  const seasonsRaw = formData.getAll("crop_season").map(String);
  const areasRaw = formData.getAll("crop_area").map(Number);

  const crops = cropsRaw.map((crop, i) => ({
    season: (seasonsRaw[i] as any) || "kharif",
    crop,
    areaAcres: areasRaw[i] || 0,
  })).filter((c) => c.crop.trim().length > 0);

  const values: FarmerFormValues = {
    id,
    beneficiaryId: String(formData.get("beneficiaryId") ?? "").trim(),
    landHoldingAcres: String(formData.get("landHoldingAcres") ?? "").trim(),
    landOwnership: (String(formData.get("landOwnership") ?? "") as any) || "",
    farmingType: (String(formData.get("farmingType") ?? "") as any) || "",
    organicStatus: (String(formData.get("organicStatus") ?? "") as any) || "",
    irrigationSource: String(formData.get("irrigationSource") ?? "").trim(),
    trainingDetails: String(formData.get("trainingDetails") ?? "").trim(),
    enrolmentDate: String(formData.get("enrolmentDate") ?? "").trim(),
    farmerGroup: String(formData.get("farmerGroup") ?? "").trim(),
    status: (String(formData.get("status") ?? "").trim() as RecordStatus) || "active",
    organicPractices: String(formData.get("organicPractices") ?? "").trim(),
    supportReceived: String(formData.get("supportReceived") ?? "").trim(),
    equipmentReceived: String(formData.get("equipmentReceived") ?? "").trim(),
    gpsLatitude: String(formData.get("gpsLatitude") ?? "").trim(),
    gpsLongitude: String(formData.get("gpsLongitude") ?? "").trim(),
    followupNotes: String(formData.get("followupNotes") ?? "").trim(),
    crops,
  };

  const fieldErrors = validateFarmer(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // Unique constraint: 1 farmer profile per beneficiary (PRD §7.3 acceptance)
  const existingForBen = db.farmers.find(
    (f) => f.beneficiaryId === values.beneficiaryId && f.id !== id
  );
  if (existingForBen) {
    return { error: "A farmer profile already exists for this beneficiary." };
  }

  let farmerId = id;
  if (isNew) {
    const maxNum = db.farmers.reduce((max, f) => {
      const n = Number(f.code.replace(/\D/g, "")) || 0;
      return Math.max(max, n);
    }, 0);
    const code = `FRM-${String(maxNum + 1).padStart(5, "0")}`;
    farmerId = `frm-${Date.now().toString(36)}`;

    const newFarmer: Farmer = {
      id: farmerId,
      code,
      beneficiaryId: values.beneficiaryId,
      landHoldingAcres: Number(values.landHoldingAcres),
      landOwnership: values.landOwnership as any,
      farmingType: values.farmingType as any,
      organicStatus: values.organicStatus as any,
      irrigationSource: values.irrigationSource,
      trainingDetails: values.trainingDetails,
      enrolmentDate: values.enrolmentDate ? new Date(values.enrolmentDate).toISOString() : new Date().toISOString(),
      farmerGroup: values.farmerGroup || null,
      organicPractices: values.organicPractices,
      supportReceived: values.supportReceived,
      equipmentReceived: values.equipmentReceived,
      gpsLatitude: values.gpsLatitude ? Number(values.gpsLatitude) : null,
      gpsLongitude: values.gpsLongitude ? Number(values.gpsLongitude) : null,
      followupNotes: values.followupNotes,
      status: values.status === "inactive" ? "inactive" : "active",
      crops: values.crops,
    };

    db.farmers.push(newFarmer);
    db.audit.push({
      id: `aud-frm-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "create",
      tableName: "farmers",
      recordId: farmerId,
      at: new Date().toISOString(),
    });
  } else {
    const idx = db.farmers.findIndex((f) => f.id === id);
    if (idx === -1) return { error: "Farmer record not found." };

    const current = db.farmers[idx]!;
    db.farmers[idx] = {
      ...current,
      beneficiaryId: values.beneficiaryId,
      landHoldingAcres: Number(values.landHoldingAcres),
      landOwnership: values.landOwnership as any,
      farmingType: values.farmingType as any,
      organicStatus: values.organicStatus as any,
      irrigationSource: values.irrigationSource,
      trainingDetails: values.trainingDetails,
      enrolmentDate: values.enrolmentDate ? new Date(values.enrolmentDate).toISOString() : current.enrolmentDate,
      farmerGroup: values.farmerGroup || null,
      organicPractices: values.organicPractices,
      supportReceived: values.supportReceived,
      equipmentReceived: values.equipmentReceived,
      gpsLatitude: values.gpsLatitude ? Number(values.gpsLatitude) : null,
      gpsLongitude: values.gpsLongitude ? Number(values.gpsLongitude) : null,
      followupNotes: values.followupNotes,
      status: values.status === "inactive" ? "inactive" : "active",
      crops: values.crops,
    };

    db.audit.push({
      id: `aud-frm-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "update",
      tableName: "farmers",
      recordId: id!,
      at: new Date().toISOString(),
    });
  }

  revalidatePath("/farmers");
  revalidatePath(`/beneficiaries/${values.beneficiaryId}`);
  revalidatePath("/dashboard");
  redirect(`/beneficiaries/${values.beneficiaryId}?tab=farmer`);
}

/* ------------------------------------------------------------------ */
/* SHG ACTIONS                                                        */
/* ------------------------------------------------------------------ */

export async function saveShg(
  _previous: ProfileSaveState,
  formData: FormData
): Promise<ProfileSaveState> {
  const profile = await requireSession();
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const isNew = !id;

  if (isNew ? !canCreateShg(profile.role) : !canEditShg(profile.role)) {
    return { error: "Your role is not permitted to manage Self-Help Groups." };
  }

  const values: ShgFormValues = {
    id,
    name: String(formData.get("name") ?? "").trim(),
    villageId: String(formData.get("villageId") ?? "").trim(),
    formationDate: String(formData.get("formationDate") ?? "").trim(),
    meetingFrequency: (String(formData.get("meetingFrequency") ?? "") as any) || "",
    numberOfMembers: String(formData.get("numberOfMembers") ?? "").trim(),
    livelihoodActivity: String(formData.get("livelihoodActivity") ?? "").trim(),
    bankName: String(formData.get("bankName") ?? "").trim(),
    bankAccountNo: String(formData.get("bankAccountNo") ?? "").trim(),
    ifscCode: String(formData.get("ifscCode") ?? "").trim(),
    bankLinkageDate: String(formData.get("bankLinkageDate") ?? "").trim(),
    supportReceived: String(formData.get("supportReceived") ?? "").trim(),
    projectIds: formData.getAll("projectIds").map(String).filter(Boolean),
  };

  const fieldErrors = validateShg(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let shgId = id;
  if (isNew) {
    const maxNum = db.shgs.reduce((max, s) => {
      const n = Number(s.code.replace(/\D/g, "")) || 0;
      return Math.max(max, n);
    }, 0);
    const code = `SHG-${String(maxNum + 1).padStart(4, "0")}`;
    shgId = `shg-${Date.now().toString(36)}`;

    const newShg: Shg = {
      id: shgId,
      code,
      name: values.name,
      villageId: values.villageId,
      formationDate: values.formationDate,
      meetingFrequency: values.meetingFrequency as any,
      numberOfMembers: Number(values.numberOfMembers),
      livelihoodActivity: values.livelihoodActivity,
      bankName: values.bankName,
      bankAccountNo: values.bankAccountNo,
      ifscCode: values.ifscCode,
      bankLinkageDate: values.bankLinkageDate,
      supportReceived: values.supportReceived,
      status: "active",
      projectIds: values.projectIds,
    };

    db.shgs.push(newShg);
    db.audit.push({
      id: `aud-shg-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "create",
      tableName: "shgs",
      recordId: shgId,
      at: new Date().toISOString(),
    });
  } else {
    const idx = db.shgs.findIndex((s) => s.id === id);
    if (idx === -1) return { error: "SHG record not found." };
    const current = db.shgs[idx]!;
    db.shgs[idx] = {
      ...current,
      name: values.name,
      villageId: values.villageId,
      formationDate: values.formationDate,
      meetingFrequency: values.meetingFrequency as any,
      numberOfMembers: Number(values.numberOfMembers),
      livelihoodActivity: values.livelihoodActivity,
      bankName: values.bankName,
      bankAccountNo: values.bankAccountNo,
      ifscCode: values.ifscCode,
      bankLinkageDate: values.bankLinkageDate,
      supportReceived: values.supportReceived,
      projectIds: values.projectIds,
    };

    db.audit.push({
      id: `aud-shg-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "update",
      tableName: "shgs",
      recordId: id!,
      at: new Date().toISOString(),
    });
  }

  revalidatePath("/shgs");
  revalidatePath("/dashboard");
  redirect(`/shgs/${shgId}`);
}

export async function addShgMember(formData: FormData) {
  const profile = await requireSession();
  if (!canEditShg(profile.role)) {
    throw new Error("Unauthorized to add SHG members.");
  }

  const shgId = String(formData.get("shgId") ?? "").trim();
  const beneficiaryId = String(formData.get("beneficiaryId") ?? "").trim();
  const role = (String(formData.get("role") ?? "member") as any) || "member";
  const joinDate = String(formData.get("joinDate") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!shgId || !beneficiaryId) throw new Error("SHG and beneficiary selection are required.");

  // Unique member per SHG rule (PRD §4.7)
  const alreadyMember = db.shgMembers.some((m) => m.shgId === shgId && m.beneficiaryId === beneficiaryId && m.status === "active");
  if (alreadyMember) throw new Error("Beneficiary is already an active member of this SHG.");

  // Single leadership role rule (PRD §4.7, §7.5: only one president, secretary, treasurer)
  if (role !== "member") {
    const existingLeader = db.shgMembers.some((m) => m.shgId === shgId && m.role === role && m.status === "active");
    if (existingLeader) {
      throw new Error(`This SHG already has an active ${role}. Only one ${role} is allowed per group.`);
    }
  }

  const memberId = `shm-${Date.now().toString(36)}`;
  db.shgMembers.push({
    id: memberId,
    shgId,
    beneficiaryId,
    role,
    joinDate,
    status: "active",
    memberId: String(formData.get("memberId") ?? memberId).trim(),
    savingsBalance: Number(formData.get("savingsBalance") ?? 0) || 0,
    totalSavingsToDate: Number(formData.get("totalSavingsToDate") ?? 0) || 0,
    internalLendingStatus: String(formData.get("internalLendingStatus") ?? "active").trim(),
    bankLinkageStatus: String(formData.get("bankLinkageStatus") ?? "linked").trim(),
    loanDetails: String(formData.get("loanDetails") ?? "").trim(),
    attendanceRecords: String(formData.get("attendanceRecords") ?? "").trim(),
    trainingRecords: String(formData.get("trainingRecords") ?? "").trim(),
  });

  db.audit.push({
    id: `aud-shm-${Date.now()}`,
    actorId: profile.id,
    actorName: profile.fullName,
    action: "create",
    tableName: "shg_members",
    recordId: memberId,
    at: new Date().toISOString(),
  });

  revalidatePath(`/shgs/${shgId}`);
  revalidatePath(`/beneficiaries/${beneficiaryId}`);
  redirect(`/shgs/${shgId}?tab=members&added=1`);
}

export async function removeShgMember(formData: FormData) {
  const profile = await requireSession();
  if (!canCreateShg(profile.role)) {
    throw new Error("Unauthorized to manage SHG members.");
  }

  const memberId = String(formData.get("memberId") ?? "").trim();
  const shgId = String(formData.get("shgId") ?? "").trim();
  if (!memberId || !shgId) throw new Error("Missing member or group ID.");

  const member = db.shgMembers.find((m) => m.id === memberId && m.shgId === shgId);
  if (member) {
    member.status = "inactive"; // sets status to inactive and keeps history (PRD §7.5)
    db.audit.push({
      id: `aud-shm-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "update",
      tableName: "shg_members",
      recordId: memberId,
      at: new Date().toISOString(),
    });
  }

  revalidatePath(`/shgs/${shgId}`);
  redirect(`/shgs/${shgId}?tab=members&updated=1`);
}

export async function recordShgSavings(formData: FormData) {
  const profile = await requireSession();
  if (!canRecordShgSavings(profile.role)) {
    throw new Error("Unauthorized to record savings.");
  }

  const shgId = String(formData.get("shgId") ?? "").trim();
  const txnDate = String(formData.get("txnDate") ?? "").trim() || new Date().toISOString().slice(0, 10);

  // Read member savings inputs (PRD §7.5 meeting-wise savings grid)
  const memberIds = formData.getAll("memberId").map(String);
  const amounts = formData.getAll("amount").map(Number);
  const txnTypes = formData.getAll("txnType").map(String);

  let recordedCount = 0;
  for (let i = 0; i < memberIds.length; i++) {
    const memberId = memberIds[i];
    const amount = amounts[i] ?? 0;
    const type = (txnTypes[i] === "withdrawal" ? "withdrawal" : "deposit") as "deposit" | "withdrawal";

    if (memberId && amount > 0) {
      const svtId = `svt-${Date.now()}-${i}`;
      db.savings.push({
        id: svtId,
        shgMemberId: memberId,
        txnDate,
        txnType: type,
        amount,
      });
      recordedCount++;
    }
  }

  if (recordedCount > 0) {
    db.audit.push({
      id: `aud-svt-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "create",
      tableName: "shg_savings_transactions",
      recordId: shgId,
      at: new Date().toISOString(),
    });
  }

  revalidatePath(`/shgs/${shgId}`);
  redirect(`/shgs/${shgId}?tab=savings&saved=${recordedCount}`);
}

/* ------------------------------------------------------------------ */
/* PWD PROFILE ACTIONS (CONFIDENTIAL)                                 */
/* ------------------------------------------------------------------ */

export async function savePwdProfile(
  _previous: ProfileSaveState,
  formData: FormData
): Promise<ProfileSaveState> {
  const profile = await requireSession();
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const isNew = !id;

  if (isNew ? !canCreatePwd(profile.role) : !canEditPwd(profile.role)) {
    return { error: "Access Denied: Your role is not permitted to manage confidential PWD records." };
  }

  const values: PwdFormValues = {
    id,
    beneficiaryId: String(formData.get("beneficiaryId") ?? "").trim(),
    disabilityType: String(formData.get("disabilityType") ?? "").trim(),
    disabilityPercentage: String(formData.get("disabilityPercentage") ?? "").trim(),
    certificateNo: String(formData.get("certificateNo") ?? "").trim(),
    certificateIssueDate: String(formData.get("certificateIssueDate") ?? "").trim(),
    certificateIssuingAuthority: String(formData.get("certificateIssuingAuthority") ?? "").trim(),
    educationLevel: String(formData.get("educationLevel") ?? "").trim(),
    vocationalStatus: String(formData.get("vocationalStatus") ?? "").trim(),
    accessibilityNeeds: String(formData.get("accessibilityNeeds") ?? "").trim(),
    assistiveDevice: String(formData.get("assistiveDevice") ?? "").trim(),
    individualPlan: String(formData.get("individualPlan") ?? "").trim(),
    outcome: String(formData.get("outcome") ?? "").trim(),
  familyDetails: String(formData.get("familyDetails") ?? "").trim(),
  interventionSupport: String(formData.get("interventionSupport") ?? "").trim(),
  trainingRecords: String(formData.get("trainingRecords") ?? "").trim(),
  };

  const fieldErrors = validatePwd(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // Unique constraint: exactly 1 PWD profile per beneficiary (PRD §7.3 acceptance)
  const existingForBen = db.pwdProfiles.find(
    (p) => p.beneficiaryId === values.beneficiaryId && p.id !== id
  );
  if (existingForBen) {
    return { error: "A PWD profile already exists for this beneficiary." };
  }

  let pwdId = id;
  if (isNew) {
    const maxNum = db.pwdProfiles.reduce((max, p) => {
      const n = Number(p.code.replace(/\D/g, "")) || 0;
      return Math.max(max, n);
    }, 0);
    const code = `PWD-${String(maxNum + 1).padStart(4, "0")}`;
    pwdId = `pwd-${Date.now().toString(36)}`;

    const newPwd: PwdProfile = {
      id: pwdId,
      code,
      beneficiaryId: values.beneficiaryId,
      disabilityType: values.disabilityType,
      disabilityPercentage: Number(values.disabilityPercentage),
      certificateNo: values.certificateNo,
      certificateIssueDate: values.certificateIssueDate || null,
      certificateIssuingAuthority: values.certificateIssuingAuthority,
      educationLevel: values.educationLevel,
      vocationalStatus: values.vocationalStatus,
      accessibilityNeeds: values.accessibilityNeeds,
      assistiveDevice: values.assistiveDevice,
      individualPlan: values.individualPlan,
      outcome: values.outcome,
      familyDetails: values.familyDetails,
      interventionSupport: values.interventionSupport,
      trainingRecords: values.trainingRecords,
      status: "active",
    };

    db.pwdProfiles.push(newPwd);
    db.audit.push({
      id: `aud-pwd-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "create",
      tableName: "pwd_profiles",
      recordId: pwdId,
      at: new Date().toISOString(),
    });
  } else {
    const idx = db.pwdProfiles.findIndex((p) => p.id === id);
    if (idx === -1) return { error: "PWD profile not found." };
    const current = db.pwdProfiles[idx]!;
    db.pwdProfiles[idx] = {
      ...current,
      disabilityType: values.disabilityType,
      disabilityPercentage: Number(values.disabilityPercentage),
      certificateNo: values.certificateNo,
      certificateIssueDate: values.certificateIssueDate || null,
      certificateIssuingAuthority: values.certificateIssuingAuthority,
      educationLevel: values.educationLevel,
      vocationalStatus: values.vocationalStatus,
      accessibilityNeeds: values.accessibilityNeeds,
      assistiveDevice: values.assistiveDevice,
      individualPlan: values.individualPlan,
      outcome: values.outcome,
      familyDetails: values.familyDetails,
      interventionSupport: values.interventionSupport,
      trainingRecords: values.trainingRecords,
    };

    db.audit.push({
      id: `aud-pwd-${Date.now()}`,
      actorId: profile.id,
      actorName: profile.fullName,
      action: "update",
      tableName: "pwd_profiles",
      recordId: id!,
      at: new Date().toISOString(),
    });
  }

  revalidatePath("/pwd");
  revalidatePath(`/beneficiaries/${values.beneficiaryId}`);
  redirect(`/beneficiaries/${values.beneficiaryId}?tab=pwd`);
}

export async function addPwdFollowup(formData: FormData) {
  const profile = await requireSession();
  if (!canEditPwd(profile.role)) throw new Error("Unauthorized.");

  const pwdId = String(formData.get("pwdId") ?? "").trim();
  const beneficiaryId = String(formData.get("beneficiaryId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const followupDate = String(formData.get("followupDate") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!pwdId || !notes) throw new Error("Follow-up notes are required.");

  if (!db.pwdFollowups) db.pwdFollowups = [];
  const flwId = `flw-${Date.now().toString(36)}`;
  db.pwdFollowups.push({
    id: flwId,
    pwdId,
    followupDate,
    notes,
    recordedBy: profile.id,
  });

  db.audit.push({
    id: `aud-pwd-flw-${Date.now()}`,
    actorId: profile.id,
    actorName: profile.fullName,
    action: "create",
    tableName: "pwd_followups",
    recordId: flwId,
    at: new Date().toISOString(),
  });

  revalidatePath("/pwd");
  if (beneficiaryId) {
    revalidatePath(`/beneficiaries/${beneficiaryId}`);
    redirect(`/beneficiaries/${beneficiaryId}?tab=pwd&followup=1`);
  } else {
    redirect(`/pwd?followup=1`);
  }
}

export async function addPwdIntervention(formData: FormData) {
  const profile = await requireSession();
  if (!canCreatePwd(profile.role)) {
    throw new Error("Unauthorized to record PWD intervention.");
  }

  const pwdId = String(formData.get("pwdId") ?? "").trim();
  const beneficiaryId = String(formData.get("beneficiaryId") ?? "").trim();
  const interventionType = String(formData.get("interventionType") ?? "").trim();
  const givenOn = String(formData.get("givenOn") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const description = String(formData.get("description") ?? "").trim();

  if (!pwdId || !interventionType) {
    throw new Error("Intervention type is required.");
  }

  if (!db.pwdInterventions) db.pwdInterventions = [];
  const invId = `pwi-${Date.now().toString(36)}`;
  db.pwdInterventions.push({
    id: invId,
    pwdId,
    interventionType,
    givenOn,
    description,
  });

  db.audit.push({
    id: `aud-pwi-${Date.now()}`,
    actorId: profile.id,
    actorName: profile.fullName,
    action: "create",
    tableName: "pwd_interventions",
    recordId: invId,
    at: new Date().toISOString(),
  });

  revalidatePath(`/beneficiaries/${beneficiaryId}`);
  redirect(`/beneficiaries/${beneficiaryId}?tab=pwd&interventionAdded=1`);
}
