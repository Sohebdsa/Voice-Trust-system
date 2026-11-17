import { MasterList } from "@/components/app/master-list";
import type { Column } from "@/components/app/data-table";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { formatCurrency, pct } from "@/lib/format";
import { buildQuery, canCreate, exportHref, formHref } from "@/lib/masters";
import { getListOptions, listProjects, parseListQuery, type ProjectRow } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";

export default async function ProjectsPage({
  searchParams,
}: {
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
  const params = await searchParams;
  const query = parseListQuery(params);
  const result = listProjects(profile, query);
  const options = getListOptions(profile);

  const filters = { q: query.q, programme: query.programme, donor: query.donor, status: query.status };
  const base = `/projects${buildQuery(filters)}`;

  const columns: Column<ProjectRow>[] = [
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
    { key: "programme", label: "Programme", cell: (row) => row.programme },
    { key: "donor", label: "Donor", cell: (row) => row.donor },
    { key: "period", label: "Period", cell: (row) => row.period },
    { key: "budget", label: "Approved budget", end: true, cell: (row) => formatCurrency(row.budget) },
    {
      key: "reach",
      label: "Reached / target",
      end: true,
      cell: (row) => `${row.beneficiaries} · ${pct(row.beneficiaries, row.target)}%`,
    },
    { key: "villages", label: "Villages", end: true, cell: (row) => row.villages },
    { key: "status", label: "Status", cell: (row) => <StatusPill label={row.status.replace("_", " ")} tone={statusTone(row.status)} /> },
  ];

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} projects · active, draft and completed`}
        action={canCreate(profile.role) ? { label: "Add project", href: formHref(base) } : undefined}
        secondary={
          <a className="btn" href={exportHref("projects", filters)} download>
            <Icon name="download" size={14} /> Export
          </a>
        }
      />
      <MasterList
        entity="projects"
        profile={profile}
        result={result}
        query={query}
        base={base}
        columns={columns}
        controls={[
          { key: "q", label: "Search name or code", type: "search" },
          { key: "programme", label: "Programme", type: "select", options: options.programmes },
          { key: "donor", label: "Donor", type: "select", options: options.donors },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["draft", "active", "on_hold", "completed", "cancelled"].map((value) => ({
              value,
              label: value.replace("_", " "),
            })),
          },
        ]}
        searchParams={params}
      />
    </>
  );
}
