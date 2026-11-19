import type { Role, Gender, RecordStatus } from "./data/types";

/**
 * Beneficiary registry metadata (PRD §7.3, §10.2, §10.3).
 * Shared across client forms, queries, and server actions.
 */

export const canCreateBeneficiary = (role: Role) =>
  role === "admin" || role === "project_coordinator" || role === "field_staff" || role === "data_entry";

export const canEditBeneficiary = (role: Role) =>
  role === "admin" || role === "project_coordinator" || role === "field_staff" || role === "data_entry";

export const canArchiveBeneficiary = (role: Role) => role === "admin";

/** PRD §5.1, §5.2, §7.6: PWD details are sensitive; only permitted roles see them. */
export const canViewSensitivePwd = (role: Role) =>
  role === "admin" || role === "programme_manager" || role === "project_coordinator" || role === "field_staff";

export type BeneficiaryFormValues = {
  id?: string;
  fullName: string;
  gender: Gender | "";
  dateOfBirth: string;
  mobile: string;
  alternateContact?: string;
  addressLine?: string;
  villageId: string;
  enrolmentDate?: string;
  status?: RecordStatus | "";
  code?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  idProofType: string;
  idProofLast4: string;
  photoPath?: string;
  projectIds: string[];
  consentGiven: string;
  consentGivenOn?: string;
  allowDuplicate?: string;
  duplicateReason?: string;
};

export type DuplicateMatch = {
  id: string;
  code: string;
  fullName: string;
  mobile: string;
  villageName: string;
  matchedBy: "mobile" | "idProof";
};

export function validateBeneficiary(values: BeneficiaryFormValues, isNew = false): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = values.fullName?.trim() ?? "";
  if (!name) {
    errors.fullName = "Full name is required.";
  } else if (name.length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }

  if (!values.gender) {
    errors.gender = "Select a gender.";
  }

  const mobile = values.mobile?.trim().replace(/\D/g, "") ?? "";
  if (!mobile) {
    errors.mobile = "Mobile number is required.";
  } else if (!/^[6-9]\d{9}$/.test(mobile)) {
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  }

  const alt = values.alternateContact?.trim().replace(/\D/g, "") ?? "";
  if (alt && !/^[6-9]\d{9}$/.test(alt)) {
    errors.alternateContact = "Enter a valid 10-digit alternate number.";
  }

  if (values.enrolmentDate && isNaN(new Date(values.enrolmentDate).getTime())) {
    errors.enrolmentDate = "Enter a valid enrolment date.";
  }

  if (!values.villageId) {
    errors.villageId = "Select a village.";
  }

  if (values.dateOfBirth) {
    const dob = new Date(values.dateOfBirth);
    if (isNaN(dob.getTime()) || dob > new Date()) {
      errors.dateOfBirth = "Date of birth cannot be in the future.";
    }
  }

  const last4 = values.idProofLast4?.trim() ?? "";
  if (last4 && !/^\d{4}$/.test(last4)) {
    errors.idProofLast4 = "Enter exactly the last 4 digits.";
  }

  if (isNew && values.consentGiven !== "true" && values.consentGiven !== "on") {
    errors.consentGiven = "Beneficiary consent is required before saving.";
  }

  return errors;
}

export const BENEFICIARY_PAGE_SIZE = 10;

