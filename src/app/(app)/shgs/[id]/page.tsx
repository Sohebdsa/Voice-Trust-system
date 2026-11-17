import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailHeader, DetailTabs, Facts } from "@/components/app/master-detail";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Icon } from "@/components/ui/icons";
import { addShgMember, recordShgSavings, removeShgMember } from "@/app/actions/profiles";
import { formatCurrency, formatDate } from "@/lib/format";
import { canCreateShg, canEditShg, canRecordShgSavings } from "@/lib/profiles";
import { getShgDetail } from "@/lib/queries/profiles";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/data/store";

export default async function ShgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const sParams = await searchParams;
  const tab = typeof sParams.tab === "string" ? sParams.tab : "overview";

  const detail = getShgDetail(id, profile);
  if (!detail) notFound();

  const { shg, village, members, savings, totalSavings, projects } = detail;
  const showAddMember = sParams.addMember === "1" && canEditShg(profile.role);
  const showRecordSavings = sParams.recordSavings === "1" && canRecordShgSavings(profile.role);

  // Available beneficiaries in this village not yet in this SHG
  const existingMemberBenIds = new Set(members.map((m) => m.beneficiaryId));
  const availableBens = db.beneficiaries.filter(
    (b) => b.villageId === shg.villageId && b.status === "active" && !existingMemberBenIds.has(b.id)
  );

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "members", label: "Members", count: members.length },
    { key: "savings", label: "Savings Ledger", count: savings.length },
    { key: "projects", label: "Linked Projects", count: projects.length },
  ];

  return (
    <>
      <DetailHeader
        backHref="/shgs"
        backLabel="Self-Help Groups"
        title={shg.name}
        code={shg.code}
        status={shg.status}
        subtitle={`Village: ${village ? village.name : "—"} · ${members.length} members · Total savings: ${formatCurrency(totalSavings)}`}
      >
        {canEditShg(profile.role) && (
          <Link className="btn" href={`/shgs?id=${shg.id}`}>
            <Icon name="pencil" size={13} /> Edit
          </Link>
        )}
      </DetailHeader>

      <div className="main-body">
        {sParams.added && (
          <p className="alert" role="alert" data-tone="positive" style={{ marginBottom: "16px" }}>
            New member added to group successfully.
          </p>
        )}
        {sParams.saved && (
          <p className="alert" role="alert" data-tone="positive" style={{ marginBottom: "16px" }}>
            Meeting savings transactions successfully logged.
          </p>
        )}

        <DetailTabs base={`/shgs/${shg.id}`} active={tab} tabs={tabs} />

        {/* TAB 1: Overview */}
        {tab === "overview" && (
          <div className="chart-row-bottom">
            <section className="card detail-panel">
              <div className="card-head">
                <Icon name="group" size={14} />
                <span>Group Facts & Governance</span>
              </div>
              <Facts
                items={[
                  { label: "Group code", value: shg.code },
                  { label: "Group legal name", value: shg.name },
                  { label: "Village & block", value: village ? `${village.name}, ${village.block}` : "—" },
                  { label: "Formation date", value: formatDate(shg.formationDate) },
                  { label: "Savings cadence", value: shg.meetingFrequency },
                  { label: "Active member count", value: `${members.length} women members` },
                  { label: "Net group savings balance", value: formatCurrency(totalSavings) },
                  { label: "Supporting projects", value: `${projects.length} project(s)` },
                ]}
              />
            </section>

            <section className="card detail-panel">
              <div className="card-head">
                <Icon name="shield" size={14} />
                <span>Office Bearers (PRD §4.7 Leadership Rule)</span>
              </div>
              <Facts
                items={[
                  {
                    label: "President",
                    value: members.find((m) => m.role === "president")?.name ?? "Vacant / Not designated",
                  },
                  {
                    label: "Secretary",
                    value: members.find((m) => m.role === "secretary")?.name ?? "Vacant / Not designated",
                  },
                  {
                    label: "Treasurer",
                    value: members.find((m) => m.role === "treasurer")?.name ?? "Vacant / Not designated",
                  },
                  {
                    label: "General members",
                    value: `${members.filter((m) => m.role === "member").length} members`,
                  },
                ]}
              />
            </section>
          </div>
        )}

        {/* TAB 2: Members */}
        {tab === "members" && (
          <section className="card list-card">
            <div className="card-head" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Group Members ({members.length})</strong>
              {canEditShg(profile.role) && (
                <Link className="btn btn-primary" style={{ fontSize: "12px" }} href={`/shgs/${shg.id}?tab=members&addMember=1`}>
                  + Add Member
                </Link>
              )}
            </div>
            {members.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Designation / Role</th>
                      <th>Mobile</th>
                      <th>Joined On</th>
                      <th data-end="">Savings Balance</th>
                      <th>Status</th>
                      {canCreateShg(profile.role) && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link href={`/beneficiaries/${m.beneficiaryId}`} className="cell-title">
                            {m.name}
                          </Link>
                          <span className="cell-sub num">{m.code}</span>
                        </td>
                        <td>
                          <span
                            className="pill"
                            data-tone={m.role === "president" ? "positive" : m.role === "secretary" || m.role === "treasurer" ? "warn" : "neutral"}
                            style={{ fontSize: "11px", padding: "1px 6px" }}
                          >
                            {m.role.toUpperCase()}
                          </span>
                        </td>
                        <td><span className="num">{m.mobile}</span></td>
                        <td>{m.joinDate}</td>
                        <td data-end=""><strong className="num">{formatCurrency(m.balance)}</strong></td>
                        <td><StatusPill label={m.status} tone={statusTone(m.status)} /></td>
                        {canCreateShg(profile.role) && (
                          <td>
                            {m.status === "active" ? (
                              <form action={removeShgMember} style={{ display: "inline" }}>
                                <input type="hidden" name="memberId" value={m.id} />
                                <input type="hidden" name="shgId" value={shg.id} />
                                <button
                                  type="submit"
                                  className="btn btn-ghost"
                                  style={{ fontSize: "11px", padding: "1px 6px", color: "var(--negative)" }}
                                  title="Mark member inactive (PRD §7.5)"
                                >
                                  Deactivate
                                </button>
                              </form>
                            ) : (
                              <span className="muted" style={{ fontSize: "11px" }}>Inactive</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty" style={{ padding: "20px" }}>No members enrolled in this group yet.</p>
            )}
          </section>
        )}

        {/* TAB 3: Savings Ledger */}
        {tab === "savings" && (
          <section className="card list-card">
            <div className="card-head" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Savings Ledger & Transactions</strong>
                <span className="cell-sub" style={{ display: "inline-block", marginLeft: "12px" }}>
                  Cumulative savings: <strong>{formatCurrency(totalSavings)}</strong>
                </span>
              </div>
              {canRecordShgSavings(profile.role) && members.length > 0 && (
                <Link className="btn btn-primary" style={{ fontSize: "12px" }} href={`/shgs/${shg.id}?tab=savings&recordSavings=1`}>
                  Record Meeting Savings
                </Link>
              )}
            </div>
            {savings.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Transaction Type</th>
                      <th data-end="">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savings.map((s) => (
                      <tr key={s.id}>
                        <td>{s.txnDate}</td>
                        <td><strong>{s.memberName}</strong></td>
                        <td>
                          <span
                            className="pill"
                            data-tone={s.txnType === "deposit" ? "positive" : "neg"}
                            style={{ fontSize: "11px", padding: "1px 6px" }}
                          >
                            {s.txnType}
                          </span>
                        </td>
                        <td data-end="">
                          <strong className="num" style={{ color: s.txnType === "deposit" ? "var(--positive)" : "var(--negative)" }}>
                            {s.txnType === "deposit" ? "+" : "-"}{formatCurrency(s.amount)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty" style={{ padding: "20px" }}>No savings transactions logged yet for this group.</p>
            )}
          </section>
        )}

        {/* TAB 4: Projects */}
        {tab === "projects" && (
          <section className="card list-card">
            <div className="card-head" style={{ padding: "12px 16px" }}>
              <strong>Development Projects Supporting this Group</strong>
            </div>
            {projects.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Timeline</th>
                      <th>Approved Budget</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/projects/${p.id}`} className="cell-title">
                            {p.name}
                          </Link>
                          <span className="cell-sub num">{p.code}</span>
                        </td>
                        <td>{formatDate(p.startDate)} – {formatDate(p.endDate)}</td>
                        <td><span className="num">{formatCurrency(p.approvedBudget)}</span></td>
                        <td><StatusPill label={p.status} tone={statusTone(p.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty" style={{ padding: "20px" }}>No projects currently linked to this SHG.</p>
            )}
          </section>
        )}
      </div>

      {/* Drawer 1: Add SHG Member */}
      {showAddMember && (
        <>
          <Link className="drawer-scrim" href={`/shgs/${shg.id}?tab=members`} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="member-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">{shg.name}</p>
                <h2 id="member-drawer-title">Add Group Member</h2>
              </div>
              <Link className="btn" href={`/shgs/${shg.id}?tab=members`}>
                Close
              </Link>
            </div>
            <form action={addShgMember} className="form" style={{ padding: "16px" }}>
              <input type="hidden" name="shgId" value={shg.id} />
              <p className="help" style={{ marginBottom: "16px" }}>
                Select an enrolled female beneficiary from <strong>{village?.name}</strong> to add as a member.
              </p>

              <div className="form-grid">
                <div className="field span-2">
                  <label className="label" htmlFor="field-ben">
                    Beneficiary <span aria-hidden="true">*</span>
                  </label>
                  <select className="input" id="field-ben" name="beneficiaryId" required>
                    <option value="">Select beneficiary…</option>
                    {availableBens.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.fullName} ({b.code}, {b.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="field-role">
                    Designation / Role <span aria-hidden="true">*</span>
                  </label>
                  <select className="input" id="field-role" name="role" required defaultValue="member">
                    <option value="member">General Member</option>
                    <option value="president">President</option>
                    <option value="secretary">Secretary</option>
                    <option value="treasurer">Treasurer</option>
                  </select>
                  <p className="help">Rule: Only one active president, secretary, and treasurer allowed per group.</p>
                </div>

                <div className="field">
                  <label className="label" htmlFor="field-joinDate">
                    Join Date <span aria-hidden="true">*</span>
                  </label>
                  <input
                    className="input"
                    id="field-joinDate"
                    name="joinDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>

              <div className="drawer-foot" style={{ marginTop: "24px" }}>
                <Link className="btn" href={`/shgs/${shg.id}?tab=members`}>
                  Cancel
                </Link>
                <button className="btn btn-primary" type="submit">
                  Enroll Member
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      {/* Drawer 2: Record Meeting Savings Grid (PRD §7.5) */}
      {showRecordSavings && (
        <>
          <Link className="drawer-scrim" href={`/shgs/${shg.id}?tab=savings`} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="savings-drawer-title" style={{ maxWidth: "680px" }}>
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">{shg.name}</p>
                <h2 id="savings-drawer-title">Record Meeting Savings</h2>
              </div>
              <Link className="btn" href={`/shgs/${shg.id}?tab=savings`}>
                Close
              </Link>
            </div>
            <form action={recordShgSavings} className="form" style={{ padding: "16px" }}>
              <input type="hidden" name="shgId" value={shg.id} />
              <div className="field" style={{ marginBottom: "16px" }}>
                <label className="label" htmlFor="field-meetingDate">
                  Meeting Date <span aria-hidden="true">*</span>
                </label>
                <input
                  className="input"
                  id="field-meetingDate"
                  name="txnDate"
                  type="date"
                  style={{ width: "200px" }}
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
                <p className="help">Fast-entry grid for all {members.length} group members (PRD §7.5).</p>
              </div>

              <div className="table-wrap" style={{ maxHeight: "360px", overflowY: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Type</th>
                      <th data-end="">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.name}</strong>
                          <input type="hidden" name="memberId" value={m.id} />
                        </td>
                        <td>
                          <select className="input" name="txnType" defaultValue="deposit" style={{ padding: "3px 6px", fontSize: "12px" }}>
                            <option value="deposit">Deposit (+)</option>
                            <option value="withdrawal">Withdrawal (-)</option>
                          </select>
                        </td>
                        <td data-end="">
                          <input
                            className="input"
                            name="amount"
                            type="number"
                            min="0"
                            step="50"
                            placeholder="0"
                            defaultValue="200"
                            style={{ width: "100px", textAlign: "right" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Meeting Total (Default)</strong></td>
                      <td data-end=""><strong className="num">{formatCurrency(members.length * 200)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="drawer-foot" style={{ marginTop: "24px" }}>
                <Link className="btn" href={`/shgs/${shg.id}?tab=savings`}>
                  Cancel
                </Link>
                <button className="btn btn-primary" type="submit">
                  Commit Savings Transactions
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
