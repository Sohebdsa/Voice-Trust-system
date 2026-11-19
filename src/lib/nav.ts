import type { Role } from "./data/types";

/**
 * Pure navigation and role metadata — no data access, so client components
 * (the sidebar) can import it without pulling the server data store into the
 * browser bundle.
 */

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
  step?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const ALL_ROLES: Role[] = [
  "admin",
  "programme_manager",
  "project_coordinator",
  "mel_officer",
  "field_staff",
  "finance",
  "data_entry",
];

const PROGRAMME_ROLES: Role[] = ["admin", "programme_manager", "project_coordinator", "mel_officer", "finance"];

/** Navigation mirrors PRD §9.3 groups and the §5.1 access matrix. */
export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard", roles: ["admin", "programme_manager", "project_coordinator", "mel_officer"] },
      { label: "My home", href: "/home", icon: "home", roles: ["field_staff", "data_entry"] },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Beneficiaries", href: "/beneficiaries", icon: "people", roles: ["admin", "programme_manager", "project_coordinator", "mel_officer", "field_staff", "data_entry"], step: 3 },
      { label: "Self-help groups", href: "/shgs", icon: "group", roles: ["admin", "programme_manager", "project_coordinator", "field_staff"], step: 4 },
      { label: "PWD profiles", href: "/pwd", icon: "accessibility", roles: ["admin", "programme_manager", "project_coordinator", "field_staff"], step: 4 },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Activities", href: "/activities", icon: "activity", roles: ["admin", "programme_manager", "project_coordinator", "mel_officer", "field_staff", "data_entry"], step: 5 },
      { label: "MEL indicators", href: "/mel", icon: "target", roles: ["admin", "programme_manager", "project_coordinator", "mel_officer"], step: 6 },
      { label: "Programmes", href: "/programmes", icon: "layers", roles: PROGRAMME_ROLES, step: 2 },
      { label: "Projects", href: "/projects", icon: "folder", roles: ["admin", "programme_manager", "project_coordinator", "mel_officer", "field_staff", "finance"], step: 2 },
    ],
  },
  {
    label: "Organisation",
    items: [
      { label: "Villages", href: "/villages", icon: "map", roles: ALL_ROLES, step: 2 },
      { label: "Donors", href: "/donors", icon: "handshake", roles: ["admin", "programme_manager", "project_coordinator", "mel_officer", "finance", "data_entry"], step: 2 },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

export function canAccess(role: Role, href: string): boolean {
  return NAV.some((group) => group.items.some((item) => item.href === href && item.roles.includes(role)));
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Executive Director",
  programme_manager: "Programme Manager",
  project_coordinator: "Project Coordinator",
  mel_officer: "MEL Officer",
  field_staff: "Field Staff",
  hr_admin: "HR Admin",
  finance: "Finance",
  data_entry: "Data Entry",
};

export function roleLabel(role: Role) {
  return ROLE_LABELS[role];
}
