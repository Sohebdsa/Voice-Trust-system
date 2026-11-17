import { FilterBar, Topbar } from "@/components/app/topbar";
import { KpiCard } from "@/components/app/kpi-card";
import { ListCard } from "@/components/app/list-card";
import { Icon } from "@/components/ui/icons";
import { formatNumber, relativeTime } from "@/lib/format";
import { getHrData } from "@/lib/queries/hr";
import { requireRole } from "@/lib/session";

export default async function HrDashboardPage() {
  const profile = await requireRole(["admin", "hr_admin"]);
  const data = getHrData();
  const present = data.today.rows.find((row) => row.status === "present");
  const onLeave = data.today.rows.find((row) => row.status === "on_leave");
  const pending = data.pendingLeave.length;

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`HR & Administration · ${data.headcount.active} active staff`}
        action={{ label: "Add employee", href: "/employees/new" }}
      />
      <FilterBar
        items={[
          { label: "Period", value: "This month" },
          { label: "Department", value: "All departments" },
          { label: "Location", value: "Thane" },
        ]}
      />

      <div className="main-body">
        <section className="kpi-grid" aria-label="HR headline numbers">
          <KpiCard
            label="Active employees"
            value={data.headcount.active}
            trend="flat"
            deltaLabel={`${data.headcount.total} on record`}
            href="/employees"
            hint={`${data.headcount.exited} exited, ${data.headcount.onNotice} on notice`}
          />
          <KpiCard
            label="Present today"
            value={present?.count ?? 0}
            trend="flat"
            deltaLabel={`${present?.percent ?? 0}%`}
            href="/attendance"
            hint={data.today.date}
          />
          <KpiCard
            label="On leave today"
            value={onLeave?.count ?? 0}
            trend="flat"
            deltaLabel={`${onLeave?.percent ?? 0}%`}
            href="/attendance?status=on_leave"
            hint="Approved leave for today"
          />
          <KpiCard
            label="Leave approvals pending"
            value={pending}
            trend="flat"
            deltaLabel={pending > 0 ? "Needs action" : "Clear"}
            href="/leave?status=pending"
            hint="Approve or reject with a remark"
          />
        </section>

        <div className="chart-row-bottom">
          <section className="card" aria-labelledby="attendance-title">
            <div className="card-head">
              <Icon name="clock" size={14} />
              <span id="attendance-title">Today&apos;s attendance</span>
              <span className="card-link">{data.today.totalMarked} marked</span>
            </div>
            {data.today.rows.map((row) => (
              <div className="meter" key={row.status}>
                <div className="meter-top">
                  <span>{row.label}</span>
                  <span className="meter-value">
                    {row.count} · {row.percent}%
                  </span>
                </div>
                <div
                  className="meter-track"
                  role="progressbar"
                  aria-valuenow={row.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.label}: ${row.count} employees, ${row.percent}%`}
                >
                  <div className="meter-fill" style={{ inlineSize: `${row.percent}%` }} />
                </div>
              </div>
            ))}
            {data.today.rows.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                No attendance marked yet today. HR marks the daily grid on the Attendance screen.
              </p>
            ) : null}
          </section>

          <section className="card" aria-labelledby="department-title">
            <div className="card-head">
              <Icon name="hr" size={14} />
              <span id="department-title">Staff by department</span>
              <span className="card-link">{formatNumber(data.headcount.active)} active</span>
            </div>
            {data.byDepartment.map((row) => (
              <div className="breakdown-row" key={row.department} style={{ gridTemplateColumns: "1fr auto" }}>
                <span className="breakdown-name">{row.department}</span>
                <span className="breakdown-count num">{row.count}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="chart-row-bottom">
          <section className="card" aria-labelledby="leave-title">
            <div className="card-head">
              <Icon name="calendar" size={14} />
              <span id="leave-title">Leave this month</span>
              <span className="card-link">{pending} pending</span>
            </div>
            {data.leaveThisMonth.map((row) => (
              <div className="meter" key={row.type}>
                <div className="meter-top">
                  <span>{row.type}</span>
                  <span className="meter-value">
                    {row.days} approved days{row.pending > 0 ? ` · ${row.pending} pending` : ""}
                  </span>
                </div>
                <div
                  className="meter-track"
                  role="progressbar"
                  aria-valuenow={row.days}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(row.days, 1)}
                  aria-label={`${row.type}: ${row.days} approved days`}
                >
                  <div
                    className="meter-fill"
                    style={{ inlineSize: `${Math.min(row.days * 10, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="card" aria-labelledby="allocation-title">
            <div className="card-head">
              <Icon name="folder" size={14} />
              <span id="allocation-title">Staff allocation across projects</span>
              <span className="card-link">people</span>
            </div>
            {data.allocation.map((row) => {
              const max = Math.max(...data.allocation.map((item) => item.staff), 1);
              return (
                <div className="stack-row" key={row.project} style={{ paddingBlock: 8 }}>
                  <span className="stack-label">
                    <span>{row.project}</span>
                    <span className="num">
                      {row.staff} staff · {row.totalPct}% FTE
                    </span>
                  </span>
                  <span className="meter-track">
                    <span
                      className="meter-fill"
                      style={{ inlineSize: `${Math.round((row.staff / max) * 100)}%`, display: "block" }}
                    />
                  </span>
                </div>
              );
            })}
          </section>
        </div>

        <div className="chart-row-bottom">
          <ListCard
            title="Leave approval queue"
            icon="calendar"
            viewAllHref="/leave?status=pending"
            rows={data.pendingLeave.slice(0, 4).map((row) => ({
              id: row.id,
              title: row.name,
              subtitle: `${row.type} · ${row.from} to ${row.to}`,
              value: `${row.days} days`,
              meta: "awaiting approval",
              icon: "user",
            }))}
            empty={<p className="muted" style={{ fontSize: 13 }}>No leave requests are waiting.</p>}
          />

          <ListCard
            title="Birthdays in the next 14 days"
            icon="hr"
            rows={data.birthdays.map((row) => ({
              id: row.name,
              title: row.name,
              subtitle: row.date,
              value: row.daysAway === 0 ? "Today" : `${row.daysAway} days`,
              meta: relativeTime(`${row.date}T09:00:00`),
              icon: "user",
            }))}
            empty={<p className="muted" style={{ fontSize: 13 }}>No birthdays in the next two weeks.</p>}
          />
        </div>

        <section className="card">
          <div className="card-head">
            <Icon name="wallet" size={14} />
            <span>Payroll status</span>
          </div>
          <p className="budget-note" style={{ fontSize: 13 }}>
            <strong>Coming in Phase 2.</strong> Payslips, salary structures and payroll runs are out of scope
            for the MVP (PRD §2.2).
          </p>
        </section>
      </div>
    </>
  );
}
