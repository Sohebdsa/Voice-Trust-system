"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveIndicator, type IndicatorSaveState } from "@/app/actions/mel";

type ProjectOption = { id: string; name: string; programmeId: string };
type ProgrammeOption = { id: string; name: string };
type EmployeeOption = { id: string; fullName: string; designation: string };

type Props = {
  projects: ProjectOption[];
  programmes: ProgrammeOption[];
  employees: EmployeeOption[];
  cancelHref: string;
  initialValues?: Record<string, string>;
};

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "annual", label: "Annual" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

export function IndicatorForm({ projects, programmes, employees, cancelHref, initialValues }: Props) {
  const [state, formAction, pending] = useActionState<IndicatorSaveState, FormData>(saveIndicator, {});
  const router = useRouter();

  const v = initialValues ?? {};
  const e = state.fieldErrors ?? {};

  const [selectedProjectId, setSelectedProjectId] = useState(v.projectId ?? "");
  const derivedProgrammeId = projects.find((p) => p.id === selectedProjectId)?.programmeId ?? "";
  const derivedProgrammeName = programmes.find((p) => p.id === derivedProgrammeId)?.name ?? "—";

  useEffect(() => {
    if (state.indicatorId) router.push(`/mel/${state.indicatorId}`);
  }, [state.indicatorId, router]);

  useEffect(() => {
    const first = Object.keys(e)[0];
    if (!first) return;
    document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [e]);

  return (
    <form
      action={formAction}
      aria-label={v.id ? "Edit indicator" : "New indicator"}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        <div>
          <p className="form-section-title">What is measured</p>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="ind-name">Indicator name <span aria-hidden>*</span></label>
              <input
                id="ind-name"
                className="input"
                name="name"
                required
                autoFocus
                defaultValue={v.name}
                aria-invalid={e.name ? true : undefined}
                aria-describedby={e.name ? "ind-name-error" : undefined}
              />
              {e.name && <p className="error-text" id="ind-name-error">{e.name}</p>}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="ind-desc">Description</label>
              <textarea
                id="ind-desc"
                className="input"
                name="description"
                rows={2}
                defaultValue={v.description}
                placeholder="What exactly does this indicator count, and for whom?"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="ind-project">Project <span aria-hidden>*</span></label>
              <select
                id="ind-project"
                className="input"
                name="projectId"
                required
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                aria-invalid={e.projectId ? true : undefined}
                aria-describedby={e.projectId ? "ind-project-error" : undefined}
              >
                <option value="">Choose project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {e.projectId && <p className="error-text" id="ind-project-error">{e.projectId}</p>}
            </div>

            <div className="field">
              <label className="label">Programme (auto)</label>
              <input className="input" value={derivedProgrammeName} readOnly style={{ background: "var(--surface)", color: "var(--muted)" }} />
            </div>

            <div className="field">
              <label className="label" htmlFor="ind-unit">Unit <span aria-hidden>*</span></label>
              <input
                id="ind-unit"
                className="input"
                name="unit"
                required
                defaultValue={v.unit}
                placeholder="farmers, acres, members, persons"
                aria-invalid={e.unit ? true : undefined}
                aria-describedby={e.unit ? "ind-unit-error" : undefined}
              />
              {e.unit && <p className="error-text" id="ind-unit-error">{e.unit}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="ind-frequency">Reporting frequency <span aria-hidden>*</span></label>
              <select
                id="ind-frequency"
                className="input"
                name="reportingFrequency"
                required
                defaultValue={v.reportingFrequency ?? "quarterly"}
                aria-invalid={e.reportingFrequency ? true : undefined}
                aria-describedby={e.reportingFrequency ? "ind-frequency-error" : undefined}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              {e.reportingFrequency && <p className="error-text" id="ind-frequency-error">{e.reportingFrequency}</p>}
            </div>
          </div>
        </div>

        <div>
          <p className="form-section-title">Measurement</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="ind-baseline">Baseline</label>
              <input
                id="ind-baseline"
                className="input"
                name="baseline"
                type="number"
                min="0"
                step="any"
                defaultValue={v.baseline ?? "0"}
                aria-invalid={e.baseline ? true : undefined}
                aria-describedby={e.baseline ? "ind-baseline-error" : undefined}
              />
              {e.baseline && <p className="error-text" id="ind-baseline-error">{e.baseline}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="ind-target">Target</label>
              <input
                id="ind-target"
                className="input"
                name="target"
                type="number"
                min="1"
                step="any"
                required
                defaultValue={v.target ?? ""}
                aria-invalid={e.target ? true : undefined}
                aria-describedby={e.target ? "ind-target-error" : undefined}
              />
              {e.target && <p className="error-text" id="ind-target-error">{e.target}</p>}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="ind-datasource">Data source</label>
              <textarea
                id="ind-datasource"
                className="input"
                name="dataSource"
                rows={2}
                defaultValue={v.dataSource}
                placeholder="e.g. Activity attendance registers, SHG savings books, field survey"
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="genderDisaggregated"
                  value="1"
                  defaultChecked={v.genderDisaggregated === "1"}
                />
                Gender-disaggregated
              </label>
              <p className="help">
                When ticked, every period entry needs male and female values that add up to the total.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="form-section-title">Ownership</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="ind-responsible">Responsible</label>
              <select
                id="ind-responsible"
                className="input"
                name="responsibleEmployeeId"
                defaultValue={v.responsibleEmployeeId ?? ""}
                aria-invalid={e.responsibleEmployeeId ? true : undefined}
                aria-describedby={e.responsibleEmployeeId ? "ind-responsible-error" : undefined}
              >
                <option value="">Not assigned</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} — {employee.designation}
                  </option>
                ))}
              </select>
              {e.responsibleEmployeeId && <p className="error-text" id="ind-responsible-error">{e.responsibleEmployeeId}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="ind-status">Record status</label>
              <select id="ind-status" className="input" name="status" defaultValue={v.status ?? "active"}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {state.error && (
          <p className="error-text" role="alert" style={{ padding: "0 0 8px" }}>{state.error}</p>
        )}
      </div>

      <div className="drawer-foot">
        <a className="btn btn-ghost" href={cancelHref}>Cancel</a>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : v.id ? "Save changes" : "Create indicator"}
        </button>
      </div>
    </form>
  );
}
