import Link from "next/link";
import { DataTable, Pager, type Column } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { ShgForm } from "@/components/app/shg-form";
import { buildQuery } from "@/lib/masters";
import { formatCurrency } from "@/lib/format";
import { canCreateShg, canEditShg } from "@/lib/profiles";
import { listShgs, type ShgRow } from "@/lib/queries/profiles";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/data/store";
import { scopeForRole } from "@/lib/rbac";

export default async function ShgsPage({
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
  const page = Math.max(1, Number(params.page) || 1);

  const result = listShgs(profile, { q, villageId, page });
  const scope = scopeForRole(profile.id, profile.role);
  const scopedVillages = scope.villageIds
    ? db.villages.filter((v) => scope.villageIds!.includes(v.id))
    : db.villages;

  const filters = { q, village: villageId };
  const base = `/shgs${buildQuery(filters)}`;

  const editingId = typeof params.id === "string" ? params.id : "";
  const wantsForm = params.form === "new" || Boolean(editingId);
  const canWrite = editingId ? canEditShg(profile.role) : canCreateShg(profile.role);
  const showDrawer = wantsForm && canWrite;

  let editInitialValues = undefined;
  if (editingId) {
    const existing = db.shgs.find((s) => s.id === editingId);
    if (existing) {
      editInitialValues = {
        id: existing.id,
        name: existing.name,
        villageId: existing.villageId,
        formationDate: existing.formationDate,
        meetingFrequency: existing.meetingFrequency,
        projectIds: existing.projectIds ?? [],
      };
    }
  }

  const columns: Column<ShgRow>[] = [
    {
      key: "code",
      label: "SHG Code",
      cell: (row) => <span className="cell-title num">{row.code}</span>,
    },
    {
      key: "name",
      label: "Group Name",
      cell: (row) => (
        <>
          <Link href={`/shgs/${row.id}`} className="cell-title">
            {row.name}
          </Link>
          <span className="cell-sub">{row.meetingFrequency} savings cadence</span>
        </>
      ),
    },
    {
      key: "village",
      label: "Village",
      cell: (row) => row.villageName,
    },
    {
      key: "members",
      label: "Active Members",
      end: true,
      cell: (row) => <span className="num">{row.memberCount} members</span>,
    },
    {
      key: "savings",
      label: "Total Savings",
      end: true,
      cell: (row) => <strong className="num">{formatCurrency(row.totalSavings)}</strong>,
    },
    {
      key: "formation",
      label: "Formation Date",
      cell: (row) => row.formationDate,
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
        subtitle={`${result.total} Self-Help Groups · Women's Livelihood & Savings`}
        action={
          canCreateShg(profile.role)
            ? { label: "+ Form new SHG", href: `${base}${base.includes("?") ? "&" : "?"}form=new` }
            : undefined
        }
      />

      {/* Filter Bar */}
      <div className="filter-bar" style={{ padding: "8px 16px", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
        <form method="get" className="filter-form">
          <input
            className="input"
            name="q"
            placeholder="Search group name or code…"
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

          <button type="submit" className="btn" style={{ fontSize: "var(--fs-13)" }}>
            Apply
          </button>
          {(q || villageId) && (
            <Link href="/shgs" className="btn btn-ghost" style={{ fontSize: "var(--fs-13)" }}>
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="main-body">
        <section className="card list-card">
          <DataTable
            caption={`Self-Help Groups · ${result.total} active groups`}
            columns={columns}
            rows={result.rows}
            href="/shgs"
            empty={
              <EmptyState
                title="No SHGs found"
                body="Form your first self-help group to organize women's savings and enterprise activities."
                actionLabel={canCreateShg(profile.role) ? "+ Form new SHG" : undefined}
                actionHref={canCreateShg(profile.role) ? `${base}${base.includes("?") ? "&" : "?"}form=new` : undefined}
              />
            }
          />
        </section>

        <Pager page={result.page} pages={result.pages} base={base} />
      </div>

      {showDrawer && (
        <>
          <Link className="drawer-scrim" href={base} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="shg-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">Women Livelihood</p>
                <h2 id="shg-drawer-title">{editingId ? "Edit Self-Help Group" : "Form New Self-Help Group"}</h2>
              </div>
              <Link className="btn" href={base}>
                Close
              </Link>
            </div>
            <ShgForm
              initialValues={editInitialValues}
              options={{
                villages: scopedVillages.map((v) => ({ value: v.id, label: `${v.name} (${v.block})` })),
                projects: db.projects.filter((p) => p.status === "active").map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
              }}
              cancelHref={base}
            />
          </aside>
        </>
      )}
    </>
  );
}
