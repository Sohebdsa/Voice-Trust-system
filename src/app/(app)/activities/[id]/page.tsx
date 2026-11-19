import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailHeader, DetailTabs, Facts } from "@/components/app/master-detail";
import { db } from "@/lib/data/store";
import { scopeForRole } from "@/lib/rbac";
import { requireRole } from "@/lib/session";
import { getActivity, availableBeneficiaries, assignableEmployees } from "@/lib/queries/activities";
import { assignStaff, removeStaff, addAttachment, removeAttachment } from "@/app/actions/activities";
import { ActivityForm } from "@/components/app/activity-form";
import { DrawerDialog } from "@/components/app/drawer-dialog";
import { ParticipantsPanel } from "@/components/app/participants-panel";

const ALLOWED_ROLES = [
  "admin",
  "programme_manager",
  "project_coordinator",
  "mel_officer",
  "field_staff",
  "data_entry",
] as const;

const TYPE_LABELS: Record<string, string> = {
  training: "Training",
  awareness: "Awareness",
  meeting: "Meeting",
  field_visit: "Field visit",
  distribution: "Distribution",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole([...ALLOWED_ROLES]);
  const { id } = await params;
  const sParams = await searchParams;
  const tab = typeof sParams.tab === "string" ? sParams.tab : "overview";

  const detail = getActivity(id, profile);
  if (!detail) notFound();

  const canWrite = ["admin", "programme_manager", "project_coordinator", "field_staff", "data_entry"].includes(profile.role);

  // Lock check: field_staff cannot edit completed activities older than 7 days
  const isLocked =
    profile.role === "field_staff" &&
    detail.status === "completed" &&
    new Date(detail.endDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const canEdit = canWrite && !isLocked;
  const showEditDrawer = sParams.edit === "1" && canEdit;

  const scope = scopeForRole(profile.id, profile.role);
  const scopedVillages = scope.villageIds
    ? db.villages.filter((v) => scope.villageIds!.includes(v.id))
    : db.villages;
  const scopedProjects = scope.projectIds
    ? db.projects.filter((p) => scope.projectIds!.includes(p.id))
    : db.projects;

  const availBens = availableBeneficiaries(id, detail.villageId);

  const assignable = assignableEmployees(id);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "participants", label: "Participants", count: detail.participants.length },
    { key: "staff", label: "Staff", count: detail.staff.length },
    { key: "attachments", label: "Attachments", count: detail.attachments.length },
  ];

  const base = `/activities/${id}`;

  return (
    <>
      <DetailHeader
        backHref="/activities"
        backLabel="Activities"
        title={detail.title}
        code={detail.code}
        status={detail.status}
        subtitle={TYPE_LABELS[detail.activityType] ?? detail.activityType}
      >
        {canEdit && (
          <Link className="btn" href={`${base}?edit=1&tab=${tab}`}>Edit</Link>
        )}
        {isLocked && (
          <span className="pill" data-tone="warn">Locked</span>
        )}
      </DetailHeader>

      <DetailTabs tabs={tabs} active={tab} base={base} />

      <div className="main-body">

        {/* ── Overview ── */}
        {tab === "overview" && (
          <section className="card">
            <Facts
              items={[
                { label: "Project", value: detail.projectName },
                { label: "Programme", value: detail.programmeName },
                { label: "Village", value: detail.villageName },
                { label: "Venue", value: detail.location || "—" },
                { label: "Resource persons", value: detail.resourcePersons || "—" },
                { label: "Start date", value: detail.startDate },
                { label: "End date", value: detail.endDate },
                { label: "Status", value: STATUS_LABELS[detail.status] ?? detail.status },
                { label: "Type", value: TYPE_LABELS[detail.activityType] ?? detail.activityType },
                { label: "Target participants", value: String(detail.targetParticipants) },
                {
                  label: "Actual attended",
                  value: `${detail.actualCount} (M: ${detail.maleCount}, F: ${detail.femaleCount})`,
                },
                { label: "Expenditure", value: detail.expenditure != null ? `₹${detail.expenditure.toLocaleString("en-IN")}` : "—" },
              ]}
            />
            {detail.description && (
              <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--surface)", borderRadius: "6px" }}>
                <p className="label" style={{ marginBottom: "6px" }}>Description</p>
                <p style={{ fontSize: "var(--fs-13)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{detail.description}</p>
              </div>
            )}

            {detail.outputsResults && (
              <div style={{ marginTop: "12px", padding: "12px 16px", background: "var(--surface)", borderRadius: "6px" }}>
                <p className="label" style={{ marginBottom: "6px" }}>Outputs &amp; results</p>
                <p style={{ fontSize: "var(--fs-13)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{detail.outputsResults}</p>
              </div>
            )}

            {detail.noParticipantsReason && (
              <p className="help" style={{ marginTop: "12px" }}>
                No participants: {detail.noParticipantsReason}
              </p>
            )}

            {isLocked && (
              <p className="help" style={{ marginTop: "12px" }}>
                This activity was completed more than 7 days ago and is now locked for field staff. Contact a coordinator to make changes.
              </p>
            )}
          </section>
        )}

        {/* ── Participants ── */}
        {tab === "participants" && (
          <ParticipantsPanel
            activityId={id}
            activityVillageId={detail.villageId}
            participants={detail.participants}
            availableBeneficiaries={availBens.map((b) => ({
              id: b.id,
              fullName: b.fullName,
              code: b.code,
              villageName: db.villages.find((v) => v.id === b.villageId)?.name ?? "—",
            }))}
            villages={scopedVillages.map((v) => ({ id: v.id, name: v.name }))}
            canWrite={canWrite && !isLocked}
            maleCount={detail.maleCount}
            femaleCount={detail.femaleCount}
            actualCount={detail.actualCount}
            targetParticipants={detail.targetParticipants}
          />
        )}
        {/* ── Staff ── */}
        {tab === "staff" && (
          <section className="card">
            <p className="form-section-title">Employees who delivered this activity</p>
            {detail.staff.length === 0 ? (
              <p className="muted" style={{ marginTop: "10px" }}>No employees assigned yet.</p>
            ) : (
              <table className="data-table" style={{ marginTop: "10px" }}>
                <caption style={{ display: "none" }}>Assigned staff</caption>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Designation</th>
                    {canWrite && !isLocked && <th style={{ width: "60px" }} />}
                  </tr>
                </thead>
                <tbody>
                  {detail.staff.map((s) => (
                    <tr key={s.employeeId}>
                      <td><span className="cell-title">{s.fullName}</span></td>
                      <td>{s.designation}</td>
                      {canWrite && !isLocked && (
                        <td>
                          <form action={removeStaff}>
                            <input type="hidden" name="activityId" value={id} />
                            <input type="hidden" name="employeeId" value={s.employeeId} />
                            <button type="submit" className="btn btn-ghost" style={{ fontSize: "var(--fs-11)", padding: "2px 8px" }} title="Remove from activity">
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

            {canWrite && !isLocked && assignable.length > 0 && (
              <form action={assignStaff} style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                <input type="hidden" name="activityId" value={id} />
                <select className="input" name="employeeId" required style={{ flex: "1 1 260px" }}>
                  <option value="">Assign an employee…</option>
                  {assignable.map((e) => (
                    <option key={e.id} value={e.id}>{e.fullName} — {e.designation}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary">Assign</button>
              </form>
            )}
          </section>
        )}

        {/* ── Attachments ── */}
        {tab === "attachments" && (
          <section className="card">
            <p className="form-section-title">Files</p>
            <p className="help" style={{ marginTop: "4px" }}>
              Prototype note: only the file name is recorded. The document itself is never uploaded or stored.
            </p>

            {detail.attachments.length === 0 ? (
              <p className="muted" style={{ marginTop: "12px" }}>No files recorded yet.</p>
            ) : (
              <table className="data-table" style={{ marginTop: "12px" }}>
                <caption style={{ display: "none" }}>Attachments</caption>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Kind</th>
                    <th>Caption</th>
                    {canWrite && !isLocked && <th style={{ width: "60px" }} />}
                  </tr>
                </thead>
                <tbody>
                  {detail.attachments.map((f) => (
                    <tr key={f.id}>
                      <td><span className="cell-title">{f.filePath}</span></td>
                      <td><span style={{ textTransform: "capitalize" }}>{f.kind}</span></td>
                      <td>{f.caption || "—"}</td>
                      {canWrite && !isLocked && (
                        <td>
                          <form action={removeAttachment}>
                            <input type="hidden" name="activityId" value={id} />
                            <input type="hidden" name="attachmentId" value={f.id} />
                            <button type="submit" className="btn btn-ghost" style={{ fontSize: "var(--fs-11)", padding: "2px 8px" }} title="Remove file">
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

            {canWrite && !isLocked && (
              <form action={addAttachment} style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <input type="hidden" name="activityId" value={id} />
                <div className="field" style={{ flex: "1 1 240px" }}>
                  <label className="label" htmlFor="att-file">File</label>
                  <input id="att-file" className="input" type="file" name="file" required accept="image/*,.pdf" />
                </div>
                <div className="field" style={{ flex: "1 1 200px" }}>
                  <label className="label" htmlFor="att-caption">Caption</label>
                  <input id="att-caption" className="input" name="caption" placeholder="Optional" />
                </div>
                <button type="submit" className="btn btn-primary">Record file</button>
              </form>
            )}
          </section>
        )}
      </div>

      {/* Edit drawer */}
      {showEditDrawer && (
        <DrawerDialog
          titleId="act-edit-drawer-title"
          kicker="Edit"
          title="Edit activity"
          closeHref={`${base}?tab=${tab}`}
        >
            <ActivityForm
              projects={scopedProjects.map((p) => ({ id: p.id, name: p.name, programmeId: p.programmeId }))}
              villages={scopedVillages.map((v) => ({ id: v.id, name: v.name }))}
              programmes={db.programmes.map((p) => ({ id: p.id, name: p.name }))}
              cancelHref={`${base}?tab=${tab}`}
              initialValues={{
                id: detail.id,
                title: detail.title,
                activityType: detail.activityType,
                projectId: detail.projectId,
                villageId: detail.villageId,
                startDate: detail.startDate,
                endDate: detail.endDate,
                status: detail.status,
                targetParticipants: String(detail.targetParticipants),
                expenditure: detail.expenditure != null ? String(detail.expenditure) : "",
                description: detail.description,
                location: detail.location ?? "",
                resourcePersons: detail.resourcePersons ?? "",
                outputsResults: detail.outputsResults ?? "",
                noParticipantsReason: detail.noParticipantsReason ?? "",
              }}
            />
        </DrawerDialog>
      )}
    </>
  );
}
