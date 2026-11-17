import Link from "next/link";
import { DataTable, Pager, type Column } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { BeneficiaryFilters } from "@/components/app/beneficiary-filters";
import { BeneficiaryForm } from "@/components/app/beneficiary-form";
import {
  canCreateBeneficiary,
  canEditBeneficiary,
} from "@/lib/beneficiaries";
import { buildQuery } from "@/lib/masters";
import {
  getBeneficiaryFormOptions,
  listBeneficiaries,
  parseBeneficiaryQuery,
  type BeneficiaryRow,
} from "@/lib/queries/beneficiaries";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/data/store";
import { scopeForRole } from "@/lib/rbac";

export default async function BeneficiariesPage({
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
    "data_entry",
  ]);

  const params = await searchParams;
  const query = parseBeneficiaryQuery(params);
  const result = listBeneficiaries(profile, query);
  const options = getBeneficiaryFormOptions(profile);

  // IG-04: scope village list to the user's assigned villages
  const scope = scopeForRole(profile.id, profile.role);
  const scopedVillages = scope.villageIds
    ? db.villages.filter((v) => scope.villageIds!.includes(v.id))
    : db.villages;

  const filters = {
    q: query.q,
    district: query.district,
    block: query.block,
    village: query.villageId,
    gender: query.gender,
    profile: query.profile,
    project: query.projectId,
    status: query.status,
    flag: query.flag,
  };
  const base = `/beneficiaries${buildQuery(filters)}`;

  const editingId = typeof params.id === "string" ? params.id : "";
  const wantsForm = params.form === "new" || Boolean(editingId);
  const canWrite = editingId ? canEditBeneficiary(profile.role) : canCreateBeneficiary(profile.role);
  const showDrawer = wantsForm && canWrite;

  let editInitialValues = undefined;
  if (editingId) {
    const existing = db.beneficiaries.find((b) => b.id === editingId);
    if (existing) {
      editInitialValues = {
        id: existing.id,
        fullName: existing.fullName,
        gender: existing.gender,
        dateOfBirth: existing.dateOfBirth ?? "",
        mobile: existing.mobile,
        villageId: existing.villageId,
        idProofType: existing.idProofType ?? "",
        idProofLast4: existing.idProofLast4 ?? "",
        projectIds: existing.projectIds,
        consentGivenOn: existing.consentGivenOn ?? "",
      };
    }
  }

  const columns: Column<BeneficiaryRow>[] = [
    {
      key: "code",
      label: "Code",
      cell: (row) => <span className="cell-title num">{row.code}</span>,
    },
    {
      key: "name",
      label: "Beneficiary",
      cell: (row) => (
        <>
          <span className="cell-title">{row.fullName}</span>
          <span className="cell-sub">
            {row.gender ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1) : ""}
            {row.age !== null ? ` · ${row.age} yrs` : ""}
          </span>
        </>
      ),
    },
    {
      key: "village",
      label: "Village",
      cell: (row) => (
        <>
          <span className="cell-title">{row.villageName}</span>
          <span className="cell-sub">{row.block ? `${row.block}, ${row.district}` : row.district}</span>
        </>
      ),
    },
    {
      key: "mobile",
      label: "Mobile",
      cell: (row) => <span className="num">{row.mobile}</span>,
    },
    {
      key: "profiles",
      label: "Profiles",
      cell: (row) => (
        <div className="profile-chips" style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {row.profiles.isFarmer && (
            <span className="pill" data-tone="positive" style={{ fontSize: "10px", padding: "1px 6px" }}>
              Farmer
            </span>
          )}
          {row.profiles.isShg && (
            <span className="pill" data-tone="warn" style={{ fontSize: "10px", padding: "1px 6px" }}>
              SHG
            </span>
          )}
          {row.profiles.isPwd && (
            <span className="pill" data-tone="brand" style={{ fontSize: "10px", padding: "1px 6px" }}>
              PWD
            </span>
          )}
          {!row.profiles.isFarmer && !row.profiles.isShg && !row.profiles.isPwd && (
            <span className="muted" style={{ fontSize: "11px" }}>—</span>
          )}
        </div>
      ),
    },
    {
      key: "projects",
      label: "Projects",
      end: true,
      cell: (row) => (
        <span className="num">
          {row.projectsCount} {row.projectsCount === 1 ? "project" : "projects"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      cell: (row) => <StatusPill label={row.status} tone={statusTone(row.status)} />,
    },
  ];

  const exportUrl = `/api/beneficiaries/export${buildQuery(filters)}`;

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} beneficiaries in registry · DPDP compliant`}
        action={
          canCreateBeneficiary(profile.role)
            ? { label: "Add beneficiary", href: `${base}${base.includes("?") ? "&" : "?"}form=new` }
            : undefined
        }
        secondary={
          <a className="btn" href={exportUrl} download>
            <Icon name="download" size={14} /> Export CSV
          </a>
        }
      />

      <BeneficiaryFilters
        options={{
          districts: options.districts,
          blocks: options.blocks,
          villages: scopedVillages.map((v) => ({ id: v.id, name: v.name, block: v.block, district: v.district })),
          projects: db.projects.map((p) => ({ id: p.id, name: p.name, code: p.code })),
        }}
        values={{
          q: query.q,
          district: query.district,
          block: query.block,
          village: query.villageId,
          gender: query.gender,
          profile: query.profile,
          project: query.projectId,
          status: query.status,
          flag: query.flag,
        }}
      />

      <div className="main-body">
        <section className="card list-card">
          <DataTable
            caption={`Beneficiaries · ${result.total} records`}
            columns={columns}
            rows={result.rows}
            href="/beneficiaries"
            empty={
              <EmptyState
                title="No beneficiaries match these filters"
                body="Try adjusting or clearing your filters to see more results."
                actionLabel={canCreateBeneficiary(profile.role) ? "Add beneficiary" : undefined}
                actionHref={
                  canCreateBeneficiary(profile.role)
                    ? `${base}${base.includes("?") ? "&" : "?"}form=new`
                    : undefined
                }
              />
            }
          />
        </section>

        <Pager page={result.page} pages={result.pages} base={base} />
      </div>

      {showDrawer && (
        <>
          <Link className="drawer-scrim" href={base} aria-label="Close the form" />
          <aside className="drawer" aria-labelledby="drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">Beneficiaries</p>
                <h2 id="drawer-title">
                  {editingId ? "Edit beneficiary" : "New beneficiary"}
                </h2>
              </div>
              <Link className="btn" href={base}>
                Close
              </Link>
            </div>
            <BeneficiaryForm
              id={editingId || undefined}
              initialValues={editInitialValues}
              options={{
                villages: options.villages,
                projects: options.projects,
              }}
              cancelHref={base}
            />
          </aside>
        </>
      )}
    </>
  );
}

