import Link from "next/link";
import { notFound } from "next/navigation";
import type { Column } from "@/components/app/data-table";
import { DataTable } from "@/components/app/data-table";
import { ArchiveButton, DetailHeader, DetailTabs, Facts } from "@/components/app/master-detail";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Icon } from "@/components/ui/icons";
import { formatCurrency, formatNumber } from "@/lib/format";
import { canArchive, canEdit } from "@/lib/masters";
import { findProject, projectDetail } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "beneficiaries", label: "Beneficiaries" },
  { key: "activities", label: "Activities" },
  { key: "indicators", label: "Indicators" },
  { key: "team", label: "Team & villages" },
  { key: "budget", label: "Budget" },
];

export default async function ProjectDetailPage({
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
    "field_staff",
    "finance",
  ]);
  const { id } = await params;
  const project = findProject(id);
  if (!project) notFound();

  const requested = (await searchParams).tab;
  const active = typeof requested === "string" && TABS.some((tab) => tab.key === requested) ? requested : "overview";
  const detail = projectDetail(project, profile);

  const villageColumns: Column<(typeof detail.villages)[number]>[] = [
    { key: "name", label: "Village", cell: (row) => row.name },
    { key: "block", label: "Block", cell: (row) => row.block },
    { key: "beneficiaries", label: "Beneficiaries", end: true, cell: (row) => formatNumber(row.beneficiaries) },
  ];

  const allocations = detail.team;

  return (
    <>
      <DetailHeader
        backHref="/projects"
        backLabel="Projects"
        title={project.name}
        code={project.code}
        status={project.status}
        subtitle={`${formatCurrency(project.approvedBudget)} approved`}
      >
        {canEdit(profile.role, "projects") ? (
          <Link className="btn" href={`/projects?id=${project.id}`}>
            Edit
          </Link>
        ) : null}
        {canArchive(profile.role) ? <ArchiveButton entity="projects" id={project.id} name={project.name} /> : null}
      </DetailHeader>

      <DetailTabs
        base={`/projects/${project.id}`}
        active={active}
        tabs={TABS.map((tab) => ({
          ...tab,
          count:
            tab.key === "beneficiaries"
              ? detail.beneficiaryTotal
              : tab.key === "activities"
                ? detail.activities.length
                : tab.key === "indicators"
                  ? detail.indicators.length
                  : undefined,
        }))}
      />

      <div className="main-body">
        {active === "overview" ? (
          <div className="chart-row-bottom">
            <section className="card" aria-labelledby="project-record">
              <div className="card-head">
                <Icon name="folder" size={14} />
                <span id="project-record">Project record</span>
              </div>
              <Facts items={detail.facts} />
            </section>
            <section className="card" aria-labelledby="project-progress">
              <div className="card-head">
                <Icon name="target" size={14} />
                <span id="project-progress">Progress</span>
              </div>
              <Facts
                items={[
                  { label: "Active beneficiaries", value: formatNumber(detail.beneficiaryTotal) },
                  { label: "Villages attached", value: String(detail.villages.length) },
                  { label: "Activities", value: String(detail.activities.length) },
                  { label: "Indicators", value: String(detail.indicators.length) },
                ]}
              />
            </section>
          </div>
        ) : null}

        {active === "beneficiaries" ? (
          <section className="card list-card">
            <DataTable
              caption={`Beneficiaries in ${project.name} (first 10)`}
              columns={[
                {
                  key: "name",
                  label: "Beneficiary",
                  cell: (row) => (
                    <>
                      <span className="cell-title">{row.name}</span>
                      <span className="cell-sub num">{row.code}</span>
                    </>
                  ),
                },
                { key: "village", label: "Village", cell: (row) => row.village },
                { key: "gender", label: "Gender", cell: (row) => row.gender },
              ]}
              rows={detail.beneficiaries}
              href="/beneficiaries"
              empty={
                <p className="empty">
                  <strong>No beneficiaries enrolled yet.</strong>
                  <span>The registry arrives in Step 3.</span>
                </p>
              }
            />
          </section>
        ) : null}

        {active === "activities" ? (
          <section className="card list-card">
            <DataTable
              caption={`Activities in ${project.name}`}
              columns={[
                { key: "title", label: "Activity", cell: (row) => row.title },
                { key: "type", label: "Type", cell: (row) => row.type },
                { key: "village", label: "Village", cell: (row) => row.village },
                { key: "date", label: "Date", cell: (row) => row.date },
                {
                  key: "status",
                  label: "Status",
                  cell: (row) => <StatusPill label={row.status} tone={statusTone(row.status)} />,
                },
              ]}
              rows={detail.activities}
              href="/activities"
              empty={
                <p className="empty">
                  <strong>No activities yet.</strong>
                  <span>Log the first activity for this project.</span>
                </p>
              }
            />
          </section>
        ) : null}

        {active === "indicators" ? (
          <section className="card list-card">
            <DataTable
              caption={`Indicators for ${project.name}`}
              columns={[
                { key: "name", label: "Indicator", cell: (row) => row.name },
                { key: "target", label: "Target", end: true, cell: (row) => `${formatNumber(row.target)} ${row.unit}` },
                { key: "achieved", label: "Achieved", end: true, cell: (row) => `${formatNumber(row.achieved)} ${row.unit}` },
                { key: "percent", label: "Achieved", end: true, cell: (row) => `${row.percent}%` },
                {
                  key: "status",
                  label: "Status",
                  cell: (row) => (
                    <StatusPill
                      label={row.status.replace("_", " ")}
                      tone={statusTone(row.status)}
                    />
                  ),
                },
              ]}
              rows={detail.indicators}
              href="/mel"
              empty={
                <p className="empty">
                  <strong>No indicators defined.</strong>
                  <span>MEL indicators arrive in Step 6.</span>
                </p>
              }
            />
          </section>
        ) : null}

        {active === "team" ? (
          <div className="stack-cards">
            <section className="card list-card">
              <DataTable
                caption={`Team allocated to ${project.name}`}
                columns={[
                  { key: "name", label: "Team member", cell: (row) => row.name },
                  { key: "designation", label: "Designation", cell: (row) => row.designation },
                  { key: "from", label: "Allocated from", cell: (row) => row.fromDate },
                  { key: "pct", label: "Allocation", end: true, cell: (row) => `${row.allocationPct}%` },
                ]}
                rows={allocations}
                href="/employees"
                empty={
                  <p className="empty">
                    <strong>Nobody is allocated to this project.</strong>
                    <span>Allocate staff from the employee record.</span>
                  </p>
                }
              />
            </section>
            <section className="card list-card">
              <DataTable
                caption={`Villages covered by ${project.name}`}
                columns={villageColumns}
                rows={detail.villages}
                href="/villages"
                empty={
                  <p className="empty">
                    <strong>No villages attached.</strong>
                    <span>Edit the project and tick the villages it covers.</span>
                  </p>
                }
              />
            </section>
          </div>
        ) : null}

        {active === "budget" ? (
          <div className="chart-row-bottom">
            <section className="card" aria-labelledby="project-budget">
              <div className="card-head">
                <Icon name="wallet" size={14} />
                <span id="project-budget">Approved budget & Funding flow (WF-01)</span>
              </div>
              <div className="budget-card">
                <span className="budget-amount">{formatCurrency(project.approvedBudget)}</span>
                <span className="muted">
                  Funded by{" "}
                  {detail.donor ? (
                    <Link href={`/donors/${detail.donor.id}`}>
                      <strong>{detail.donor.name}</strong> ({detail.donor.code})
                    </Link>
                  ) : (
                    "Unspecified donor"
                  )}
                  . Grant received to date: <strong>{formatCurrency(detail.totalDisbursed)}</strong>. Outstanding balance:{" "}
                  <strong>{formatCurrency(detail.fundingBalance)}</strong>.
                </span>
              </div>
              <div style={{ marginTop: "16px" }}>
                <Facts
                  items={[
                    { label: "Funding donor", value: detail.donor?.name ?? "—" },
                    { label: "Approved grant commitment", value: formatCurrency(project.approvedBudget) },
                    { label: "Grant tranches disbursed to date", value: formatCurrency(detail.totalDisbursed) },
                    { label: "Pending grant releases", value: formatCurrency(detail.fundingBalance) },
                  ]}
                />
              </div>
            </section>

            <section className="card list-card" aria-labelledby="grant-tranches">
              <div className="card-head">
                <Icon name="calendar" size={14} />
                <span id="grant-tranches">Grant Tranches Received ({detail.disbursements.length})</span>
              </div>
              {detail.disbursements.length > 0 ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th data-end="">Amount</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.disbursements.map((d) => (
                        <tr key={d.id}>
                          <td>{d.disbursedOn}</td>
                          <td data-end="">
                            <strong className="num">{formatCurrency(d.amount)}</strong>
                          </td>
                          <td>{d.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty" style={{ padding: "20px" }}>
                  <strong>No disbursements logged yet.</strong>
                  <span>Disbursements can be recorded from the donor page.</span>
                </p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
