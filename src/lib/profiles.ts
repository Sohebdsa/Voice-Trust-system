import type { Role, RecordStatus, Farmer, PwdProfile, Shg, ShgMember } from "./data/types";

/**
 * Permissions and validators for Step 4 modules:
 * - Farmer profiles (PRD §7.4)
 * - Self-Help Groups (PRD §7.5)
 * - PWD / GAP sensitive profiles (PRD §7.6)
 */

export const canAccessFarmer = (role: Role) =>
  role === "admin" ||
  role === "programme_manager" ||
  role === "project_coordinator" ||
  role === "mel_officer" ||
  role === "field_staff" ||
  role === "data_entry";

export const canCreateFarmer = (role: Role) =>
  role === "admin" || role === "project_coordinator" || role === "field_staff" || role === "data_entry";

export const canEditFarmer = (role: Role) => canCreateFarmer(role);

export const canAccessShg = (role: Role) =>
  role === "admin" ||
  role === "programme_manager" ||
  role === "project_coordinator" ||
  role === "mel_officer" ||
  role === "field_staff" ||
  role === "data_entry";

export const canCreateShg = (role: Role) =>
  role === "admin" || role === "project_coordinator" || role === "field_staff" || role === "data_entry";

export const canEditShg = (role: Role) => canCreateShg(role);

export const canRecordShgSavings = (role: Role) => canCreateShg(role);

/**
 * PWD profiles are strictly confidential (PRD §5.1, §5.2, §7.6).
 * data_entry, hr_admin, and finance are explicitly forbidden.
 */
export const canAccessPwd = (role: Role) =>
  role === "admin" ||
  role === "programme_manager" ||
  role === "project_coordinator" ||
  role === "mel_officer" ||
  role === "field_staff";

export const canCreatePwd = (role: Role) =>
  role === "admin" || role === "field_staff" || role === "project_coordinator";

export const canEditPwd = (role: Role) => canCreatePwd(role);

/* ---------------- Form Values ---------------- */

export type FarmerFormValues = {
  id?: string;
  beneficiaryId: string;
  landHoldingAcres: string;
  landOwnership: "owned" | "leased" | "shared" | "landless" | "";
  farmingType: "conventional" | "organic" | "mixed" | "";
  organicStatus: "none" | "in_conversion" | "certified" | "";
  irrigationSource: string;
  organicPractices?: string;
  supportReceived?: string;
  equipmentReceived?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  followupNotes?: string;
  crops: { season: "kharif" | "rabi" | "zaid" | "perennial"; crop: string; areaAcres: number }[];
};

export type ShgFormValues = {
  id?: string;
  name: string;
  villageId: string;
  formationDate: string;
  meetingFrequency: "weekly" | "fortnightly" | "monthly" | "";
  projectIds: string[];
};

export type PwdFormValues = {
  id?: string;
  beneficiaryId: string;
  disabilityType: string;
  disabilityPercentage: string;
  certificateNo: string;
  certificateIssueDate?: string;
  certificateIssuingAuthority?: string;
  educationLevel: string;
  vocationalStatus: string;
  accessibilityNeeds?: string;
  assistiveDevice?: string;
  individualPlan?: string;
  outcome?: string;
};

/* ---------------- Validators ---------------- */

export function validateFarmer(values: FarmerFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.beneficiaryId?.trim()) errors.beneficiaryId = "Beneficiary selection is required.";
  const acres = Number(values.landHoldingAcres);
  if (isNaN(acres) || acres < 0) errors.landHoldingAcres = "Valid land holding in acres is required.";
  if (!values.landOwnership) errors.landOwnership = "Land ownership type is required.";
  if (!values.farmingType) errors.farmingType = "Farming practice type is required.";
  if (!values.organicStatus) errors.organicStatus = "Organic status is required.";
  if (!values.irrigationSource?.trim()) errors.irrigationSource = "Irrigation source is required.";

  if (values.gpsLatitude) {
    const lat = Number(values.gpsLatitude);
    if (isNaN(lat) || lat < 8 || lat > 38) {
      errors.gpsLatitude = "Latitude must be within India range (8° to 38° N).";
    }
  }
  if (values.gpsLongitude) {
    const lng = Number(values.gpsLongitude);
    if (isNaN(lng) || lng < 68 || lng > 98) {
      errors.gpsLongitude = "Longitude must be within India range (68° to 98° E).";
    }
  }
  return errors;
}

export function validateShg(values: ShgFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.name?.trim()) errors.name = "SHG group name is required.";
  if (!values.villageId?.trim()) errors.villageId = "Village selection is required.";
  if (!values.formationDate?.trim()) errors.formationDate = "Formation date is required.";
  if (!values.meetingFrequency) errors.meetingFrequency = "Meeting cadence is required.";
  return errors;
}

export function validatePwd(values: PwdFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.beneficiaryId?.trim()) errors.beneficiaryId = "Beneficiary is required.";
  if (!values.disabilityType?.trim()) errors.disabilityType = "Disability category is required.";
  const pctVal = Number(values.disabilityPercentage);
  if (isNaN(pctVal) || pctVal < 0 || pctVal > 100) {
    errors.disabilityPercentage = "Disability percentage must be between 0 and 100.";
  }
  if (!values.certificateNo?.trim()) errors.certificateNo = "Certificate number is required.";
  if (!values.educationLevel?.trim()) errors.educationLevel = "Education level is required.";
  if (!values.vocationalStatus?.trim()) errors.vocationalStatus = "Vocational/livelihood status is required.";
  return errors;
}
