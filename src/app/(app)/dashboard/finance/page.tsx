import { FilterBar, Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { db } from "@/lib/data/store";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { requireRole } from "@/lib/session";

export default async function FinanceDashboardPage() {
  const profile = await requireRole(["admin", "finance"]);
  const activeProjects = db.projects.filter((project) => project.status === "active");
  const total = activeProjects.reduce((sum, project) => sum + project.approvedBudget, 0);

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle="Finance · approved budget summary (read-only in the MVP)"
      />
      <FilterBar
        items={[
          { label: "Period", value: "Current grants" },
          { label: "Programme", value: "All programmes" },
          { label: "Donor", value: "All donors" },
        ]}
      />

      <div className="main-body">
        <section className="card" aria-labelledby="budget-total">
          <div className="card-head">
            <Icon name="wallet" size={14} />
            <span id="budget-total">Approved budget · active projects</span>
          </div>
          <p className="budget-amount" style={{ fontSize: 28 }}>
            {formatCurrency(total)}
          </p>
          <p className="footnote">
            {activeProjects.length} active projects. Expenditure, utilisation and vouchers are Phase 2 — the MVP
            shows the approved budget only (PRD §8.4).
          </p>
        </section>

        <section className="card" aria-labelledby="budget-projects">
          <div className="card-head">
            <Icon name="folder" size={14} />
            <span id="budget-projects">Budget by project</span>
          </div>
          {activeProjects.map((project) => {
            const donor = db.donors.find((d) => d.id === project.donorId);
            return (
              <div
                className="breakdown-row"
                key={project.id}
                style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto" }}
              >
                <span className="breakdown-name">{project.name}</span>
                <span className="breakdown-pct muted">{donor?.name ?? "—"}</span>
                <span className="breakdown-count num">{formatCurrencyCompact(project.approvedBudget)}</span>
              </div>
            );
          })}
        </section>

        <section className="card">
          <div className="card-head">
            <Icon name="clock" size={14} />
            <span>Expenditure and utilisation</span>
          </div>
          <p className="budget-note" style={{ fontSize: 13 }}>
            Available once the Finance module is enabled. Expense entry, approvals and double-entry accounting stay
            out of the MVP by design.
          </p>
        </section>
      </div>
    </>
  );
}
