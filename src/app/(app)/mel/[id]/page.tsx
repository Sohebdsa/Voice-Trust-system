import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailHeader, DetailTabs, Facts } from "@/components/app/master-detail";
import { DrawerDialog } from "@/components/app/drawer-dialog";
import { IndicatorForm } from "@/components/app/indicator-form";
import { IndicatorValueForm } from "@/components/app/indicator-value-form";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { db } from "@/lib/data/store";
import { formatDate, formatNumber } from "@/lib/format";
import { buildQuery } from "@/lib/masters";
import {
  getActivitiesForPeriod,
  getIndicatorDetail,
  INDICATOR_WRITE_ROLES,
  indicatorEmployees,
  suggestedPeriod,
} from "@/lib/queries/mel";
import { scopeForRole } from "@/lib/rbac";
import { requireRole } from "@/lib/session";

const ALLOWED_ROLES = ["admin", "programme_manager", "project_coordinator", "mel_officer"] as const;

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  annual: "Annual",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

const ACHIEVEMENT_LABELS: Record<string, string> = {
  on_track: "On track",
  behind: "Behind",
  no_data: "No data",
};

export default async function IndicatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole([...ALLOWED_ROLES]);
  const { id } = await params;
  const query = await searchParams;

  const detail = getIndicatorDetail(id, profile);
  if (!detail) notFound();

  const tab = query.tab === "values" ? "values" : "overview";
  const canWrite = (INDICATOR_WRITE_ROLES as readonly string[]).includes(profile.role);

  const base = `/mel/${id}`;
  const tabHref = `${base}?tab=${tab}`;

  const scope = scopeForRole(profile.id, profile.role);
  const projects = scope.projectIds
    ? db.projects.filter((p) => scope.projectIds!.includes(p.id))
    : db.projects;

  const period = suggestedPeriod(detail.reportingFrequency);
  const editingValueId = typeof query.valueId === "string" ? query.valueId : "";
  const editingValue = editingValueId ? detail.values.find((v) => v.id === editingValueId) : undefined;
  const showValueDrawer = query.form === "value" && canWrite;
  const showEditDrawer = query.edit === "1" && canWrite;

  // WF-05 reference data, filtered to the period the officer picks in the form.
  const today = new Date().toISOString().slice(0, 10);
  const activities = getActivitiesForPeriod(detail.projectId, detail.projectStart || "2000-01-01", today);

  const factItems = [
    { label: "Project", value: detail.projectName },
    { label: "Programme", value: detail.programmeName },
    { label: "Unit", value: detail.unit },
    { label: "Baseline", value: formatNumber(detail.baseline) },
    { label: "Target", value: `${formatNumber(detail.target)} ${detail.unit}` },
    { label: "Reporting frequency", value: FREQUENCY_LABELS[detail.reportingFrequency] ?? detail.reportingFrequency },
    { label: "Responsible", value: detail.responsibleName },
    { label: "Gender-disaggregated", value: detail.genderDisaggregated ? "Yes — male and female required" : "No" },
    { label: "Data source", value: detail.dataSource || "—" },
    { label: "Record status", value: STATUS_LABELS[detail.status] ?? detail.status },
    {
      label: "Latest achievement",
      value: detail.latest
        ? `${formatNumber(detail.latest.value)} ${detail.unit} (${detail.percent}% of target)`
        : "No value entered yet",
    },
    {
      label: "Latest period",
      value: detail.latest ? `${formatDate(detail.latest.periodStart)} – ${formatDate(detail.latest.periodEnd)}` : "—",
    },
  ];

  return (
    <>
      <DetailHeader
        backHref="/mel"
        backLabel="MEL indicators"
        title={detail.name}
        code={detail.code}
        status={detail.status}
        subtitle={`${detail.projectName} · target ${formatNumber(detail.target)} ${detail.unit}`}
      >
        {canWrite && (
          <>
            <Link className="btn" href={`${base}?tab=${tab}&edit=1`}>Edit</Link>
            <Link className="btn btn-primary" href={`${base}?tab=values&form=value`}>Record value</Link>
          </>
        )}
      </DetailHeader>

      <DetailTabs
        base={base}
        active={tab}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "values", label: "Period values", count: detail.values.length },
        ]}
      />

      <div className="main-body">
        {tab === "overview" && (
          <>
            <section className="card" aria-labelledby="ind-progress">
              <div className="card-head">
                <span id="ind-progress">Target vs achievement</span>
                <StatusPill
                  label={ACHIEVEMENT_LABELS[detail.achievement]!}
                  tone={statusTone(detail.achievement)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "var(--fs-32, 2rem)", fontWeight: 600 }} className="num">
                  {detail.latest ? formatNumber(detail.latest.value) : "—"}
                </span>
                <span className="muted">
                  {detail.unit} · {detail.percent}% of {formatNumber(detail.target)} · baseline{" "}
                  {formatNumber(detail.baseline)}
                </span>
              </div>
              <div
                style={{ height: "8px", background: "var(--line)", borderRadius: "4px", marginTop: "12px" }}
                role="img"
                aria-label={`${detail.percent}% of target achieved`}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, detail.percent)}%`,
                    background: "var(--brand)",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <p className="help" style={{ marginTop: "8px" }}>
                {detail.latest
                  ? `Latest value recorded for ${formatDate(detail.latest.periodStart)} – ${formatDate(detail.latest.periodEnd)}.`
                  : "No period value has been recorded yet. Record the first one from the Period values tab."}
              </p>
            </section>

            <section className="card" style={{ marginTop: "16px" }}>
              <Facts items={factItems} />
              {detail.description && (
                <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--surface)", borderRadius: "6px" }}>
                  <p className="label" style={{ marginBottom: "6px" }}>Description</p>
                  <p style={{ fontSize: "var(--fs-13)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{detail.description}</p>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "values" && (
          <section className="card list-card">
            <div className="card-head">
              <span>Period values ({detail.values.length})</span>
              {canWrite && (
                <Link
                  className="btn"
                  href={`${base}${buildQuery({ tab: "values", form: "value" })}`}
                >
                  + Record value
                </Link>
              )}
            </div>

            <p className="help" style={{ padding: "0 16px" }}>
              One row per reporting period. A period can only be entered once — open it to correct the value.
            </p>

            {detail.values.length === 0 ? (
              <p className="empty" style={{ padding: "20px" }}>
                <strong>No values entered yet.</strong>
                <span>
                  {canWrite
                    ? "Record the first period value; the activity basis panel shows what was delivered."
                    : "The MEL officer has not recorded a value for this indicator."}
                </span>
              </p>
            ) : (
              <div className="table-wrap" style={{ marginTop: "8px" }}>
                <table className="data-table">
                  <caption style={{ display: "none" }}>Period values for {detail.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Period</th>
                      <th scope="col" data-end="">Value</th>
                      {detail.genderDisaggregated && <th scope="col" data-end="">Male</th>}
                      {detail.genderDisaggregated && <th scope="col" data-end="">Female</th>}
                      <th scope="col">Remarks</th>
                      <th scope="col">Entered by</th>
                      {canWrite && <th scope="col" style={{ width: "70px" }} />}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.values.map((value) => (
                      <tr key={value.id}>
                        <td>
                          <span className="cell-title num">
                            {formatDate(value.periodStart)} – {formatDate(value.periodEnd)}
                          </span>
                        </td>
                        <td data-end="" className="num">{formatNumber(value.value)}</td>
                        {detail.genderDisaggregated && (
                          <td data-end="" className="num">
                            {value.maleValue === null ? "—" : formatNumber(value.maleValue)}
                          </td>
                        )}
                        {detail.genderDisaggregated && (
                          <td data-end="" className="num">
                            {value.femaleValue === null ? "—" : formatNumber(value.femaleValue)}
                          </td>
                        )}
                        <td>{value.remarks || "—"}</td>
                        <td>
                          <span className="cell-title">{value.enteredByName}</span>
                          <span className="cell-sub">{formatDate(value.enteredAt)}</span>
                        </td>
                        {canWrite && (
                          <td>
                            <Link
                              className="btn btn-ghost"
                              style={{ fontSize: "var(--fs-11)", padding: "2px 8px" }}
                              href={`${base}${buildQuery({ tab: "values", form: "value", valueId: value.id })}`}
                            >
                              Edit
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {showValueDrawer && (
        <DrawerDialog
          titleId="val-drawer-title"
          kicker="MEL · period value"
          title={editingValue ? "Edit period value" : "Record period value"}
          closeHref={`${base}?tab=values`}
        >
          <IndicatorValueForm
            indicatorId={detail.id}
            unit={detail.unit}
            genderDisaggregated={detail.genderDisaggregated}
            periodStart={period.start}
            periodEnd={period.end}
            activities={activities}
            cancelHref={`${base}?tab=values`}
            initialValues={
              editingValue
                ? {
                    id: editingValue.id,
                    periodStart: editingValue.periodStart,
                    periodEnd: editingValue.periodEnd,
                    value: String(editingValue.value),
                    maleValue: editingValue.maleValue === null ? "" : String(editingValue.maleValue),
                    femaleValue: editingValue.femaleValue === null ? "" : String(editingValue.femaleValue),
                    remarks: editingValue.remarks,
                  }
                : undefined
            }
          />
        </DrawerDialog>
      )}

      {showEditDrawer && (
        <DrawerDialog
          titleId="ind-detail-edit-title"
          kicker="MEL"
          title="Edit indicator"
          closeHref={tabHref}
        >
          <IndicatorForm
            projects={projects.map((p) => ({ id: p.id, name: p.name, programmeId: p.programmeId }))}
            programmes={db.programmes.map((p) => ({ id: p.id, name: p.name }))}
            employees={indicatorEmployees().map((e) => ({
              id: e.id,
              fullName: e.fullName,
              designation: e.designation,
            }))}
            cancelHref={tabHref}
            initialValues={{
              id: detail.id,
              name: detail.name,
              description: detail.description,
              projectId: detail.projectId,
              unit: detail.unit,
              baseline: String(detail.baseline),
              target: String(detail.target),
              reportingFrequency: detail.reportingFrequency,
              dataSource: detail.dataSource,
              responsibleEmployeeId: detail.responsibleEmployeeId ?? "",
              genderDisaggregated: detail.genderDisaggregated ? "1" : "",
              status: detail.status,
            }}
          />
        </DrawerDialog>
      )}
    </>
  );
}
