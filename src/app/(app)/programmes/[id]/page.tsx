import Link from "next/link";
import { notFound } from "next/navigation";
import type { Column } from "@/components/app/data-table";
import { DataTable } from "@/components/app/data-table";
import { ArchiveButton, DetailHeader, DetailTabs, Facts } from "@/components/app/master-detail";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Icon } from "@/components/ui/icons";
import { formatCurrency, formatNumber } from "@/lib/format";
import { canArchive, canEdit } from "@/lib/masters";
import { findProgramme, linkedProjects, programmeDetail } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";

type ProjectRow = ReturnType<typeof linkedProjects>[number];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "projects", label: "Projects" },
  { key: "activities", label: "Activities" },
  { key: "team", label: "Team" },
];

export default async function ProgrammeDetailPage({
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
  ]);
  const { id } = await params;
  const programme = findProgramme(id);
  if (!programme) notFound();

  const requested = (await searchParams).tab;
  const active = typeof requested === "string" && TABS.some((tab) => tab.key === requested) ? requested : "overview";
  const detail = programmeDetail(programme, profile);

  const projectColumns: Column<ProjectRow>[] = [
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
    { key: "donor", label: "Donor", cell: (row) => row.donor },
    { key: "beneficiaries", label: "Beneficiaries", end: true, cell: (row) => formatNumber(row.beneficiaries) },
    { key: "budget", label: "Approved budget", end: true, cell: (row) => formatCurrency(row.budget) },
    { key: "status", label: "Status", cell: (row) => <StatusPill label={row.status.replace("_", " ")} tone={statusTone(row.status)} /> },
  ];

  return (
    <>
      <DetailHeader
        backHref="/programmes"
        backLabel="Programmes"
        title={programme.name}
        code={programme.code}
        status={programme.status}
        subtitle={programme.focusArea}
      >
        {canEdit(profile.role, "programmes") ? (
          <Link className="btn" href={`/programmes?id=${programme.id}`}>
            Edit
          </Link>
        ) : null}
        {canArchive(profile.role) ? (
          <ArchiveButton entity="programmes" id={programme.id} name={programme.name} />
        ) : null}
      </DetailHeader>

      <DetailTabs
        base={`/programmes/${programme.id}`}
        active={active}
        tabs={TABS.map((tab) => ({
          ...tab,
          count:
            tab.key === "projects"
              ? detail.projects.length
              : tab.key === "activities"
                ? detail.activities.length
                : tab.key === "team"
                  ? detail.team.length
                  : undefined,
        }))}
      />

      <div className="main-body">
        {active === "overview" ? (
          <div className="chart-row-bottom">
            <section className="card" aria-labelledby="programme-record">
              <div className="card-head">
                <Icon name="layers" size={14} />
                <span id="programme-record">Programme record</span>
              </div>
              <Facts items={detail.facts} />
            </section>
            <section className="card" aria-labelledby="programme-totals">
              <div className="card-head">
                <Icon name="people" size={14} />
                <span id="programme-totals">Reach</span>
              </div>
              <Facts
                items={[
                  { label: "Projects", value: String(detail.projects.length) },
                  { label: "Active beneficiaries", value: formatNumber(detail.beneficiaries) },
                  { label: "Activities", value: String(detail.activities.length) },
                  { label: "Team members", value: String(detail.team.length) },
                ]}
              />
            </section>
          </div>
        ) : null}

        {active === "projects" ? (
          <section className="card list-card">
            <DataTable
              caption={`Projects in ${programme.name}`}
              columns={projectColumns}
              rows={detail.projects}
              href="/projects"
              empty={
                <p className="empty">
                  <strong>No projects in this programme yet.</strong>
                  <span>Add a project and pick this programme.</span>
                </p>
              }
            />
          </section>
        ) : null}

        {active === "activities" ? (
          <section className="card list-card">
            <DataTable
              caption={`Activities in ${programme.name}`}
              columns={[
                { key: "title", label: "Activity", cell: (row) => row.title },
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
                  <strong>No activities recorded.</strong>
                  <span>Activities added in Step 5 will appear here.</span>
                </p>
              }
            />
          </section>
        ) : null}

        {active === "team" ? (
          <section className="card list-card">
            <DataTable
              caption={`Team allocated to ${programme.name}`}
              columns={[
                { key: "name", label: "Team member", cell: (row) => row.name },
                { key: "designation", label: "Designation", cell: (row) => row.designation },
                { key: "pct", label: "Allocation on this programme", end: true, cell: (row) => `${row.pctTotal}%` },
              ]}
              rows={detail.team}
              href="/employees"
              empty={
                <p className="empty">
                  <strong>Nobody is allocated yet.</strong>
                  <span>Allocate staff to this programme's projects.</span>
                </p>
              }
            />
          </section>
        ) : null}
      </div>
    </>
  );
}
