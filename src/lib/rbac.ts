import { db } from "./data/store";
import type { Role } from "./data/types";

/**
 * Server-side access helpers: role scopes standing in for Postgres RLS
 * (PRD §5.2). Navigation metadata lives in ./nav so client components never
 * import the data store.
 */
export {
  NAV,
  navForRole,
  canAccess,
  roleLabel,
  ROLE_LABELS,
  type NavGroup,
  type NavItem,
} from "./nav";

export type Scope = {
  programmeIds: string[] | null; // null = all
  projectIds: string[] | null;
  villageIds: string[] | null;
};

export function scopeForRole(userId: string, role: Role): Scope {
  if (role === "admin" || role === "mel_officer" || role === "finance") {
    return { programmeIds: null, projectIds: null, villageIds: null };
  }
  const rows = db.userScopes.filter((s) => s.userId === userId);
  if (rows.length === 0) return { programmeIds: [], projectIds: [], villageIds: [] };

  const programmeIds = rows.map((r) => r.programmeId).filter((v): v is string => Boolean(v));
  const projectIds = rows.map((r) => r.projectId).filter((v): v is string => Boolean(v));
  const villageIds = rows.map((r) => r.villageId).filter((v): v is string => Boolean(v));

  if (programmeIds.length > 0) {
    const fromProgrammes = db.projects
      .filter((p) => programmeIds.includes(p.programmeId))
      .map((p) => p.id);
    return {
      programmeIds,
      projectIds: [...new Set([...projectIds, ...fromProgrammes])],
      villageIds: villageIds.length > 0 ? villageIds : null,
    };
  }

  if (projectIds.length > 0) {
    return { programmeIds: null, projectIds, villageIds: villageIds.length > 0 ? villageIds : null };
  }

  return { programmeIds: [], projectIds: [], villageIds };
}

export function inProjectScope(scope: Scope, projectId: string) {
  return scope.projectIds === null || scope.projectIds.includes(projectId);
}

export function inVillageScope(scope: Scope, villageId: string) {
  return scope.villageIds === null || scope.villageIds.includes(villageId);
}
