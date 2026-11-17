import { MasterList } from "@/components/app/master-list";
import type { Column } from "@/components/app/data-table";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format";
import { buildQuery, canCreate, exportHref, formHref } from "@/lib/masters";
import { listProgrammes, parseListQuery, type ProgrammeRow } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole([
    "admin",
    "programme_manager",
    "project_coordinator",
    "mel_officer",
    "finance",
  ]);
  const params = await searchParams;
  const query = parseListQuery(params);
  const result = listProgrammes(profile, query);

  const filters = { q: query.q, status: query.status };
  const base = `/programmes${buildQuery(filters)}`;

  const columns: Column<ProgrammeRow>[] = [
    {
      key: "name",
      label: "Programme",
      cell: (row) => (
        <>
          <span className="cell-title">{row.name}</span>
          <span className="cell-sub num">{row.code}</span>
        </>
      ),
    },
    { key: "focus", label: "Focus area", cell: (row) => row.focusArea },
    { key: "period", label: "Period", cell: (row) => row.period },
    { key: "projects", label: "Projects", end: true, cell: (row) => row.projects },
    { key: "beneficiaries", label: "Beneficiaries", end: true, cell: (row) => formatNumber(row.beneficiaries) },
    { key: "status", label: "Status", cell: (row) => <StatusPill label={row.status} tone={statusTone(row.status)} /> },
  ];

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} programmes in your scope`}
        action={canCreate(profile.role) ? { label: "Add programme", href: formHref(base) } : undefined}
        secondary={
          <a className="btn" href={exportHref("programmes", filters)} download>
            <Icon name="download" size={14} /> Export
          </a>
        }
      />
      <MasterList
        entity="programmes"
        profile={profile}
        result={result}
        query={query}
        base={base}
        columns={columns}
        controls={[
          { key: "q", label: "Search name, code or focus area", type: "search" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["active", "inactive", "archived"].map((value) => ({ value, label: value })),
          },
        ]}
        searchParams={params}
      />
    </>
  );
}
