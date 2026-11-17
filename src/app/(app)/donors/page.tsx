import { MasterList } from "@/components/app/master-list";
import type { Column } from "@/components/app/data-table";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format";
import { buildQuery, canCreate, exportHref, formHref } from "@/lib/masters";
import { listDonors, parseListQuery, type DonorRow } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";

export default async function DonorsPage({
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
    "data_entry",
  ]);
  const params = await searchParams;
  const query = parseListQuery(params);
  const result = listDonors(profile, query);

  const filters = { q: query.q, status: query.status };
  const base = `/donors${buildQuery(filters)}`;

  const columns: Column<DonorRow>[] = [
    {
      key: "name",
      label: "Donor",
      cell: (row) => (
        <>
          <span className="cell-title">{row.name}</span>
          <span className="cell-sub num">{row.code}</span>
        </>
      ),
    },
    { key: "type", label: "Type", cell: (row) => row.donorType },
    { key: "contact", label: "Contact", cell: (row) => row.contactPerson || "—" },
    { key: "grant", label: "Grant period", cell: (row) => row.grantPeriod },
    { key: "budget", label: "Approved budget", end: true, cell: (row) => formatCurrency(row.approvedBudget) },
    { key: "projects", label: "Projects", end: true, cell: (row) => row.projects },
    { key: "status", label: "Status", cell: (row) => <StatusPill label={row.status} tone={statusTone(row.status)} /> },
  ];

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} donors · grant periods and linked projects`}
        action={canCreate(profile.role) ? { label: "Add donor", href: formHref(base) } : undefined}
        secondary={
          <a className="btn" href={exportHref("donors", filters)} download>
            <Icon name="download" size={14} /> Export
          </a>
        }
      />
      <MasterList
        entity="donors"
        profile={profile}
        result={result}
        query={query}
        base={base}
        columns={columns}
        controls={[
          { key: "q", label: "Search name, code or contact", type: "search" },
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
