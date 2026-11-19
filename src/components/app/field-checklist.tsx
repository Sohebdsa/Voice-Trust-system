"use client";

import { useEffect, useState } from "react";
import { CHECKLIST, isIdField } from "@/lib/checklist";

/**
 * PRD-vs-model audit. Ticks are kept in localStorage so a reviewer's notes
 * survive a reload; ID fields are recorded there too but hidden from the table.
 */
const STORAGE_KEY = "voice-trust:field-checklist:v1";

type State = Record<string, Record<string, boolean>>;

function detected(): State {
  return Object.fromEntries(
    CHECKLIST.map((table) => [table.id, Object.fromEntries(table.fields.map((x) => [x.name, Boolean(x.key)]))]),
  );
}

export function FieldChecklist() {
  const [state, setState] = useState<State>(detected);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as State);
    } catch {
      // Private mode or corrupt state — fall back to the detected values.
    }
  }, []);

  function save(next: State) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Nothing to do: the page still works for this session.
    }
  }

  function toggle(tableId: string, field: string) {
    const next = {
      ...state,
      [tableId]: { ...state[tableId], [field]: !state[tableId]?.[field] },
    };
    save(next);
  }

  const totalFields = CHECKLIST.reduce((n, t) => n + t.fields.length, 0);
  const present = CHECKLIST.reduce(
    (n, t) => n + t.fields.filter((x) => state[t.id]?.[x.name]).length,
    0,
  );

  return (
    <>
      <div className="main-body">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Field coverage</h2>
            <span className="pill" data-tone={present === totalFields ? "positive" : "warn"}>
              {present} / {totalFields} fields present
            </span>
          </div>
          <p className="help" style={{ padding: "0 16px 12px" }}>
            Compares every PRD §4 field with <code>src/lib/data/types.ts</code>. Ticks are stored in this browser
            (localStorage) and can be overridden for fields you track elsewhere.
          </p>
          <button type="button" className="btn" style={{ margin: "0 16px 16px" }} onClick={() => save(detected())}>
            Reset to detected
          </button>
        </section>

        {CHECKLIST.map((table) => {
          const visible = table.fields.filter((x) => !isIdField(x.name));
          const hidden = table.fields.filter((x) => isIdField(x.name));
          const done = table.fields.filter((x) => state[table.id]?.[x.name]).length;

          return (
            <section className="card list-card" key={table.id} style={{ marginTop: "16px" }}>
              <div className="card-head">
                <h2 className="card-title">{table.title}</h2>
                <span className="pill" data-tone={done === table.fields.length ? "positive" : "warn"}>
                  {done} / {table.fields.length}
                </span>
              </div>

              <div className="table-wrap" role="region" aria-label={`${table.title} checklist`} tabIndex={0}>
                <table className="data-table">
                  <caption>{table.type}</caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">PRD field</th>
                      <th scope="col">Mapped to</th>
                      <th scope="col" data-end="">
                        Present
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((field, i) => {
                      const checked = Boolean(state[table.id]?.[field.name]);
                      return (
                        <tr key={field.name}>
                          <th scope="row">{i + 1}</th>
                          <td data-label="PRD field">
                            {field.name}
                            {field.note ? <span className="cell-sub">{field.note}</span> : null}
                          </td>
                          <td data-label="Mapped to">
                            <span className="num">{field.key ?? "—"}</span>
                          </td>
                          <td data-label="Present" data-end="">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(table.id, field.name)}
                              aria-label={`${field.name} present`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hidden.length > 0 && (
                <p className="help" style={{ padding: "8px 16px 16px" }}>
                  {hidden.length} ID field{hidden.length === 1 ? "" : "s"} tracked in localStorage, hidden here.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
