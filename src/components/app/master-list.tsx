import Link from "next/link";
import type { Profile } from "@/lib/data/types";
import { canCreate, canEdit, formFields, MASTER_META, type MasterEntity } from "@/lib/masters";
import { getFormOptions, masterValues, type ListQuery, type ListResult } from "@/lib/queries/masters";
import { DataTable, Pager, type Column } from "./data-table";
import { EmptyState } from "./empty-state";
import { MasterFilters, type FilterControl } from "./master-filters";
import { MasterForm } from "./masters-form";

/**
 * Shared list screen for the four master records: URL filters, a paginated
 * table and the 560px create/edit drawer (PRD §9.4), so the four pages only
 * declare their columns and filters.
 */
export function MasterList<T extends { id: string }>({
  entity,
  profile,
  result,
  query,
  base,
  columns,
  controls,
  searchParams,
}: {
  entity: MasterEntity;
  profile: Profile;
  result: ListResult<T>;
  query: ListQuery;
  base: string;
  columns: Column<T>[];
  controls: FilterControl[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const meta = MASTER_META[entity];
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const editingId = typeof searchParams.id === "string" ? searchParams.id : "";
  const wantsForm = searchParams.form === "new" || Boolean(editingId);
  const canWrite = editingId ? canEdit(profile.role, entity) : canCreate(profile.role);
  const showForm = wantsForm && canWrite;

  return (
    <>
      <MasterFilters
        controls={controls}
        values={{
          q: query.q,
          district: query.district,
          block: query.block,
          status: query.status,
          programme: query.programme,
          donor: query.donor,
        }}
      />

      <div className="main-body">
        {saved ? (
          <p className="alert" role="status" data-tone="positive">
            {meta.singular.charAt(0).toUpperCase() + meta.singular.slice(1)} {saved === "created" ? "created" : "saved"}.
          </p>
        ) : null}

        <section className="card list-card">
          <DataTable
            caption={`${meta.label} · ${result.total} record${result.total === 1 ? "" : "s"}`}
            columns={columns}
            rows={result.rows}
            href={`/${entity}`}
            empty={
              <EmptyState
                title={`No ${meta.label.toLowerCase()} match these filters`}
                body="Clear a filter to widen the list, or add the first record."
                actionLabel={canCreate(profile.role) ? `Add ${meta.singular}` : undefined}
                actionHref={canCreate(profile.role) ? `${base}${base.includes("?") ? "&" : "?"}form=new` : undefined}
              />
            }
          />
        </section>

        <Pager page={result.page} pages={result.pages} base={base} />
      </div>

      {showForm ? (
        <>
          <Link className="drawer-scrim" href={base} aria-label="Close the form" />
          <aside className="drawer" aria-labelledby="drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">{meta.label}</p>
                <h2 id="drawer-title">
                  {editingId ? `Edit ${meta.singular}` : `New ${meta.singular}`}
                </h2>
              </div>
              <Link className="btn" href={base}>
                Close
              </Link>
            </div>
            <MasterForm
              entity={entity}
              id={editingId || undefined}
              fields={formFields(entity, getFormOptions(profile))}
              initialValues={editingId ? masterValues(entity, editingId) : { status: "active" }}
              singular={meta.singular}
              cancelHref={base}
            />
          </aside>
        </>
      ) : null}
    </>
  );
}
