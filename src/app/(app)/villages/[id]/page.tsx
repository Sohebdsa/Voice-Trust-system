import Link from "next/link";
import { notFound } from "next/navigation";
import type { Column } from "@/components/app/data-table";
import { DataTable } from "@/components/app/data-table";
import { ArchiveButton, DetailHeader, Facts } from "@/components/app/master-detail";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Icon } from "@/components/ui/icons";
import { formatCurrency, formatNumber } from "@/lib/format";
import { canArchive, canEdit } from "@/lib/masters";
import { findVillage, linkedProjects, villageDetail } from "@/lib/queries/masters";
import { requireRole } from "@/lib/session";

type Row = ReturnType<typeof linkedProjects>[number];

export default async function VillageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole([
    "admin",
    "programme_manager",
    "project_coordinator",
    "mel_officer",
    "field_staff",
    "finance",
    "data_entry",
  ]);
  const { id } = await params;
  const village = findVillage(id);
  if (!village) notFound();

  const detail = villageDetail(village, profile);

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
    { key: "donor", label: "Donor", cell: (row) => row.donor },
    { key: "beneficiaries", label: "Beneficiaries", end: true, cell: (row) => formatNumber(row.beneficiaries) },
    { key: "budget", label: "Approved budget", end: true, cell: (row) => formatCurrency(row.budget) },
    { key: "status", label: "Status", cell: (row) => <StatusPill label={row.status.replace("_", " ")} tone={statusTone(row.status)} /> },
  ];

  return (
    <>
      <DetailHeader
        backHref="/villages"
        backLabel="Villages"
        title={village.name}
        code={village.code}
        status={village.status}
        subtitle={`${village.block} block · ${village.district}`}
      >
        {canEdit(profile.role, "villages") ? (
          <Link className="btn" href={`/villages?id=${village.id}`}>
            Edit
          </Link>
        ) : null}
        {canArchive(profile.role) ? <ArchiveButton entity="villages" id={village.id} name={village.name} /> : null}
      </DetailHeader>

      <div className="main-body">
        <div className="chart-row-bottom">
          <section className="card" aria-labelledby="village-record">
            <div className="card-head">
              <Icon name="map" size={14} />
              <span id="village-record">Village record</span>
            </div>
            <Facts items={detail.facts} />
          </section>
          <section className="card" aria-labelledby="village-reach">
            <div className="card-head">
              <Icon name="people" size={14} />
              <span id="village-reach">Reach in this village</span>
            </div>
            <Facts
              items={[
                { label: "Active beneficiaries", value: formatNumber(detail.beneficiaries) },
                { label: "Projects covering it", value: String(detail.projects.length) },
                { label: "Activities recorded", value: String(detail.activities) },
              ]}
            />
          </section>
        </div>

        <section className="card list-card">
          <DataTable
            caption={`Projects covering ${village.name}`}
            columns={columns}
            rows={detail.projects}
            href="/projects"
            empty={
              <p className="empty">
                <strong>No projects cover this village yet.</strong>
                <span>Attach it to a project from the project form.</span>
              </p>
            }
          />
        </section>
      </div>
    </>
  );
}
