import Link from "next/link";
import { notFound } from "next/navigation";
import type { Column } from "@/components/app/data-table";
import { DataTable } from "@/components/app/data-table";
import { ArchiveButton, DetailHeader, Facts } from "@/components/app/master-detail";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Icon } from "@/components/ui/icons";
import { formatCurrency, formatNumber } from "@/lib/format";
import { canArchive, canEdit } from "@/lib/masters";
import { donorDetail, findDonor, linkedProjects } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";
import { recordDisbursement } from "@/app/actions/masters";

type Row = ReturnType<typeof linkedProjects>[number];

export default async function DonorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole([
    "admin",
    "programme_manager",
    "project_coordinator",
    "mel_officer",
    "finance",
    "data_entry",
  ]);
  const { id } = await params;
  const sParams = await searchParams;
  const donor = findDonor(id);
  if (!donor) notFound();

  const detail = donorDetail(donor, profile);
  const showDisburseDrawer = sParams.disburse === "1";
  const canDisburse = profile.role === "admin" || profile.role === "finance" || canEdit(profile.role, "donors");

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "Project",
      cell: (row) => (
        <>
          <span className="cell-title">{row.name}</span>
          <span className="cell-sub num">{row.code}</span>
        </>
      ),
    },
    { key: "villages", label: "Villages", end: true, cell: (row) => row.villages },
    { key: "beneficiaries", label: "Beneficiaries", end: true, cell: (row) => formatNumber(row.beneficiaries) },
    { key: "budget", label: "Approved budget", end: true, cell: (row) => formatCurrency(row.budget) },
    { key: "status", label: "Status", cell: (row) => <StatusPill label={row.status.replace("_", " ")} tone={statusTone(row.status)} /> },
  ];

  return (
    <>
      <DetailHeader
        backHref="/donors"
        backLabel="Donors"
        title={donor.name}
        code={donor.code}
        status={donor.status}
        subtitle={donor.donorType}
      >
        {canDisburse && (
          <Link className="btn btn-primary" href={`/donors/${donor.id}?disburse=1`}>
            <Icon name="plus" size={13} /> Record disbursement
          </Link>
        )}
        {canEdit(profile.role, "donors") ? (
          <Link className="btn" href={`/donors?id=${donor.id}`}>
            Edit
          </Link>
        ) : null}
        {canArchive(profile.role) ? <ArchiveButton entity="donors" id={donor.id} name={donor.name} /> : null}
      </DetailHeader>

      <div className="main-body">
        {sParams.disbursed && (
          <p className="alert" role="alert" data-tone="positive" style={{ marginBottom: "16px" }}>
            Disbursement recorded successfully and linked to project budget.
          </p>
        )}

        <div className="chart-row-bottom">
          <section className="card" aria-labelledby="donor-record">
            <div className="card-head">
              <Icon name="handshake" size={14} />
              <span id="donor-record">Donor record</span>
            </div>
            <Facts items={detail.facts} />
          </section>
          <section className="card" aria-labelledby="donor-linked">
            <div className="card-head">
              <Icon name="folder" size={14} />
              <span id="donor-linked">Grant & Funding Flow (WF-01)</span>
            </div>
            <Facts
              items={[
                { label: "Approved grant ceiling", value: formatCurrency(donor.approvedBudget) },
                {
                  label: "Total disbursed to date",
                  value: `${formatCurrency(detail.totalDisbursed)} (${detail.percentDisbursed}% of grant)`,
                },
                { label: "Remaining unreleased grant", value: formatCurrency(detail.remaining) },
                { label: "Projects supported", value: String(detail.projects.length) },
                { label: "Total project commitments", value: formatCurrency(detail.committed) },
              ]}
            />
          </section>
        </div>

        {/* Section: Grant Disbursements & Tranches (WF-01) */}
        <section className="card list-card" style={{ marginTop: "16px" }}>
          <div className="card-head" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="calendar" size={14} />
              <strong>Grant Disbursements & Tranches ({detail.disbursements.length})</strong>
            </div>
            {canDisburse && (
              <Link className="btn" style={{ fontSize: "12px", padding: "4px 8px" }} href={`/donors/${donor.id}?disburse=1`}>
                + New tranche
              </Link>
            )}
          </div>
          {detail.disbursements.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Date Disbursed</th>
                    <th data-end="">Amount</th>
                    <th>Tranche Notes</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.disbursements.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/projects/${d.projectId}`} className="cell-title">
                          {d.projectName}
                        </Link>
                        <span className="cell-sub num">{d.projectCode}</span>
                      </td>
                      <td>{d.disbursedOn}</td>
                      <td data-end="">
                        <strong className="num">{formatCurrency(d.amount)}</strong>
                      </td>
                      <td>{d.notes || "—"}</td>
                      <td><span className="muted">{d.recordedByName}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty" style={{ padding: "24px 16px" }}>
              <strong>No disbursements recorded yet.</strong>
              <span>Record a grant tranche above to allocate funding to a linked project.</span>
            </p>
          )}
        </section>

        {/* Section: Funded Projects */}
        <section className="card list-card" style={{ marginTop: "16px" }}>
          <DataTable
            caption={`Projects funded by ${donor.name}`}
            columns={columns}
            rows={detail.projects}
            href="/projects"
            empty={
              <p className="empty">
                <strong>No projects linked yet.</strong>
                <span>Pick this donor on a project to see it here.</span>
              </p>
            }
          />
        </section>
      </div>

      {/* Record Disbursement Drawer (WF-01) */}
      {showDisburseDrawer && (
        <>
          <Link className="drawer-scrim" href={`/donors/${donor.id}`} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="disburse-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">{donor.name}</p>
                <h2 id="disburse-drawer-title">Record Grant Disbursement</h2>
              </div>
              <Link className="btn" href={`/donors/${donor.id}`}>
                Close
              </Link>
            </div>
            <form action={recordDisbursement} className="form" style={{ padding: "16px" }}>
              <input type="hidden" name="donorId" value={donor.id} />
              <p className="help" style={{ marginBottom: "16px" }}>
                Enroll funding to an active project against {donor.name}&apos;s approved grant ceiling of{" "}
                <strong>{formatCurrency(donor.approvedBudget)}</strong>. Available balance:{" "}
                <strong>{formatCurrency(detail.remaining)}</strong>.
              </p>

              <div className="form-grid">
                <div className="field span-2">
                  <label className="label" htmlFor="field-project">
                    Target Project <span aria-hidden="true">*</span>
                  </label>
                  <select className="input" id="field-project" name="projectId" required>
                    <option value="">Select project to receive funds</option>
                    {detail.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) — Budget: {formatCurrency(p.budget)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="field-amount">
                    Disbursement Amount (₹) <span aria-hidden="true">*</span>
                  </label>
                  <input
                    className="input"
                    id="field-amount"
                    name="amount"
                    type="number"
                    min="1"
                    step="1000"
                    placeholder="e.g. 500000"
                    required
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="field-date">
                    Disbursement Date <span aria-hidden="true">*</span>
                  </label>
                  <input
                    className="input"
                    id="field-date"
                    name="disbursedOn"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>

                <div className="field span-2">
                  <label className="label" htmlFor="field-notes">
                    Tranche / Grant Notes
                  </label>
                  <input
                    className="input"
                    id="field-notes"
                    name="notes"
                    type="text"
                    placeholder="e.g. Tranche 2 release upon mid-term project milestone review"
                  />
                </div>
              </div>

              <div className="drawer-foot" style={{ marginTop: "24px" }}>
                <Link className="btn" href={`/donors/${donor.id}`}>
                  Cancel
                </Link>
                <button className="btn btn-primary" type="submit">
                  Confirm Disbursement
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
