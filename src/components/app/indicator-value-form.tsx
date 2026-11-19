"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveIndicatorValue, type IndicatorValueState } from "@/app/actions/mel";

/** One project activity, passed in by the server for the read-only basis panel. */
export type BasisActivity = {
  id: string;
  title: string;
  activityType: string;
  startDate: string;
  villageName: string;
  attended: number;
  outputsResults: string;
  status: string;
};

type Props = {
  indicatorId: string;
  unit: string;
  genderDisaggregated: boolean;
  periodStart: string;
  periodEnd: string;
  activities: BasisActivity[];
  cancelHref: string;
  initialValues?: Record<string, string>;
};

export function IndicatorValueForm({
  indicatorId,
  unit,
  genderDisaggregated,
  periodStart,
  periodEnd,
  activities,
  cancelHref,
  initialValues,
}: Props) {
  const [state, formAction, pending] = useActionState<IndicatorValueState, FormData>(saveIndicatorValue, {});
  const router = useRouter();

  const v = initialValues ?? {};
  const e = state.fieldErrors ?? {};

  // The basis panel follows the period the officer is entering, not a stored query.
  const [from, setFrom] = useState(v.periodStart ?? periodStart);
  const [to, setTo] = useState(v.periodEnd ?? periodEnd);
  const inPeriod = activities.filter((a) => a.startDate >= from && a.startDate <= to);
  const attendedTotal = inPeriod.reduce((sum, a) => sum + a.attended, 0);

  useEffect(() => {
    if (state.ok) router.push(cancelHref);
  }, [state.ok, cancelHref, router]);

  useEffect(() => {
    const first = Object.keys(e)[0];
    if (!first) return;
    document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [e]);

  return (
    <form
      action={formAction}
      aria-label="Record indicator value"
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <input type="hidden" name="indicatorId" value={indicatorId} />
      {v.id && <input type="hidden" name="valueId" value={v.id} />}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* WF-05: reference panel, never auto-filled into the value. */}
        <section aria-labelledby="basis-title" style={{ border: "1px solid var(--line)", borderRadius: "6px", padding: "12px 14px", background: "var(--surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p className="form-section-title" id="basis-title" style={{ margin: 0 }}>Activity basis</p>
            <span className="muted" style={{ fontSize: "var(--fs-11)" }}>
              {inPeriod.length} {inPeriod.length === 1 ? "activity" : "activities"} · {attendedTotal} attended
            </span>
          </div>
          <p className="help" style={{ marginTop: "2px" }}>
            Reference only. Activities in this project during the period you select — check them, then enter the
            value yourself.
          </p>

          {inPeriod.length === 0 ? (
            <p className="muted" style={{ marginTop: "8px", fontSize: "var(--fs-13)" }}>
              No activities logged in this project for this period.
            </p>
          ) : (
            <div className="table-wrap" style={{ marginTop: "8px", maxHeight: "200px" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Activity</th>
                    <th scope="col" data-end="">Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {inPeriod.slice(0, 8).map((activity) => (
                    <tr key={activity.id}>
                      <td className="num">{activity.startDate}</td>
                      <td>
                        <span className="cell-title">{activity.title}</span>
                        <span className="cell-sub">
                          {activity.villageName}
                          {activity.outputsResults ? ` · ${activity.outputsResults}` : ""}
                        </span>
                      </td>
                      <td data-end="" className="num">{activity.attended}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {inPeriod.length > 8 && (
            <p className="help" style={{ marginTop: "4px" }}>Showing the first 8 of {inPeriod.length} activities.</p>
          )}
        </section>

        <div>
          <p className="form-section-title">Period</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="val-from">Period start <span aria-hidden>*</span></label>
              <input
                id="val-from"
                className="input"
                name="periodStart"
                type="date"
                required
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                aria-invalid={e.periodStart ? true : undefined}
                aria-describedby={e.periodStart ? "val-from-error" : undefined}
              />
              {e.periodStart && <p className="error-text" id="val-from-error">{e.periodStart}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="val-to">Period end <span aria-hidden>*</span></label>
              <input
                id="val-to"
                className="input"
                name="periodEnd"
                type="date"
                required
                value={to}
                onChange={(event) => setTo(event.target.value)}
                aria-invalid={e.periodEnd ? true : undefined}
                aria-describedby={e.periodEnd ? "val-to-error" : undefined}
              />
              {e.periodEnd && <p className="error-text" id="val-to-error">{e.periodEnd}</p>}
            </div>
          </div>
        </div>

        <div>
          <p className="form-section-title">Value</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="val-value">Value ({unit}) <span aria-hidden>*</span></label>
              <input
                id="val-value"
                className="input"
                name="value"
                type="number"
                min="0"
                step="any"
                required
                autoFocus
                defaultValue={v.value}
                aria-invalid={e.value ? true : undefined}
                aria-describedby={e.value ? "val-value-error" : undefined}
              />
              {e.value && <p className="error-text" id="val-value-error">{e.value}</p>}
            </div>

            {genderDisaggregated && (
              <>
                <div className="field">
                  <label className="label" htmlFor="val-male">Male ({unit}) <span aria-hidden>*</span></label>
                  <input
                    id="val-male"
                    className="input"
                    name="maleValue"
                    type="number"
                    min="0"
                    step="any"
                    required
                    defaultValue={v.maleValue}
                    aria-invalid={e.maleValue ? true : undefined}
                    aria-describedby={e.maleValue ? "val-male-error" : "val-split-help"}
                  />
                  {e.maleValue && <p className="error-text" id="val-male-error">{e.maleValue}</p>}
                </div>

                <div className="field">
                  <label className="label" htmlFor="val-female">Female ({unit}) <span aria-hidden>*</span></label>
                  <input
                    id="val-female"
                    className="input"
                    name="femaleValue"
                    type="number"
                    min="0"
                    step="any"
                    required
                    defaultValue={v.femaleValue}
                    aria-invalid={e.femaleValue ? true : undefined}
                    aria-describedby={e.femaleValue ? "val-female-error" : "val-split-help"}
                  />
                  {e.femaleValue && <p className="error-text" id="val-female-error">{e.femaleValue}</p>}
                </div>

                <p className="help" id="val-split-help" style={{ gridColumn: "1 / -1" }}>
                  This indicator is gender-disaggregated: male + female must add up to the total value (PRD §7.8).
                </p>
              </>
            )}

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="val-remarks">Remarks</label>
              <textarea
                id="val-remarks"
                className="input"
                name="remarks"
                rows={3}
                defaultValue={v.remarks}
                placeholder="How the number was verified, or what it excludes."
              />
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
          {pending ? "Saving…" : v.id ? "Save value" : "Record value"}
        </button>
      </div>
    </form>
  );
}
