"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveShg, type ProfileSaveState } from "@/app/actions/profiles";
import type { ShgFormValues } from "@/lib/profiles";

const INITIAL: ProfileSaveState = {};

export function ShgForm({
  initialValues,
  options,
  cancelHref,
}: {
  initialValues?: Partial<ShgFormValues>;
  options: {
    villages: { value: string; label: string }[];
    projects: { value: string; label: string }[];
  };
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveShg, INITIAL);

  const selectedProjects = initialValues?.projectIds ?? [];

  return (
    <form action={action} className="form" noValidate>
      {initialValues?.id ? <input type="hidden" name="id" value={initialValues.id} /> : null}

      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="form-grid">
        <div className="field span-2">
          <label className="label" htmlFor="field-name">
            SHG Group Name <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-name"
            name="name"
            type="text"
            required
            placeholder="e.g. Savitribai Mahila Bachat Gat"
            defaultValue={initialValues?.name ?? ""}
            aria-invalid={state.fieldErrors?.name ? true : undefined}
          />
          {state.fieldErrors?.name && <p className="error-text">{state.fieldErrors.name}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-village">
            Base Village <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-village"
            name="villageId"
            required
            defaultValue={initialValues?.villageId ?? ""}
          >
            <option value="">Select village</option>
            {options.villages.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.villageId && (
            <p className="error-text">{state.fieldErrors.villageId}</p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-date">
            Formation Date <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-date"
            name="formationDate"
            type="date"
            required
            defaultValue={initialValues?.formationDate ?? new Date().toISOString().slice(0, 10)}
          />
          {state.fieldErrors?.formationDate && (
            <p className="error-text">{state.fieldErrors.formationDate}</p>
          )}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-frequency">
            Meeting Frequency & Savings Cadence <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-frequency"
            name="meetingFrequency"
            required
            defaultValue={initialValues?.meetingFrequency ?? "monthly"}
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <p className="form-section-title span-2">Linked Development Projects (PRD §4.7 / §7.5)</p>

        <fieldset className="field span-2 checks">
          <legend className="label">Projects supporting this SHG</legend>
          {options.projects.map((p) => (
            <label className="check" key={p.value}>
              <input
                type="checkbox"
                name="projectIds"
                value={p.value}
                defaultChecked={selectedProjects.includes(p.value)}
              />
              {p.label}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="drawer-foot">
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Self-Help Group"}
        </button>
      </div>
    </form>
  );
}
