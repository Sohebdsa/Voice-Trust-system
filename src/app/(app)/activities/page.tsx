import Link from "next/link";
import { DataTable, Pager, type Column } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/data/store";
import { scopeForRole } from "@/lib/rbac";
import { buildQuery, PAGE_SIZE } from "@/lib/masters";
import { listActivities, type ActivityRow } from "@/lib/queries/activities";
import { ActivityForm } from "@/components/app/activity-form";
import { DrawerDialog } from "@/components/app/drawer-dialog";

const ALLOWED_ROLES = [
  "admin",
  "programme_manager",
  "project_coordinator",
  "mel_officer",
  "field_staff",
  "data_entry",
] as const;

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  training: "Training",
  awareness: "Awareness",
  meeting: "Meeting",
  field_visit: "Field visit",
  distribution: "Distribution",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole([...ALLOWED_ROLES]);
  const params = await searchParams;

  const str = (k: string) => (typeof params[k] === "string" ? params[k] : "");
  const q = str("q");
  const type = str("type");
  const status = str("status");
  const projectId = str("project");
  const villageId = str("village");
  const page = Math.max(1, Number(str("page")) || 1);

  const result = listActivities(profile, { q, type, status, projectId, villageId, page });

  const scope = scopeForRole(profile.id, profile.role);
  const scopedVillages = scope.villageIds
    ? db.villages.filter((v) => scope.villageIds!.includes(v.id))
    : db.villages;
  const scopedProjects = scope.projectIds
    ? db.projects.filter((p) => scope.projectIds!.includes(p.id))
    : db.projects;

  const filters = { q, type, status, project: projectId, village: villageId };
  const base = `/activities${buildQuery(filters)}`;
  const canWrite = ["admin", "programme_manager", "project_coordinator", "field_staff", "data_entry"].includes(profile.role);

  const wantsForm = params.form === "new" || typeof params.id === "string";
  const editingId = typeof params.id === "string" ? params.id : "";
  const showDrawer = wantsForm && canWrite;

  let editInitial: Record<string, string> | undefined;
  if (editingId) {
    const ex = db.activities.find((a) => a.id === editingId);
    if (ex) {
      editInitial = {
        id: ex.id,
        title: ex.title,
        activityType: ex.activityType,
        projectId: ex.projectId,
        villageId: ex.villageId,
        startDate: ex.startDate,
        endDate: ex.endDate,
        status: ex.status,
        targetParticipants: String(ex.targetParticipants),
        expenditure: ex.expenditure != null ? String(ex.expenditure) : "",
        description: ex.description,
      };
    }
  }

  const columns: Column<ActivityRow>[] = [
    {
      key: "code",
      label: "Code",
      cell: (row) => <span className="cell-title num">{row.code}</span>,
    },
    {
      key: "title",
      label: "Activity",
      cell: (row) => (
        <>
          <Link href={`/activities/${row.id}`} className="cell-title">
            {row.title}
          </Link>
          <span className="cell-sub">{ACTIVITY_TYPE_LABELS[row.activityType] ?? row.activityType}</span>
        </>
      ),
    },
    {
      key: "project",
      label: "Project",
      cell: (row) => (
        <>
          <span className="cell-title">{row.projectName}</span>
          <span className="cell-sub">{row.programmeName}</span>
        </>
      ),
    },
    {
      key: "village",
      label: "Village",
      cell: (row) => row.villageName,
    },
    {
      key: "date",
      label: "Date",
      cell: (row) => <span className="num">{row.startDate}</span>,
    },
    {
      key: "participants",
      label: "Participants",
      end: true,
      cell: (row) => (
        <span className="num">
          {row.actualCount}
          <span className="muted"> / {row.targetParticipants}</span>
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      cell: (row) => <StatusPill label={STATUS_LABELS[row.status] ?? row.status} tone={statusTone(row.status)} />,
    },
  ];

  const hasFilters = !!(q || type || status || projectId || villageId);

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} activities · PRD §7.7`}
        action={
          canWrite
            ? { label: "Log activity", href: `${base}${base.includes("?") ? "&" : "?"}form=new` }
            : undefined
        }
      />

      {/* Filter bar */}
      <div
        className="filter-bar"
        style={{ padding: "8px 16px", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}
      >
        <search>
        <form method="get" aria-label="Filter activities" className="filter-form">
          <label className="visually-hidden" htmlFor="act-q">Search activities</label>
          <input
            id="act-q"
            className="input"
            name="q"
            type="search"
            placeholder="Search title, code…"
            defaultValue={q}
            autoComplete="off"
            spellCheck={false}
            style={{ width: "220px", fontSize: "var(--fs-13)" }}
          />
          <select className="input" name="type" aria-label="Filter by type" defaultValue={type} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All types</option>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select className="input" name="status" aria-label="Filter by status" defaultValue={status} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select className="input" name="project" aria-label="Filter by project" defaultValue={projectId} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All projects</option>
            {scopedProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="input" name="village" aria-label="Filter by village" defaultValue={villageId} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All villages</option>
            {scopedVillages.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button type="submit" className="btn" style={{ fontSize: "var(--fs-13)" }}>Apply</button>
          {hasFilters && (
            <Link href="/activities" className="btn btn-ghost" style={{ fontSize: "var(--fs-13)" }}>Clear</Link>
          )}
        </form>
        </search>
      </div>

      <div className="main-body">
        <section className="card list-card">
          <DataTable
            caption={`Activities · ${result.total} total`}
            columns={columns}
            rows={result.rows}
            href="/activities"
            empty={
              <EmptyState
                title="No activities match these filters"
                body="Try different type, status, project or village filters, or clear them all."
              />
            }
          />
        </section>
        <Pager page={result.page} pages={result.pages} base={base} />
      </div>

      {showDrawer && (
        <DrawerDialog
          titleId="act-drawer-title"
          kicker="Activities"
          title={editingId ? "Edit activity" : "Log new activity"}
          closeHref={base}
        >
          <ActivityForm
            projects={scopedProjects.map((p) => ({ id: p.id, name: p.name, programmeId: p.programmeId }))}
            villages={scopedVillages.map((v) => ({ id: v.id, name: v.name }))}
            programmes={db.programmes.map((p) => ({ id: p.id, name: p.name }))}
            cancelHref={base}
            initialValues={editInitial}
          />
        </DrawerDialog>
      )}
    </>
  );
}
