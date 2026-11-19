"use client";

import { useActionState, useState } from "react";
import {
  addParticipant,
  bulkAddByVillage,
  toggleAttendance,
  removeParticipant,
  type ParticipantActionState,
} from "@/app/actions/activities";
import type { ParticipantRow } from "@/lib/queries/activities";

type BenOption = { id: string; fullName: string; code: string; villageName: string };
type VillageOption = { id: string; name: string };

type Props = {
  activityId: string;
  activityVillageId: string;
  participants: ParticipantRow[];
  availableBeneficiaries: BenOption[];
  villages: VillageOption[];
  canWrite: boolean;
  maleCount: number;
  femaleCount: number;
  actualCount: number;
  targetParticipants: number;
};

const initState: ParticipantActionState = {};

export function ParticipantsPanel({
  activityId,
  activityVillageId,
  participants,
  availableBeneficiaries,
  villages,
  canWrite,
  maleCount,
  femaleCount,
  actualCount,
  targetParticipants,
}: Props) {
  const [addState, addAction, addPending] = useActionState<ParticipantActionState, FormData>(addParticipant, initState);
  const [bulkState, bulkAction, bulkPending] = useActionState<ParticipantActionState, FormData>(bulkAddByVillage, initState);
  const [toggleState, toggleAction] = useActionState<ParticipantActionState, FormData>(toggleAttendance, initState);
  const [removeState, removeAction] = useActionState<ParticipantActionState, FormData>(removeParticipant, initState);
  const [bulkVillage, setBulkVillage] = useState(activityVillageId);

  const attended = participants.filter((p) => p.attended).length;
  const pct = targetParticipants > 0 ? Math.min(100, Math.round((actualCount / targetParticipants) * 100)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Summary bar */}
      <section className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <p className="muted" style={{ fontSize: "var(--fs-11)", textTransform: "uppercase", letterSpacing: ".05em" }}>Total enrolled</p>
            <p style={{ fontSize: "var(--fs-20)", fontWeight: 600 }}>{participants.length}</p>
          </div>
          <div>
            <p className="muted" style={{ fontSize: "var(--fs-11)", textTransform: "uppercase", letterSpacing: ".05em" }}>Attended</p>
            <p style={{ fontSize: "var(--fs-20)", fontWeight: 600 }}>{attended}</p>
          </div>
          <div>
            <p className="muted" style={{ fontSize: "var(--fs-11)", textTransform: "uppercase", letterSpacing: ".05em" }}>Male / Female / Other</p>
            <p style={{ fontSize: "var(--fs-16)", fontWeight: 500 }}>
              {maleCount} / {femaleCount} / {actualCount - maleCount - femaleCount}
            </p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p className="muted" style={{ fontSize: "var(--fs-11)", textTransform: "uppercase", letterSpacing: ".05em" }}>vs Target</p>
            <p style={{ fontSize: "var(--fs-16)", fontWeight: 600 }}>{pct}%</p>
          </div>
        </div>
        {/* progress bar */}
        <div style={{ height: "6px", background: "var(--line)", borderRadius: "3px" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--brand)", borderRadius: "3px", transition: "width .3s" }} />
        </div>
      </section>

      {/* Add participant actions */}
      {canWrite && (
        <section className="card" style={{ padding: "16px 20px" }}>
          <p className="form-section-title" style={{ marginBottom: "12px" }}>Add participants</p>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {/* Single add */}
            <div style={{ flex: "1 1 280px" }}>
              <p className="label" style={{ marginBottom: "6px" }}>Add by beneficiary</p>
              <form action={addAction} style={{ display: "flex", gap: "8px" }}>
                <input type="hidden" name="activityId" value={activityId} />
                <select className="input" name="beneficiaryId" required style={{ flex: 1, fontSize: "var(--fs-13)" }}>
                  <option value="">Choose beneficiary…</option>
                  {availableBeneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.fullName} ({b.code}) — {b.villageName}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary" disabled={addPending} style={{ fontSize: "var(--fs-13)", whiteSpace: "nowrap" }}>
                  {addPending ? "Adding…" : "Add"}
                </button>
              </form>
              {addState.error && <p className="error-text" style={{ marginTop: "4px" }}>{addState.error}</p>}
              {addState.ok && <p className="help" style={{ marginTop: "4px", color: "var(--positive)" }}>Added ✓</p>}
            </div>

            {/* Bulk add */}
            <div style={{ flex: "1 1 280px" }}>
              <p className="label" style={{ marginBottom: "6px" }}>Bulk add by village</p>
              <form action={bulkAction} style={{ display: "flex", gap: "8px" }}>
                <input type="hidden" name="activityId" value={activityId} />
                <input type="hidden" name="villageId" value={bulkVillage} />
                <select
                  className="input"
                  value={bulkVillage}
                  onChange={(e) => setBulkVillage(e.target.value)}
                  style={{ flex: 1, fontSize: "var(--fs-13)" }}
                >
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn" disabled={bulkPending} style={{ fontSize: "var(--fs-13)", whiteSpace: "nowrap" }}>
                  {bulkPending ? "Adding…" : "Add village"}
                </button>
              </form>
              {bulkState.error && <p className="error-text" style={{ marginTop: "4px" }}>{bulkState.error}</p>}
              {bulkState.ok && <p className="help" style={{ marginTop: "4px", color: "var(--positive)" }}>Village added ✓</p>}
            </div>
          </div>
        </section>
      )}

      {/* Participant table */}
      <section className="card list-card">
        {participants.length === 0 ? (
          <p className="muted" style={{ padding: "24px", textAlign: "center" }}>No participants enrolled yet.</p>
        ) : (
          <table className="data-table">
            <caption style={{ display: "none" }}>Participants</caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Gender</th>
                <th>Village</th>
                <th style={{ textAlign: "center" }}>Attended</th>
                {canWrite && <th style={{ width: "60px" }} />}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.beneficiaryId}>
                  <td>
                    <a href={`/beneficiaries/${p.beneficiaryId}?tab=activities`} className="cell-title">
                      {p.fullName}
                    </a>
                  </td>
                  <td><span className="num cell-sub">{p.code}</span></td>
                  <td><span style={{ textTransform: "capitalize" }}>{p.gender}</span></td>
                  <td>{p.villageName}</td>
                  <td style={{ textAlign: "center" }}>
                    {canWrite ? (
                      <form action={toggleAction} style={{ display: "inline" }}>
                        <input type="hidden" name="activityId" value={activityId} />
                        <input type="hidden" name="beneficiaryId" value={p.beneficiaryId} />
                        <input type="hidden" name="attended" value={p.attended ? "0" : "1"} />
                        <button
                          type="submit"
                          className="btn"
                          style={{
                            fontSize: "var(--fs-11)",
                            padding: "2px 10px",
                            background: p.attended ? "var(--positive)" : "var(--surface)",
                            color: p.attended ? "#fff" : "var(--muted)",
                            borderColor: p.attended ? "var(--positive)" : "var(--line)",
                          }}
                        >
                          {p.attended ? "Yes" : "No"}
                        </button>
                      </form>
                    ) : (
                      <span style={{ fontSize: "var(--fs-13)", color: p.attended ? "var(--positive)" : "var(--muted)" }}>
                        {p.attended ? "Yes" : "No"}
                      </span>
                    )}
                  </td>
                  {canWrite && (
                    <td>
                      <form action={removeAction} style={{ display: "inline" }}>
                        <input type="hidden" name="activityId" value={activityId} />
                        <input type="hidden" name="beneficiaryId" value={p.beneficiaryId} />
                        <button
                          type="submit"
                          className="btn btn-ghost"
                          style={{ fontSize: "var(--fs-11)", padding: "2px 8px", color: "var(--danger, #c0392b)" }}
                          title="Remove participant"
                        >
                          ✕
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(toggleState.error || removeState.error) && (
          <p className="error-text" style={{ padding: "8px 16px" }}>{toggleState.error ?? removeState.error}</p>
        )}
      </section>
    </div>
  );
}
