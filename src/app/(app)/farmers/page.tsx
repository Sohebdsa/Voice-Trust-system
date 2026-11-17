import Link from "next/link";
import { DataTable, Pager, type Column } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { FarmerForm } from "@/components/app/farmer-form";
import { buildQuery } from "@/lib/masters";
import {
  canAccessFarmer,
  canCreateFarmer,
  canEditFarmer,
} from "@/lib/profiles";
import { listFarmers, type FarmerRow } from "@/lib/queries/profiles";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/data/store";
import { scopeForRole } from "@/lib/rbac";

export default async function FarmersPage({
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
  const q = typeof params.q === "string" ? params.q : "";
  const villageId = typeof params.village === "string" ? params.village : typeof params.villageId === "string" ? params.villageId : "";
  const organicStatus = typeof params.organicStatus === "string" ? params.organicStatus : "";
  const crop = typeof params.crop === "string" ? params.crop : "";
  const page = Math.max(1, Number(params.page) || 1);

  const result = listFarmers(profile, { q, villageId, organicStatus, crop, page });
  const scope = scopeForRole(profile.id, profile.role);
  const scopedVillages = scope.villageIds
    ? db.villages.filter((v) => scope.villageIds!.includes(v.id))
    : db.villages;

  const filters = { q, village: villageId, organicStatus, crop };
  const base = `/farmers${buildQuery(filters)}`;

  const editingId = typeof params.id === "string" ? params.id : "";
  const addingBenId = typeof params.beneficiaryId === "string" ? params.beneficiaryId : "";
  const wantsForm = params.form === "new" || Boolean(editingId) || Boolean(addingBenId);
  const canWrite = editingId ? canEditFarmer(profile.role) : canCreateFarmer(profile.role);
  const showDrawer = wantsForm && canWrite;

  let editInitialValues = undefined;
  let targetBenId = addingBenId;
  let targetBenName = "";

  if (editingId) {
    const existing = db.farmers.find((f) => f.id === editingId);
    if (existing) {
      targetBenId = existing.beneficiaryId;
      editInitialValues = {
        id: existing.id,
        beneficiaryId: existing.beneficiaryId,
        landHoldingAcres: String(existing.landHoldingAcres),
        landOwnership: existing.landOwnership,
        farmingType: existing.farmingType,
        organicStatus: existing.organicStatus,
        irrigationSource: existing.irrigationSource,
        organicPractices: existing.organicPractices ?? "",
        supportReceived: existing.supportReceived ?? "",
        equipmentReceived: existing.equipmentReceived ?? "",
        gpsLatitude: existing.gpsLatitude ? String(existing.gpsLatitude) : "",
        gpsLongitude: existing.gpsLongitude ? String(existing.gpsLongitude) : "",
        followupNotes: existing.followupNotes ?? "",
        crops: existing.crops,
      };
    }
  }

  if (targetBenId) {
    const ben = db.beneficiaries.find((b) => b.id === targetBenId);
    if (ben) targetBenName = `${ben.fullName} (${ben.code})`;
  }

  // Available beneficiaries without a farmer profile yet
  const farmerBenIds = new Set(db.farmers.map((f) => f.beneficiaryId));
  const availableBens = db.beneficiaries
    .filter((b) => b.status === "active" && (!farmerBenIds.has(b.id) || b.id === targetBenId))
    .slice(0, 50);

  const columns: Column<FarmerRow>[] = [
    {
      key: "code",
      label: "Farmer ID",
      cell: (row) => <span className="cell-title num">{row.code}</span>,
    },
    {
      key: "beneficiary",
      label: "Beneficiary",
      cell: (row) => (
        <>
          <Link href={`/beneficiaries/${row.beneficiaryId}?tab=farmer`} className="cell-title">
            {row.beneficiaryName}
          </Link>
          <span className="cell-sub num">{row.beneficiaryCode}</span>
        </>
      ),
    },
    {
      key: "village",
      label: "Village",
      cell: (row) => row.villageName,
    },
    {
      key: "land",
      label: "Land Holding",
      end: true,
      cell: (row) => <span className="num">{row.landHoldingAcres} ac</span>,
    },
    {
      key: "practice",
      label: "Practice",
      cell: (row) => (
        <span className="pill" data-tone="neutral" style={{ fontSize: "11px", padding: "1px 6px" }}>
          {row.farmingType}
        </span>
      ),
    },
    {
      key: "organic",
      label: "Organic Status",
      cell: (row) => (
        <span
          className="pill"
          data-tone={row.organicStatus === "certified" ? "positive" : row.organicStatus === "in_conversion" ? "warn" : "neutral"}
          style={{ fontSize: "11px", padding: "1px 6px" }}
        >
          {row.organicStatus.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "crops",
      label: "Cultivated Crops",
      cell: (row) => <span className="cell-sub">{row.cropsSummary}</span>,
    },
    {
      key: "status",
      label: "Status",
      cell: (row) => <StatusPill label={row.status} tone={statusTone(row.status)} />,
    },
  ];

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} registered farmers · PRD §7.4 Agriculture`}
        action={
          canCreateFarmer(profile.role)
            ? { label: "+ Add farmer profile", href: `${base}${base.includes("?") ? "&" : "?"}form=new` }
            : undefined
        }
      />

      {/* Filter Bar */}
      <div className="filter-bar" style={{ padding: "8px 16px", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
        <form method="get" className="filter-form" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            name="q"
            placeholder="Search name, code, farmer ID…"
            defaultValue={q}
            style={{ width: "240px", fontSize: "var(--fs-13)" }}
          />

          <select className="input" name="village" defaultValue={villageId} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All villages</option>
            {scopedVillages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <select className="input" name="organicStatus" defaultValue={organicStatus} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All organic statuses</option>
            <option value="none">None</option>
            <option value="in_conversion">In conversion</option>
            <option value="certified">Certified organic</option>
          </select>

          <input
            className="input"
            name="crop"
            placeholder="Filter by crop (e.g. Rice)"
            defaultValue={crop}
            style={{ width: "160px", fontSize: "var(--fs-13)" }}
          />

          <button type="submit" className="btn" style={{ fontSize: "var(--fs-13)" }}>
            Apply
          </button>
          {(q || villageId || organicStatus || crop) && (
            <Link href="/farmers" className="btn btn-ghost" style={{ fontSize: "var(--fs-13)" }}>
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="main-body">
        <section className="card list-card">
          <DataTable
            caption={`Farmer Master Registry · ${result.total} farmers`}
            columns={columns}
            rows={result.rows}
            href="/farmers"
            empty={
              <EmptyState
                title="No farmers match these criteria"
                body="Adjust your search, village, or crop filters to see more results."
              />
            }
          />
        </section>

        <Pager page={result.page} pages={result.pages} base={base} />
      </div>

      {showDrawer && (
        <>
          <Link className="drawer-scrim" href={base} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="farmer-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">Agriculture Programme</p>
                <h2 id="farmer-drawer-title">
                  {editingId ? "Edit Farmer Profile" : "Register Farmer Profile"}
                </h2>
              </div>
              <Link className="btn" href={base}>
                Close
              </Link>
            </div>

            {!targetBenId && (
              <div style={{ padding: "16px 20px 0" }}>
                <label className="label">Select Registered Beneficiary</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className="input"
                    onChange={(e) => {
                      if (e.target.value) {
                        window.location.href = `${base}${base.includes("?") ? "&" : "?"}beneficiaryId=${e.target.value}`;
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Choose beneficiary…</option>
                    {availableBens.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.fullName} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="help">Every farmer profile must link to an enrolled beneficiary.</p>
              </div>
            )}

            {targetBenId && (
              <FarmerForm
                beneficiaryId={targetBenId}
                beneficiaryName={targetBenName}
                initialValues={editInitialValues}
                cancelHref={base}
              />
            )}
          </aside>
        </>
      )}
    </>
  );
}
