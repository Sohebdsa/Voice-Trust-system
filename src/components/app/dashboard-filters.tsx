"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import type { DashboardFilters } from "@/lib/queries/dashboard";

type Options = {
  programmes: { id: string; name: string }[];
  projects: { id: string; name: string; programmeId: string }[];
  districts: string[];
  blocks: { district: string; block: string }[];
  villages: { id: string; name: string; block: string; district: string }[];
};

export const DASHBOARD_FILTER_PARAM_MAP: Record<keyof DashboardFilters, string> = {
  range: "range",
  programmeId: "programme",
  projectId: "project",
  district: "district",
  block: "block",
  villageId: "village",
};

/**
 * Quick filters from Part B of the source document: date range, programme,
 * project and district → block → village cascade, all mirrored in the URL so a
 * filtered view is linkable and back-button safe (PRD §3.2).
 */
export function DashboardFiltersBar({
  options,
  filters,
}: {
  options: Options;
  filters: DashboardFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: keyof DashboardFilters, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const name = DASHBOARD_FILTER_PARAM_MAP[key];
    if (!value || value === "all") params.delete(name);
    else params.set(name, value);

    // Changing a parent filter clears the filters that depend on it.
    if (key === "programmeId") params.delete("project");
    if (key === "district") {
      params.delete("block");
      params.delete("village");
    }
    if (key === "block") params.delete("village");

    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
  }

  const projects = filters.programmeId
    ? options.projects.filter((p) => p.programmeId === filters.programmeId)
    : options.projects;
  const blocks = filters.district
    ? options.blocks.filter((b) => b.district === filters.district)
    : options.blocks;
  const villages = options.villages
    .filter((v) => (filters.district ? v.district === filters.district : true))
    .filter((v) => (filters.block ? v.block === filters.block : true));

  const field = (
    label: string,
    key: keyof DashboardFilters,
    value: string | null,
    items: { value: string; label: string }[],
    allLabel: string,
  ) => (
    <label className="filter-field">
      <span className="filter-field-label">{label}</span>
      <select
        className="filter-select"
        value={value ?? "all"}
        onChange={(event) => update(key, event.target.value)}
        aria-label={label}
      >
        <option value="all">{allLabel}</option>
        {items.map((item) => (
          <option value={item.value} key={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={12} />
    </label>
  );

  const dirty =
    filters.range !== "fy" ||
    Boolean(filters.programmeId || filters.projectId || filters.district || filters.block || filters.villageId);

  return (
    <div className="filterbar" role="group" aria-label="Dashboard filters">
      {field(
        "Period",
        "range",
        filters.range,
        [
          { value: "month", label: "This month" },
          { value: "quarter", label: "This quarter" },
          { value: "fy", label: "This FY" },
        ],
        "This FY",
      )}
      {field(
        "Programme",
        "programmeId",
        filters.programmeId,
        options.programmes.map((p) => ({ value: p.id, label: p.name })),
        "All programmes",
      )}
      {field(
        "Project",
        "projectId",
        filters.projectId,
        projects.map((p) => ({ value: p.id, label: p.name })),
        "All projects",
      )}
      {field(
        "District",
        "district",
        filters.district,
        options.districts.map((d) => ({ value: d, label: d })),
        "All districts",
      )}
      {field(
        "Block",
        "block",
        filters.block,
        blocks.map((b) => ({ value: b.block, label: b.block })),
        "All blocks",
      )}
      {field(
        "Village",
        "villageId",
        filters.villageId,
        villages.map((v) => ({ value: v.id, label: v.name })),
        "All villages",
      )}
      {dirty ? (
        <button className="filter-pill" type="button" onClick={() => router.push("/dashboard", { scroll: false })}>
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
