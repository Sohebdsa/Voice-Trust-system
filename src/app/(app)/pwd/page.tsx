import Link from "next/link";
import { DataTable, Pager, type Column } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { PwdForm } from "@/components/app/pwd-form";
import { BeneficiarySelectNav } from "@/components/app/beneficiary-select-nav";
import { buildQuery } from "@/lib/masters";
import { canAccessPwd, canCreatePwd, canEditPwd } from "@/lib/profiles";
import { listPwdProfiles, type PwdRow } from "@/lib/queries/profiles";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/data/store";
import { scopeForRole } from "@/lib/rbac";

export default async function PwdPage({
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
  ]);

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const villageId = typeof params.village === "string" ? params.village : typeof params.villageId === "string" ? params.villageId : "";
  const disabilityType = typeof params.disabilityType === "string" ? params.disabilityType : "";
  const page = Math.max(1, Number(params.page) || 1);

  const result = listPwdProfiles(profile, { q, villageId, disabilityType, page });
  const scope = scopeForRole(profile.id, profile.role);
  const scopedVillages = scope.villageIds
    ? db.villages.filter((v) => scope.villageIds!.includes(v.id))
    : db.villages;

  const filters = { q, village: villageId, disabilityType };
  const base = `/pwd${buildQuery(filters)}`;

  const editingId = typeof params.id === "string" ? params.id : "";
  const addingBenId = typeof params.beneficiaryId === "string" ? params.beneficiaryId : "";
  const wantsForm = params.form === "new" || Boolean(editingId) || Boolean(addingBenId);
  const canWrite = editingId ? canEditPwd(profile.role) : canCreatePwd(profile.role);
  const showDrawer = wantsForm && canWrite;

  let editInitialValues = undefined;
  let targetBenId = addingBenId;
  let targetBenName = "";

  if (editingId) {
    const existing = db.pwdProfiles.find((p) => p.id === editingId);
    if (existing) {
      targetBenId = existing.beneficiaryId;
      editInitialValues = {
        id: existing.id,
        beneficiaryId: existing.beneficiaryId,
        disabilityType: existing.disabilityType,
        disabilityPercentage: String(existing.disabilityPercentage),
        certificateNo: existing.certificateNo,
        certificateIssueDate: existing.certificateIssueDate ?? "",
        certificateIssuingAuthority: existing.certificateIssuingAuthority ?? "",
        educationLevel: existing.educationLevel,
        vocationalStatus: existing.vocationalStatus,
        accessibilityNeeds: existing.accessibilityNeeds ?? "",
        assistiveDevice: existing.assistiveDevice ?? "",
        individualPlan: existing.individualPlan ?? "",
        outcome: existing.outcome ?? "",
      };
    }
  }

  if (targetBenId) {
    const ben = db.beneficiaries.find((b) => b.id === targetBenId);
    if (ben) targetBenName = `${ben.fullName} (${ben.code})`;
  }

  const existingPwdBenIds = new Set(db.pwdProfiles.map((p) => p.beneficiaryId));
  const availableBens = db.beneficiaries
    .filter((b) => b.status === "active" && (!existingPwdBenIds.has(b.id) || b.id === targetBenId))
    .slice(0, 50);

  // Aggregated view for MEL Officer (PRD §7.6: MEL officer sees only aggregated counts by disability type & gender)
  const isMel = profile.role === "mel_officer";
  const categoryStats = db.pwdProfiles.reduce((acc, p) => {
    const ben = db.beneficiaries.find((b) => b.id === p.beneficiaryId);
    const gender = ben?.gender === "female" ? "female" : "male";
    const entry = acc[p.disabilityType] ?? { category: p.disabilityType, total: 0, male: 0, female: 0 };
    entry.total++;
    if (gender === "female") entry.female++;
    else entry.male++;
    acc[p.disabilityType] = entry;
    return acc;
  }, {} as Record<string, { category: string; total: number; male: number; female: number }>);
  const melStats = Object.values(categoryStats);

  const columns: Column<PwdRow>[] = [
    {
      key: "code",
      label: "PWD ID",
      cell: (row) => <span className="cell-title num">{row.code}</span>,
    },
    {
      key: "beneficiary",
      label: "Beneficiary",
      cell: (row) => (
        <>
          <Link href={`/beneficiaries/${row.beneficiaryId}?tab=pwd`} className="cell-title">
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
      key: "type",
      label: "Category",
      cell: (row) => (
        <span className="pill" data-tone="brand" style={{ fontSize: "11px", padding: "1px 6px" }}>
          {row.disabilityType}
        </span>
      ),
    },
    {
      key: "percentage",
      label: "Percentage",
      end: true,
      cell: (row) => <strong className="num">{row.disabilityPercentage}%</strong>,
    },
    {
      key: "certificate",
      label: "UDID / Certificate",
      cell: (row) => <span className="cell-sub num">{row.certificateNo}</span>,
    },
    {
      key: "vocation",
      label: "Livelihood Status",
      cell: (row) => row.vocationalStatus,
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
        subtitle={`${result.total} PWD / GAP profiles · Disability Inclusion`}
        secondary={
          <span
            className="tooltip-wrap"
            tabIndex={0}
            data-tooltip="Confidential Registry (PRD §5.2 & §7.6). Access restricted by role; all lookups are audit-logged."
            data-tooltip-pos="bottom"
            data-tooltip-align="right"
            aria-label="Confidential Disability Registry compliance notice"
          >
            <span
              className="pill"
              data-tone="warn"
              style={{
                fontSize: "var(--fs-12)",
                padding: "3px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                cursor: "help",
              }}
            >
              <Icon name="lock" size={12} /> Confidential ⓘ
            </span>
          </span>
        }
        action={
          canCreatePwd(profile.role)
            ? { label: "+ Add PWD profile", href: `${base}${base.includes("?") ? "&" : "?"}form=new` }
            : undefined
        }
      />

      {/* Filter Bar */}
      <div className="filter-bar" style={{ padding: "8px 16px", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
        <form method="get" className="filter-form">
          <input
            className="input"
            name="q"
            placeholder="Search name, code, UDID…"
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

          <select className="input" name="disabilityType" defaultValue={disabilityType} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All categories</option>
            <option value="Locomotor">Locomotor</option>
            <option value="Visual">Visual</option>
            <option value="Hearing">Hearing</option>
            <option value="Intellectual">Intellectual</option>
            <option value="Multiple">Multiple</option>
          </select>

          <button type="submit" className="btn" style={{ fontSize: "var(--fs-13)" }}>
            Apply
          </button>
          {(q || villageId || disabilityType) && (
            <Link href="/pwd" className="btn btn-ghost" style={{ fontSize: "var(--fs-13)" }}>
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="main-body">
        {isMel ? (
          <section className="card list-card" style={{ padding: "16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: "0 0 6px 0" }}>Disability Inclusion MEL Summary</h3>
              <p className="muted" style={{ margin: 0, fontSize: "var(--fs-13)" }}>
                PRD §7.6 compliance view: Aggregated counts by disability category and gender (individual names suppressed).
              </p>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Disability Category</th>
                    <th data-end="">Female</th>
                    <th data-end="">Male</th>
                    <th data-end="">Total Enrolled</th>
                    <th data-end="">% of Total PWD</th>
                  </tr>
                </thead>
                <tbody>
                  {melStats.map((s) => (
                    <tr key={s.category}>
                      <td><strong>{s.category}</strong></td>
                      <td data-end="" className="num">{s.female}</td>
                      <td data-end="" className="num">{s.male}</td>
                      <td data-end="" className="num"><strong>{s.total}</strong></td>
                      <td data-end="" className="num">{Math.round((s.total / (db.pwdProfiles.length || 1)) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total</strong></td>
                    <td data-end="" className="num"><strong>{melStats.reduce((sum, s) => sum + s.female, 0)}</strong></td>
                    <td data-end="" className="num"><strong>{melStats.reduce((sum, s) => sum + s.male, 0)}</strong></td>
                    <td data-end="" className="num"><strong>{db.pwdProfiles.length}</strong></td>
                    <td data-end="" className="num"><strong>100%</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        ) : (
          <>
            <section className="card list-card">
              <DataTable
                caption={`Disability Inclusion Registry · ${result.total} beneficiaries`}
                columns={columns}
                rows={result.rows}
                href="/pwd"
                empty={
                  <EmptyState
                    title="No PWD records found"
                    body="Register disability inclusion profiles to coordinate assistive devices and livelihood support."
                  />
                }
              />
            </section>
            <Pager page={result.page} pages={result.pages} base={base} />
          </>
        )}
      </div>

      {showDrawer && (
        <>
          <Link className="drawer-scrim" href={base} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="pwd-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">Disability Inclusion (GAP)</p>
                <h2 id="pwd-drawer-title">{editingId ? "Edit PWD Profile" : "Register PWD Profile"}</h2>
              </div>
              <Link className="btn" href={base}>
                Close
              </Link>
            </div>

            {!targetBenId && (
              <div style={{ padding: "16px 20px 0" }}>
                <label className="label">Select Registered Beneficiary</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <BeneficiarySelectNav base={base} options={availableBens} />
                </div>
                <p className="help">Every PWD record must link to an enrolled beneficiary.</p>
              </div>
            )}

            {targetBenId && (
              <PwdForm
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
