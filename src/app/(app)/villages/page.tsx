import { MasterList } from "@/components/app/master-list";
import type { Column } from "@/components/app/data-table";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format";
import { buildQuery, canCreate, exportHref, formHref } from "@/lib/masters";
import { getListOptions, listVillages, parseListQuery, type VillageRow } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";

export default async function VillagesPage({
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
    "data_entry",
  ]);
  const params = await searchParams;
  const query = parseListQuery(params);
  const result = listVillages(profile, query);
  const options = getListOptions(profile);

  const filters = { q: query.q, district: query.district, block: query.block, status: query.status };
  const base = `/villages${buildQuery(filters)}`;

  const columns: Column<VillageRow>[] = [
    {
      key: "name",
      label: "Village",
      cell: (row) => (
        <>
          <span className="cell-title">{row.name}</span>
          <span className="cell-sub num">{row.code}</span>
        </>
      ),
    },
    { key: "panchayat", label: "Gram panchayat", cell: (row) => row.panchayat },
    { key: "block", label: "Block", cell: (row) => row.block },
    { key: "district", label: "District", cell: (row) => row.district },
    { key: "beneficiaries", label: "Beneficiaries", end: true, cell: (row) => formatNumber(row.beneficiaries) },
    { key: "projects", label: "Projects", end: true, cell: (row) => row.projects },
    { key: "status", label: "Status", cell: (row) => <StatusPill label={row.status} tone={statusTone(row.status)} /> },
  ];

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} villages · beneficiary and project counts are live`}
        action={canCreate(profile.role) ? { label: "Add village", href: formHref(base) } : undefined}
        secondary={
          <a className="btn" href={exportHref("villages", filters)} download>
            <Icon name="download" size={14} /> Export
          </a>
        }
      />
      <MasterList
        entity="villages"
        profile={profile}
        result={result}
        query={query}
        base={base}
        columns={columns}
        controls={[
          { key: "q", label: "Search name, code or panchayat", type: "search" },
          { key: "district", label: "District", type: "select", options: options.districts.map((value) => ({ value, label: value })) },
          { key: "block", label: "Block", type: "select", options: options.blocks.map((value) => ({ value, label: value })) },
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
