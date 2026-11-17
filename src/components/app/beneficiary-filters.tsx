"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";

export type BeneficiaryFilterOptions = {
  districts: string[];
  blocks: string[];
  villages: { id: string; name: string; block: string; district: string }[];
  projects: { id: string; name: string; code: string }[];
};

export function BeneficiaryFilters({
  options,
  values,
}: {
  options: BeneficiaryFilterOptions;
  values: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  // Filter blocks and villages based on selections
  const availableBlocks = options.blocks.filter((b) => {
    if (!values.district) return true;
    return options.villages.some((v) => v.district === values.district && v.block === b);
  });

  const availableVillages = options.villages.filter((v) => {
    if (values.district && v.district !== values.district) return false;
    if (values.block && v.block !== values.block) return false;
    return true;
  });

  return (
    <div className="filterbar" role="group" aria-label="Beneficiary filters">
      {/* Search Input */}
      <form
        className="filter-field filter-search"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          updateParams({ q: String(form.get("q") ?? "") });
        }}
      >
        <Icon name="search" size={13} />
        <label className="sr-only" htmlFor="filter-q">
          Search name, code, or mobile
        </label>
        <input
          className="input"
          id="filter-q"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Search name, code, mobile..."
          type="search"
        />
      </form>

      {/* District Cascade */}
      <label className="filter-field">
        <span className="filter-field-label">District</span>
        <select
          className="filter-select"
          value={values.district ?? ""}
          onChange={(e) =>
            updateParams({
              district: e.target.value,
              block: "",
              village: "",
            })
          }
        >
          <option value="">All districts</option>
          {options.districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={12} />
      </label>

      {/* Block Cascade */}
      <label className="filter-field">
        <span className="filter-field-label">Block</span>
        <select
          className="filter-select"
          value={values.block ?? ""}
          onChange={(e) =>
            updateParams({
              block: e.target.value,
              village: "",
            })
          }
        >
          <option value="">All blocks</option>
          {availableBlocks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={12} />
      </label>

      {/* Village Cascade */}
      <label className="filter-field">
        <span className="filter-field-label">Village</span>
        <select
          className="filter-select"
          value={values.villageId ?? values.village ?? ""}
          onChange={(e) => updateParams({ village: e.target.value })}
        >
          <option value="">All villages</option>
          {availableVillages.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={12} />
      </label>

      {/* Profile Chip / Type */}
      <label className="filter-field">
        <span className="filter-field-label">Profile</span>
        <select
          className="filter-select"
          value={values.profile === "farmers" ? "farmer" : values.profile === "shgs" ? "shg" : (values.profile ?? "")}
          onChange={(e) => updateParams({ profile: e.target.value })}
        >
          <option value="">All profiles</option>
          <option value="farmer">Farmer</option>
          <option value="shg">SHG member</option>
          <option value="pwd">PWD / GAP</option>
        </select>
        <Icon name="chevronDown" size={12} />
      </label>

      {/* Gender */}
      <label className="filter-field">
        <span className="filter-field-label">Gender</span>
        <select
          className="filter-select"
          value={values.gender ?? ""}
          onChange={(e) => updateParams({ gender: e.target.value })}
        >
          <option value="">All genders</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
        <Icon name="chevronDown" size={12} />
      </label>

      {/* Project */}
      <label className="filter-field">
        <span className="filter-field-label">Project</span>
        <select
          className="filter-select"
          value={values.projectId ?? values.project ?? ""}
          onChange={(e) => updateParams({ project: e.target.value })}
        >
          <option value="">All projects</option>
          {options.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={12} />
      </label>

      {/* Status */}
      <label className="filter-field">
        <span className="filter-field-label">Status</span>
        <select
          className="filter-select"
          value={values.status ?? ""}
          onChange={(e) => updateParams({ status: e.target.value })}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <Icon name="chevronDown" size={12} />
      </label>

      {/* Active duplicate flag pill */}
      {values.flag === "duplicate" && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span
            className="tooltip-wrap"
            tabIndex={0}
            data-tooltip="Filtered by beneficiaries sharing identical contact numbers across records"
            aria-label="Filter details: duplicate contact numbers"
          >
            <span className="pill" data-tone="warn" style={{ cursor: "help" }}>
              Showing duplicate mobiles ⓘ
            </span>
          </span>
          <Link
            href="/beneficiaries"
            className="btn btn-ghost"
            style={{ fontSize: "var(--fs-11)", padding: "2px 6px" }}
          >
            Clear flag
          </Link>
        </div>
      )}
    </div>
  );
}

