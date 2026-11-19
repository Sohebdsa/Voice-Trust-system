import Link from "next/link";
import { DataTable, Pager, type Column } from "@/components/app/data-table";
import { DrawerDialog } from "@/components/app/drawer-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { IndicatorForm } from "@/components/app/indicator-form";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Topbar } from "@/components/app/topbar";
import { db } from "@/lib/data/store";
import { formatDate, formatNumber } from "@/lib/format";
import { buildQuery } from "@/lib/masters";
import {
  INDICATOR_WRITE_ROLES,
  indicatorEmployees,
  listIndicators,
  type IndicatorRow,
} from "@/lib/queries/mel";
import { scopeForRole } from "@/lib/rbac";
import { requireRole } from "@/lib/session";

const ALLOWED_ROLES = ["admin", "programme_manager", "project_coordinator", "mel_officer"] as const;

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  annual: "Annual",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

const ACHIEVEMENT_LABELS: Record<string, string> = {
  on_track: "On track",
  behind: "Behind",
  no_data: "No data",
};

export default async function MelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole([...ALLOWED_ROLES]);
  const params = await searchParams;

  const str = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const q = str("q");
  const projectId = str("project");
  const status = str("status");
  const frequency = str("frequency");
  const page = Math.max(1, Number(str("page")) || 1);

  const result = listIndicators(profile, { q, projectId, status, frequency, page });

  const scope = scopeForRole(profile.id, profile.role);
  const projects = scope.projectIds
    ? db.projects.filter((p) => scope.projectIds!.includes(p.id))
    : db.projects;

  const canWrite = (INDICATOR_WRITE_ROLES as readonly string[]).includes(profile.role);
  const filters = { q, project: projectId, status, frequency };
  const base = `/mel${buildQuery(filters)}`;
  const showForm = params.form === "new" && canWrite;
  const editingId = typeof params.id === "string" ? params.id : "";
  const editing = editingId ? db.indicators.find((i) => i.id === editingId) : undefined;
  const showEdit = !!editing && canWrite;

  const columns: Column<IndicatorRow>[] = [
    {
      key: "name",
      label: "Indicator",
      cell: (row) => (
        <>
          <span className="cell-title">{row.name}</span>
          <span className="cell-sub num">
            {row.code} · {STATUS_LABELS[row.status] ?? row.status}
          </span>
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
    { key: "responsible", label: "Responsible", cell: (row) => row.responsibleName },
    {
      key: "baseline",
      label: "Baseline",
      end: true,
      cell: (row) => <span className="num">{formatNumber(row.baseline)}</span>,
    },
    {
      key: "target",
      label: "Target",
      end: true,
      cell: (row) => (
        <span className="num">
          {formatNumber(row.target)}
          <span className="muted"> {row.unit}</span>
        </span>
      ),
    },
    {
      key: "latest",
      label: "Latest",
      end: true,
      cell: (row) =>
        row.latest ? (
          <>
            <span className="num">{formatNumber(row.latest.value)}</span>
            <span className="cell-sub">{formatDate(row.latest.periodEnd)}</span>
          </>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: "percent",
      label: "Achieved",
      end: true,
      cell: (row) => (
        <span className="num">
          {row.latest ? `${row.percent}%` : "—"}
        </span>
      ),
    },
    {
      key: "frequency",
      label: "Frequency",
      cell: (row) => FREQUENCY_LABELS[row.reportingFrequency] ?? row.reportingFrequency,
    },
    {
      key: "achievement",
      label: "Progress",
      cell: (row) => (
        <StatusPill label={ACHIEVEMENT_LABELS[row.achievement]!} tone={statusTone(row.achievement)} />
      ),
    },
  ];

  const hasFilters = !!(q || projectId || status || frequency);

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${result.total} indicators · PRD §7.8`}
        action={
          canWrite
            ? { label: "+ New indicator", href: `/mel${buildQuery({ ...filters, form: "new" })}` }
            : undefined
        }
      />

      <div
        className="filter-bar"
        style={{ padding: "8px 16px", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}
      >
        <form
          method="get"
          aria-label="Filter indicators"
          className="filter-form"
        >
          <label className="visually-hidden" htmlFor="mel-q">Search indicators</label>
          <input
            id="mel-q"
            className="input"
            name="q"
            type="search"
            placeholder="Search name, code…"
            defaultValue={q}
            autoComplete="off"
            spellCheck={false}
            style={{ width: "200px", fontSize: "var(--fs-13)" }}
          />
          <select className="input" name="project" aria-label="Filter by project" defaultValue={projectId} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="input" name="status" aria-label="Filter by record status" defaultValue={status} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select className="input" name="frequency" aria-label="Filter by reporting frequency" defaultValue={frequency} style={{ fontSize: "var(--fs-13)" }}>
            <option value="">All frequencies</option>
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" className="btn" style={{ fontSize: "var(--fs-13)" }}>Apply</button>
          {hasFilters && (
            <Link href="/mel" className="btn btn-ghost" style={{ fontSize: "var(--fs-13)" }}>Clear</Link>
          )}
        </form>
      </div>

      <div className="main-body">
        <section className="card list-card">
          <DataTable
            caption={`MEL indicators · ${result.total} total`}
            columns={columns}
            rows={result.rows}
            href="/mel"
            empty={
              <EmptyState
                title="No indicators match these filters"
                body={
                  hasFilters
                    ? "Try a different project, status or frequency, or clear the filters."
                    : "Indicators define what the organisation reports to donors. Create the first one for a project."
                }
                actionLabel={canWrite && !hasFilters ? "Create an indicator" : undefined}
                actionHref={canWrite && !hasFilters ? "/mel?form=new" : undefined}
              />
            }
          />
        </section>
        <Pager page={result.page} pages={result.pages} base={base} />
      </div>

      {showForm && (
        <DrawerDialog
          titleId="ind-drawer-title"
          kicker="MEL"
          title="New indicator"
          closeHref={base}
        >
          <IndicatorForm
            projects={projects.map((p) => ({ id: p.id, name: p.name, programmeId: p.programmeId }))}
            programmes={db.programmes.map((p) => ({ id: p.id, name: p.name }))}
            employees={indicatorEmployees().map((e) => ({
              id: e.id,
              fullName: e.fullName,
              designation: e.designation,
            }))}
            cancelHref={base}
          />
        </DrawerDialog>
      )}

      {showEdit && editing && (
        <DrawerDialog
          titleId="ind-edit-drawer-title"
          kicker="MEL"
          title="Edit indicator"
          closeHref={base}
        >
          <IndicatorForm
            projects={projects.map((p) => ({ id: p.id, name: p.name, programmeId: p.programmeId }))}
            programmes={db.programmes.map((p) => ({ id: p.id, name: p.name }))}
            employees={indicatorEmployees().map((e) => ({
              id: e.id,
              fullName: e.fullName,
              designation: e.designation,
            }))}
            cancelHref={base}
            initialValues={{
              id: editing.id,
              name: editing.name,
              description: editing.description ?? "",
              projectId: editing.projectId,
              unit: editing.unit,
              baseline: String(editing.baseline),
              target: String(editing.target),
              reportingFrequency: editing.reportingFrequency,
              dataSource: editing.dataSource ?? "",
              responsibleEmployeeId: editing.responsibleEmployeeId ?? "",
              genderDisaggregated: editing.genderDisaggregated ? "1" : "",
              status: editing.status,
            }}
          />
        </DrawerDialog>
      )}
    </>
  );
}
