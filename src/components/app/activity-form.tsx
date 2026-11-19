"use client";

import { useActionState, useEffect, useState } from "react";
import { saveActivity, type ActivitySaveState } from "@/app/actions/activities";
import { useRouter } from "next/navigation";

type ProjectOption = { id: string; name: string; programmeId: string };
type VillageOption = { id: string; name: string };
type ProgrammeOption = { id: string; name: string };

type Props = {
  projects: ProjectOption[];
  villages: VillageOption[];
  programmes: ProgrammeOption[];
  cancelHref: string;
  initialValues?: Record<string, string>;
};

const ACTIVITY_TYPES = [
  { value: "training", label: "Training" },
  { value: "awareness", label: "Awareness" },
  { value: "meeting", label: "Meeting" },
  { value: "field_visit", label: "Field visit" },
  { value: "distribution", label: "Distribution" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function ActivityForm({ projects, villages, programmes, cancelHref, initialValues }: Props) {
  const [state, formAction, pending] = useActionState<ActivitySaveState, FormData>(saveActivity, {});
  const router = useRouter();

  const [selectedProjectId, setSelectedProjectId] = useState(initialValues?.projectId ?? "");
  const derivedProgrammeId = projects.find((p) => p.id === selectedProjectId)?.programmeId ?? "";
  const derivedProgrammeName = programmes.find((p) => p.id === derivedProgrammeId)?.name ?? "—";

  useEffect(() => {
    if (state.activityId) {
      router.push(`/activities/${state.activityId}`);
    }
  }, [state.activityId, router]);

  const v = initialValues ?? {};
  const e = state.fieldErrors ?? {};

  // Native constraint validation runs first; a server rejection still needs to
  // land the user on the field that failed (Modern Web Guidance: forms).
  useEffect(() => {
    const first = Object.keys(e)[0];
    if (!first) return;
    document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [e]);

  return (
    <form
      action={formAction}
      aria-label={initialValues?.id ? "Edit activity" : "Log activity"}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {initialValues?.id && <input type="hidden" name="id" value={initialValues.id} />}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Section: Basics */}
        <div>
          <p className="form-section-title">Basics</p>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="act-title">Activity title <span aria-hidden>*</span></label>
              <input
                id="act-title"
                className="input"
                name="title"
                required
                autoFocus
                defaultValue={v.title}
                aria-invalid={e.title ? true : undefined}
                aria-describedby={e.title ? "act-title-error" : undefined}
              />
              {e.title && <p className="error-text" id="act-title-error">{e.title}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="act-type">Type <span aria-hidden>*</span></label>
              <select
                id="act-type"
                className="input"
                name="activityType"
                required
                defaultValue={v.activityType ?? ""}
                aria-invalid={e.activityType ? true : undefined}
                aria-describedby={e.activityType ? "act-type-error" : undefined}
              >
                <option value="">Choose type…</option>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {e.activityType && <p className="error-text" id="act-type-error">{e.activityType}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="act-status">Status</label>
              <select id="act-status" className="input" name="status" defaultValue={v.status ?? "planned"}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="act-project">Project <span aria-hidden>*</span></label>
              <select
                id="act-project"
                className="input"
                name="projectId"
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                aria-invalid={e.projectId ? true : undefined}
                aria-describedby={e.projectId ? "act-project-error" : undefined}
              >
                <option value="">Choose project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {e.projectId && <p className="error-text" id="act-project-error">{e.projectId}</p>}
            </div>

            <div className="field">
              <label className="label">Programme (auto)</label>
              <input className="input" value={derivedProgrammeName} readOnly style={{ background: "var(--surface)", color: "var(--muted)" }} />
            </div>
          </div>
        </div>

        {/* Section: When & Where */}
        <div>
          <p className="form-section-title">When &amp; Where</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="act-start">Start date <span aria-hidden>*</span></label>
              <input
                id="act-start"
                className="input"
                name="startDate"
                type="date"
                required
                defaultValue={v.startDate}
                aria-invalid={e.startDate ? true : undefined}
                aria-describedby={e.startDate ? "act-start-error" : undefined}
              />
              {e.startDate && <p className="error-text" id="act-start-error">{e.startDate}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="act-end">End date</label>
              <input
                id="act-end"
                className="input"
                name="endDate"
                type="date"
                defaultValue={v.endDate}
                aria-invalid={e.endDate ? true : undefined}
                aria-describedby={e.endDate ? "act-end-error" : undefined}
              />
              {e.endDate && <p className="error-text" id="act-end-error">{e.endDate}</p>}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="act-village">Village <span aria-hidden>*</span></label>
              <select
                id="act-village"
                className="input"
                name="villageId"
                required
                defaultValue={v.villageId ?? ""}
                aria-invalid={e.villageId ? true : undefined}
                aria-describedby={e.villageId ? "act-village-error" : undefined}
              >
                <option value="">Choose village…</option>
                {villages.map((vi) => (
                  <option key={vi.id} value={vi.id}>{vi.name}</option>
                ))}
              </select>
              {e.villageId && <p className="error-text" id="act-village-error">{e.villageId}</p>}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="act-location">Venue / location</label>
              <input id="act-location" className="input" name="location" defaultValue={v.location} placeholder="e.g. Gram Panchayat Hall, Murbad" />
              <p className="help">Specific venue within the village</p>
            </div>
          </div>
        </div>

        {/* Section: Participants & Budget */}
        <div>
          <p className="form-section-title">Participants &amp; Budget</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="act-target">Target participants</label>
              <input id="act-target" className="input" name="targetParticipants" type="number" min="0" defaultValue={v.targetParticipants ?? "0"} />
            </div>

            <div className="field">
              <label className="label" htmlFor="act-exp">Expenditure (₹)</label>
              <input id="act-exp" className="input" name="expenditure" type="number" min="0" defaultValue={v.expenditure ?? ""} placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Section: Notes */}
        <div>
          <p className="form-section-title">Staff &amp; Resources</p>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="act-resource">Resource persons / speakers</label>
              <textarea id="act-resource" className="input" name="resourcePersons" rows={2} defaultValue={v.resourcePersons} placeholder="e.g. Dr. Ramesh Patil (ATMA), Block Agriculture Officer" />
              <p className="help">External experts, government officials or partner staff who delivered the session</p>
            </div>
          </div>
        </div>

        <div>
          <p className="form-section-title">Notes &amp; Outputs</p>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="act-desc">Description</label>
              <textarea id="act-desc" className="input" name="description" rows={3} defaultValue={v.description} />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="act-outputs">Outputs &amp; results</label>
              <textarea id="act-outputs" className="input" name="outputsResults" rows={3} defaultValue={v.outputsResults} placeholder="e.g. Distributed 40 seed kits; demo of the improved method conducted." />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="act-noreason">Reason for no participants</label>
              <textarea
                id="act-noreason"
                className="input"
                name="noParticipantsReason"
                rows={2}
                defaultValue={v.noParticipantsReason}
                placeholder="Only needed when marking a completed activity with nobody enrolled"
                aria-invalid={e.noParticipantsReason ? true : undefined}
                aria-describedby={e.noParticipantsReason ? "act-noreason-error" : undefined}
              />
              {e.noParticipantsReason && <p className="error-text" id="act-noreason-error">{e.noParticipantsReason}</p>}
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
          {pending ? "Saving…" : initialValues?.id ? "Save changes" : "Create activity"}
        </button>
      </div>
    </form>
  );
}
