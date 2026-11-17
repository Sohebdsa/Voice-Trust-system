"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveMaster, type SaveState } from "@/app/actions/masters";
import type { FieldDef } from "@/lib/masters";

const INITIAL: SaveState = {};

/**
 * One form for the four master records, driven by the field definitions in
 * lib/masters.ts. The server action re-validates everything, and a failed save
 * returns the typed values so nothing has to be entered twice.
 */
export function MasterForm({
  entity,
  id,
  fields,
  initialValues,
  singular,
  cancelHref,
}: {
  entity: string;
  id?: string;
  fields: FieldDef[];
  initialValues: Record<string, string | string[]>;
  singular: string;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveMaster, INITIAL);
  const value = (name: string) => state.values?.[name] ?? initialValues[name] ?? "";
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="entity" value={entity} />
      {id ? <input type="hidden" name="id" value={id} /> : null}

      <div className="form-grid">
        {fields.map((field) => {
          const message = error(field.name);
          const described = message ? `${field.name}-error` : field.help ? `${field.name}-help` : undefined;

          if (field.type === "checkboxes") {
            const selected = value(field.name);
            const checked = Array.isArray(selected) ? selected : selected ? [selected] : [];
            return (
              <fieldset
                key={field.name}
                className="field span-2 checks"
                aria-invalid={message ? true : undefined}
                aria-describedby={described}
              >
                <legend className="label">{field.label}</legend>
                {field.options?.map((option) => (
                  <label className="check" key={option.value}>
                    <input
                      type="checkbox"
                      name={field.name}
                      value={option.value}
                      defaultChecked={checked.includes(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
                {message ? <p className="error-text" id={`${field.name}-error`}>{message}</p> : null}
                {!message && field.help ? <p className="help" id={`${field.name}-help`}>{field.help}</p> : null}
              </fieldset>
            );
          }

          return (
            <div className={`field${field.wide ? " span-2" : ""}`} key={field.name}>
              <label className="label" htmlFor={`field-${field.name}`}>
                {field.label}
                {field.required ? <span aria-hidden="true"> *</span> : null}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  className="input"
                  id={`field-${field.name}`}
                  name={field.name}
                  rows={3}
                  defaultValue={String(value(field.name))}
                  aria-invalid={message ? true : undefined}
                  aria-describedby={described}
                />
              ) : field.type === "select" ? (
                <select
                  className="input"
                  id={`field-${field.name}`}
                  name={field.name}
                  defaultValue={String(value(field.name))}
                  aria-invalid={message ? true : undefined}
                  aria-describedby={described}
                >
                  <option value="">Not set</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  id={`field-${field.name}`}
                  name={field.name}
                  type={field.type === "email" ? "email" : field.type}
                  defaultValue={String(value(field.name))}
                  aria-invalid={message ? true : undefined}
                  aria-describedby={described}
                />
              )}

              {message ? <p className="error-text" id={`${field.name}-error`}>{message}</p> : null}
              {!message && field.help ? <p className="help" id={`${field.name}-help`}>{field.help}</p> : null}
            </div>
          );
        })}
      </div>

      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="drawer-foot">
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : `Save ${singular}`}
        </button>
      </div>
    </form>
  );
}
