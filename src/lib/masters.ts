import type { Role } from "./data/types";

/**
 * Master records (PRD §7.2): villages, donors, programmes, projects.
 * Field definitions and rules live here so the form, the server action and the
 * CSV export all read one source. No data access, so clients can import it.
 */

export type MasterEntity = "villages" | "donors" | "programmes" | "projects";

export const MASTER_ENTITY: MasterEntity[] = ["villages", "donors", "programmes", "projects"];

export function asEntity(value: unknown): MasterEntity | null {
  return MASTER_ENTITY.includes(value as MasterEntity) ? (value as MasterEntity) : null;
}

export const MASTER_META: Record<MasterEntity, { label: string; singular: string; icon: string }> = {
  villages: { label: "Villages", singular: "village", icon: "map" },
  donors: { label: "Donors", singular: "donor", icon: "handshake" },
  programmes: { label: "Programmes", singular: "programme", icon: "layers" },
  projects: { label: "Projects", singular: "project", icon: "folder" },
};

/** PRD §5.1: only the admin creates, and only the admin archives. */
export const canCreate = (role: Role) => role === "admin";
export const canArchive = (role: Role) => role === "admin";

export function canEdit(role: Role, entity: MasterEntity) {
  if (role === "admin") return true;
  if (entity === "programmes") return role === "programme_manager";
  if (entity === "projects") return role === "programme_manager" || role === "project_coordinator";
  return false;
}

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "checkboxes" | "email";
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
  wide?: boolean;
};

export type FieldOptions = {
  donors: { value: string; label: string }[];
  programmes: { value: string; label: string }[];
  villages: { value: string; label: string }[];
  employees: { value: string; label: string }[];
};

const RECORD_STATUS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const PROJECT_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function formFields(entity: MasterEntity, options: FieldOptions): FieldDef[] {
  switch (entity) {
    case "villages":
      return [
        { name: "name", label: "Village name", type: "text", required: true },
        { name: "panchayat", label: "Gram panchayat", type: "text" },
        { name: "block", label: "Block", type: "text", required: true },
        { name: "district", label: "District", type: "text", required: true },
        { name: "state", label: "State", type: "text" },
        { name: "population", label: "Population", type: "number", help: "Optional, from the last census round." },
        { name: "status", label: "Status", type: "select", options: RECORD_STATUS, required: true },
      ];
    case "donors":
      return [
        { name: "name", label: "Donor name", type: "text", required: true },
        {
          name: "donorType",
          label: "Donor type",
          type: "select",
          options: ["Foundation", "Corporate", "Government", "Individual", "International"].map((value) => ({
            value,
            label: value,
          })),
          required: true,
        },
        { name: "contactPerson", label: "Contact person", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "grantStart", label: "Grant start", type: "date", required: true },
        { name: "grantEnd", label: "Grant end", type: "date", required: true, help: "Cannot be before the start date." },
        { name: "approvedBudget", label: "Approved budget (₹)", type: "number", required: true },
        { name: "status", label: "Status", type: "select", options: RECORD_STATUS, required: true },
      ];
    case "programmes":
      return [
        { name: "name", label: "Programme name", type: "text", required: true },
        { name: "focusArea", label: "Focus area", type: "text", required: true, help: "For example: Agriculture, Livelihood, Disability inclusion." },
        { name: "description", label: "Description", type: "textarea", wide: true },
        { name: "coordinatorId", label: "Coordinator", type: "select", options: options.employees },
        { name: "startDate", label: "Start date", type: "date", required: true },
        { name: "endDate", label: "End date", type: "date", help: "Leave empty while the programme is open-ended." },
        { name: "status", label: "Status", type: "select", options: RECORD_STATUS, required: true },
      ];
    case "projects":
      return [
        { name: "name", label: "Project name", type: "text", required: true },
        { name: "donorId", label: "Donor", type: "select", options: options.donors, required: true },
        { name: "programmeId", label: "Programme", type: "select", options: options.programmes, required: true },
        { name: "coordinatorId", label: "Coordinator", type: "select", options: options.employees },
        { name: "startDate", label: "Start date", type: "date", required: true },
        { name: "endDate", label: "End date", type: "date", required: true, help: "Cannot be before the start date." },
        { name: "approvedBudget", label: "Approved budget (₹)", type: "number", required: true },
        { name: "targetBeneficiaries", label: "Target beneficiaries", type: "number", required: true },
        { name: "status", label: "Status", type: "select", options: PROJECT_STATUS, required: true },
        {
          name: "villageIds",
          label: "Villages covered",
          type: "checkboxes",
          options: options.villages,
          wide: true,
          help: "A project can only be active once it covers at least one village.",
        },
      ];
  }
}

export type MasterValues = Record<string, string | string[]>;

const text = (values: MasterValues, name: string) => String(values[name] ?? "").trim();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Returns field name → message. Shared by the form state and the server action. */
export function validateMaster(entity: MasterEntity, values: MasterValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const need = (name: string, label: string) => {
    if (!text(values, name)) errors[name] = `${label} is required.`;
  };
  const number = (name: string, label: string) => {
    const raw = text(values, name);
    if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) errors[name] = `${label} must be a number of 0 or more.`;
  };
  const dateOrder = (start: string, end: string, message: string) => {
    const a = text(values, start);
    const b = text(values, end);
    if (a && b && b < a) errors[end] = message;
  };

  switch (entity) {
    case "villages":
      need("name", "Village name");
      need("block", "Block");
      need("district", "District");
      number("population", "Population");
      break;
    case "donors":
      need("name", "Donor name");
      need("donorType", "Donor type");
      need("grantStart", "Grant start");
      need("grantEnd", "Grant end");
      need("approvedBudget", "Approved budget");
      number("approvedBudget", "Approved budget");
      if (text(values, "email") && !EMAIL_RE.test(text(values, "email"))) {
        errors.email = "Enter an email like grants@example.org.";
      }
      dateOrder("grantStart", "grantEnd", "Grant end cannot be before the grant start.");
      break;
    case "programmes":
      need("name", "Programme name");
      need("focusArea", "Focus area");
      need("startDate", "Start date");
      dateOrder("startDate", "endDate", "End date cannot be before the start date.");
      break;
    case "projects":
      need("name", "Project name");
      need("donorId", "Donor");
      need("programmeId", "Programme");
      need("startDate", "Start date");
      need("endDate", "End date");
      need("approvedBudget", "Approved budget");
      need("targetBeneficiaries", "Target beneficiaries");
      number("approvedBudget", "Approved budget");
      number("targetBeneficiaries", "Target beneficiaries");
      dateOrder("startDate", "endDate", "End date cannot be before the start date.");
      if (text(values, "status") === "active" && !asList(values.villageIds).length) {
        errors.villageIds = "Attach at least one village before the project can be active.";
      }
      break;
  }
  return errors;
}

export function asList(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

/** Query string for a list view, skipping empty values and "all". */
export function buildQuery(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "" || value === "all" || value === null) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const PAGE_SIZE = 10;

/** Link that opens the create/edit drawer on a list page. */
export function formHref(base: string, form = "new") {
  return `${base}${base.includes("?") ? "&" : "?"}form=${form}`;
}

/** CSV of the list, carrying the same filters as the screen. */
export function exportHref(entity: MasterEntity, filters: Record<string, string | number | undefined>) {
  return `/api/masters/export${buildQuery({ entity, ...filters })}`;
}
