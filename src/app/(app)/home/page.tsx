import Link from "next/link";
import { Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { formatDateShort } from "@/lib/format";
import { getHomeData } from "@/lib/queries/home";
import { roleLabel } from "@/lib/rbac";
import { requireRole } from "@/lib/session";

export default async function HomePage() {
  const profile = await requireRole(["field_staff", "data_entry"]);
  const data = getHomeData(profile);
  const isFieldStaff = profile.role === "field_staff";

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={
          isFieldStaff
            ? `${roleLabel(profile.role)} · ${data.villages.length} villages assigned`
            : `${roleLabel(profile.role)} · task list`
        }
        action={{ label: "Add beneficiary", href: "/beneficiaries/new" }}
      />

      <div className="main-body">
        <section className="kpi-grid" aria-label="Your numbers">
          {data.headline.map((item) => (
            <Link className="card" href={item.href} key={item.label}>
              <div className="card-head">
                <span>{item.label}</span>
              </div>
              <span className="kpi-value num">{item.value}</span>
            </Link>
          ))}
          <div className="card">
            <div className="card-head">
              <span>This week</span>
            </div>
            <span className="kpi-value num">{data.addedThisWeek}</span>
            <p className="footnote">beneficiaries added · {data.activitiesThisWeek} activities logged</p>
          </div>
        </section>

        <div className="chart-row-bottom">
          <section className="card" aria-labelledby="quick-actions">
            <div className="card-head">
              <Icon name="plus" size={14} />
              <span id="quick-actions">Quick actions</span>
            </div>
            <div className="quick-actions">
              <Link className="quick-action" href="/beneficiaries/new">
                <Icon name="people" size={16} /> Add beneficiary
              </Link>
              <Link className="quick-action" href="/activities/new">
                <Icon name="activity" size={16} /> Log activity
              </Link>
            </div>
            <p className="nav-group-label" style={{ paddingInline: 0, marginBlockStart: 16 }}>
              Your villages
            </p>
            <div className="village-chips">
              {data.villages.map((village) => (
                <span className="filter-pill" key={village.id}>
                  {village.name}
                  <span className="muted">{village.block}</span>
                </span>
              ))}
            </div>
          </section>

          {isFieldStaff ? (
            <section className="card" aria-labelledby="recent-entries">
              <div className="card-head">
                <Icon name="activity" size={14} />
                <span id="recent-entries">Recent entries</span>
                <Link className="card-link" href="/activities">
                  View all
                </Link>
              </div>
              <div className="rows">
                {data.recent.map((row) => (
                  <div className="row" key={row.id}>
                    <span className="row-icon">
                      <Icon name="activity" size={15} />
                    </span>
                    <span className="row-main">
                      <span className="row-title">{row.title}</span>
                      <span className="row-sub">
                        {row.village} · {row.type.replace("_", " ")}
                      </span>
                    </span>
                    <span className="row-time">{formatDateShort(row.date)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="card" aria-labelledby="task-list">
              <div className="card-head">
                <Icon name="list" size={14} />
                <span id="task-list">Your tasks</span>
                <span className="card-link">{data.tasks.length} open</span>
              </div>
              <div className="rows">
                {data.tasks.map((task) => (
                  <Link className="row" key={task.id} href={task.href}>
                    <span className="row-icon">
                      <Icon name={task.icon} size={15} />
                    </span>
                    <span className="row-main">
                      <span className="row-title">{task.title}</span>
                      <span className="row-sub">{task.detail}</span>
                    </span>
                    <span className="row-time">
                      <Icon name="chevronDown" size={14} />
                    </span>
                  </Link>
                ))}
              </div>
              <p className="footnote">
                Data entry operators do not see dashboards in the MVP (PRD §8.5).
              </p>
            </section>
          )}
        </div>

        {!isFieldStaff ? (
          <section className="card">
            <div className="card-head">
              <Icon name="people" size={14} />
              <span>Recent entries in your villages</span>
            </div>
            <div className="rows">
              {data.recent.map((row) => (
                <div className="row" key={row.id}>
                  <span className="row-icon">
                    <Icon name="activity" size={15} />
                  </span>
                  <span className="row-main">
                    <span className="row-title">{row.title}</span>
                    <span className="row-sub">{row.village}</span>
                  </span>
                  <span className="row-time">{formatDateShort(row.date)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
