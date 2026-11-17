"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icons";

/**
 * URL-driven list filters: every change rewrites the query string, so a
 * filtered list stays linkable and the browser's back button works.
 */
export type FilterControl = {
  key: string;
  label: string;
  type: "search" | "select";
  options?: { value: string; label: string }[];
};

export function MasterFilters({
  controls,
  values,
}: {
  controls: FilterControl[];
  values: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function submit(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="filterbar" role="group" aria-label="Filters">
      {controls.map((control) =>
        control.type === "search" ? (
          <form
            key={control.key}
            className="filter-field filter-search"
            onSubmit={(event) => {
              event.preventDefault();
              submit({ [control.key]: String(new FormData(event.currentTarget).get(control.key) ?? "") });
            }}
          >
            <Icon name="search" size={13} />
            <label className="sr-only" htmlFor={`filter-${control.key}`}>
              {control.label}
            </label>
            <input
              className="input"
              id={`filter-${control.key}`}
              name={control.key}
              defaultValue={values[control.key] ?? ""}
              placeholder={control.label}
              type="search"
            />
          </form>
        ) : (
          <label className="filter-field" key={control.key}>
            <span className="filter-field-label">{control.label}</span>
            <select
              className="filter-select"
              value={values[control.key] ?? ""}
              onChange={(event) => submit({ [control.key]: event.target.value })}
            >
              <option value="">All</option>
              {control.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={12} />
          </label>
        ),
      )}
    </div>
  );
}
