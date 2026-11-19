"use client";

import { useState } from "react";

/**
 * Multi-select project dropdown. The panel keeps real checkboxes, so the
 * existing `projectIds` form field and server actions keep working unchanged.
 */
export function ProjectPicker({
  options,
  selected = [],
  name = "projectIds",
}: {
  options: { value: string; label: string }[];
  selected?: string[];
  name?: string;
}) {
  const [values, setValues] = useState(selected);
  const chosen = options.filter((o) => values.includes(o.value));

  function toggle(value: string) {
    setValues((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  return (
    <details className="picker">
      <summary className="input picker-trigger">
        {chosen.length === 0
          ? "Select projects"
          : chosen.length === 1
            ? chosen[0]!.label
            : `${chosen.length} projects selected`}
      </summary>
      <div className="picker-panel">
        {options.map((option) => (
          <label className="check" key={option.value}>
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={values.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {chosen.length > 1 ? (
        <p className="help picker-summary">{chosen.map((o) => o.label).join(" · ")}</p>
      ) : null}
    </details>
  );
}
