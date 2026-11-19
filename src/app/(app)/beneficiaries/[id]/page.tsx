import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailHeader, DetailTabs, Facts } from "@/components/app/master-detail";
import { StatusPill, statusTone } from "@/components/app/status-pill";
import { Icon } from "@/components/ui/icons";
import { archiveBeneficiary } from "@/app/actions/beneficiaries";
import { addPwdFollowup, addPwdIntervention } from "@/app/actions/profiles";
import { FarmerForm } from "@/components/app/farmer-form";
import { PwdForm } from "@/components/app/pwd-form";
import { db } from "@/lib/data/store";
import { canArchiveBeneficiary, canEditBeneficiary } from "@/lib/beneficiaries";
import { canCreateFarmer, canEditFarmer, canCreatePwd, canEditPwd } from "@/lib/profiles";
import { formatCurrency, formatDate } from "@/lib/format";
import { getBeneficiaryDetail } from "@/lib/queries/beneficiaries";
import { requireRole } from "@/lib/session";

export default async function BeneficiaryDetailPage({
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
  const tab = typeof sParams.tab === "string" ? sParams.tab : "profile";

  const detail = getBeneficiaryDetail(id, profile);
  if (!detail) notFound();

  const { beneficiary, village, projects, farmer, shg, shgMember, totalSavings, pwd, allowPwd, activities, timeline } =
    detail;

  const showEditFarmer = (sParams.editFarmer === "1" || sParams.addFarmer === "1") && canCreateFarmer(profile.role);
  const showEditPwd = (sParams.editPwd === "1" || sParams.addPwd === "1") && canCreatePwd(profile.role);
  const showAddFollowup = sParams.addFollowup === "1" && canEditPwd(profile.role);
  const showAddIntervention = sParams.addIntervention === "1" && canCreatePwd(profile.role);

  const interventions = pwd ? (db.pwdInterventions ?? []).filter((i) => i.pwdId === pwd.id) : [];
  const followups = pwd ? (db.pwdFollowups ?? []).filter((f) => f.pwdId === pwd.id) : [];

  // Log sensitive PWD view per PRD §5.2 & §7.6
  // IG-05: deduplicate — only write one audit row per user per record per 10 minutes
  if (tab === "pwd" && pwd && allowPwd) {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const recentAudit = db.audit.find(
      (a) =>
        a.actorId === profile.id &&
        a.action === "view_sensitive" &&
        a.recordId === pwd.id &&
        new Date(a.at).getTime() > tenMinutesAgo,
    );
    if (!recentAudit) {
      db.audit.push({
        id: `aud-pwd-${Date.now()}`,
        actorId: profile.id,
        actorName: profile.fullName,
        action: "view_sensitive",
        tableName: "pwd_profiles",
        recordId: pwd.id,
        at: new Date().toISOString(),
      });
    }
  }

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "farmer", label: "Farmer", count: farmer ? 1 : 0 },
    { key: "shg", label: "SHG", count: shgMember ? 1 : 0 },
    ...(allowPwd ? [{ key: "pwd", label: "PWD / GAP", count: pwd ? 1 : 0 }] : []),
    { key: "projects", label: "Projects", count: projects.length },
    { key: "activities", label: "Activities", count: activities.length },
    { key: "timeline", label: "Timeline", count: timeline.length },
  ];

  return (
    <>
      <div className="main-body" style={{ marginTop: "16px" }}>
        <DetailHeader
          backHref="/beneficiaries"
          backLabel="Beneficiaries"
          title={beneficiary.fullName}
          code={beneficiary.code}
          status={beneficiary.status}
          subtitle={`Village: ${village ? village.name : "—"} · Mobile: ${beneficiary.mobile}`}
        >
          {canEditBeneficiary(profile.role) && (
            <Link className="btn" href={`/beneficiaries?id=${beneficiary.id}`}>
              <Icon name="pencil" size={13} /> Edit
            </Link>
          )}
          {canArchiveBeneficiary(profile.role) && beneficiary.status !== "archived" && (
            <details className="archive">
              <summary className="btn btn-ghost">Archive</summary>
              <form className="archive-panel" action={archiveBeneficiary}>
                <input type="hidden" name="id" value={beneficiary.id} />
                <p>
                  Archive beneficiary <strong>{beneficiary.fullName}</strong>?
                </p>
                <p className="muted" style={{ fontSize: "11px", marginBottom: "8px" }}>
                  Record will remain in historical audit logs and project archives but won&apos;t appear in active pickers.
                </p>
                <div className="drawer-foot">
                  <button className="btn btn-danger" type="submit">
                    Confirm archive
                  </button>
                </div>
              </form>
            </details>
          )}
        </DetailHeader>

        <DetailTabs base={`/beneficiaries/${beneficiary.id}`} active={tab} tabs={tabs} />

        {/* TAB 1: Profile / Overview */}
        {tab === "profile" && (
          <section className="card detail-panel">
            {beneficiary.photoPath && (
              <p className="help" style={{ marginBottom: "16px" }}>
                Photograph on file: <strong>{beneficiary.photoPath}</strong> — file name only, the prototype stores no upload.
              </p>
            )}
            <h3>Demographic & Registration Facts</h3>
            <Facts
              items={[
                { label: "Beneficiary code", value: beneficiary.code },
                { label: "Full legal name", value: beneficiary.fullName },
                {
                  label: "Gender",
                  value: beneficiary.gender.charAt(0).toUpperCase() + beneficiary.gender.slice(1),
                },
                {
                  label: "Age / Date of birth",
                  value: beneficiary.dateOfBirth
                    ? `${detail.age !== null ? `${detail.age} years ` : ""}(DOB: ${formatDate(beneficiary.dateOfBirth)})`
                    : "Not specified",
                },
                { label: "Mobile contact", value: beneficiary.mobile },
                { label: "Alternate contact", value: beneficiary.alternateContact ?? "Not provided" },
                { label: "Address line", value: beneficiary.addressLine ?? "Not provided" },
                {
                  label: "Village & Block",
                  value: village ? `${village.name}, ${village.block} (${village.district})` : "—",
                },
                {
                  label: "Panchayat & State",
                  value: village ? `${village.panchayat}, ${village.state}` : "—",
                },
                { label: "Record status", value: beneficiary.status },
                {
                  label: "Created",
                  value: `${beneficiary.createdBy ?? "—"}${beneficiary.createdAt ? ` · ${formatDate(beneficiary.createdAt)}` : ""}`,
                },
                { label: "Last updated", value: beneficiary.updatedAt ? formatDate(beneficiary.updatedAt) : "—" },
                {
                  label: "ID proof on file",
                  value: beneficiary.idProofLast4
                    ? `${(beneficiary.idProofType ?? "ID").toUpperCase()} ending in •••• ${beneficiary.idProofLast4}`
                    : "None provided",
                },
                {
                  label: "Enrolment date",
                  value: formatDate(beneficiary.enrolmentDate),
                },
                {
                  label: "DPDP consent recorded",
                  value: beneficiary.consentGivenOn
                    ? `Verified on ${formatDate(beneficiary.consentGivenOn)}`
                    : "Pending confirmation",
                },
                {
                  label: "Active project count",
                  value: `${projects.length} project${projects.length === 1 ? "" : "s"}`,
                },
              ]}
            />
          </section>
        )}

        {/* TAB 2: Farmer */}
        {tab === "farmer" && (
          <section className="card detail-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Farmer Profile & Crop Details (PRD §7.4)</h3>
              {canCreateFarmer(profile.role) && (
                farmer ? (
                  <Link className="btn" style={{ fontSize: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=farmer&editFarmer=1`}>
                    <Icon name="pencil" size={13} /> Edit Farmer Profile
                  </Link>
                ) : (
                  <Link className="btn btn-primary" style={{ fontSize: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=farmer&addFarmer=1`}>
                    + Add Farmer Profile
                  </Link>
                )
              )}
            </div>

            {farmer ? (
              <>
                <Facts
                  items={[
                    { label: "Farmer ID", value: farmer.code },
                    { label: "Land holding", value: `${farmer.landHoldingAcres} acres` },
                    {
                      label: "Land ownership",
                      value: farmer.landOwnership.charAt(0).toUpperCase() + farmer.landOwnership.slice(1),
                    },
                    {
                      label: "Farming practice",
                      value: farmer.farmingType.charAt(0).toUpperCase() + farmer.farmingType.slice(1),
                    },
                    {
                      label: "Organic status",
                      value: farmer.organicStatus.replace("_", " ").toUpperCase(),
                    },
                    { label: "Irrigation source", value: farmer.irrigationSource },
                    { label: "Farmer group", value: farmer.farmerGroup ?? "Not grouped" },
                    { label: "Enrolment date", value: farmer.enrolmentDate ? formatDate(farmer.enrolmentDate) : "—" },
                    { label: "Training details", value: farmer.trainingDetails || "None recorded" },
                    { label: "Record status", value: farmer.status },
                    { label: "Organic practices", value: farmer.organicPractices || "None specified" },
                    { label: "Support received", value: farmer.supportReceived || "None specified" },
                    { label: "Equipment received", value: farmer.equipmentReceived || "None specified" },
                    {
                      label: "GPS location",
                      value: farmer.gpsLatitude && farmer.gpsLongitude ? `${farmer.gpsLatitude}°, ${farmer.gpsLongitude}°` : "Not captured",
                    },
                  ]}
                />
                <h4 style={{ margin: "20px 0 10px", fontSize: "var(--fs-13)" }}>Cultivated Seasonal Crops</h4>
                {farmer.crops.length > 0 ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Season</th>
                          <th>Crop</th>
                          <th data-end="">Area (Acres)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmer.crops.map((c, i) => (
                          <tr key={i}>
                            <td>{c.season.toUpperCase()}</td>
                            <td><strong>{c.crop}</strong></td>
                            <td data-end="">{c.areaAcres}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">No seasonal crops recorded yet.</p>
                )}
                {farmer.followupNotes && (
                  <div style={{ marginTop: "16px", padding: "12px", background: "var(--panel)", borderRadius: "8px" }}>
                    <strong>Follow-up Notes:</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "var(--fs-13)" }}>{farmer.followupNotes}</p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <p className="muted">This beneficiary is not registered with a Farmer profile.</p>
                {canCreateFarmer(profile.role) && (
                  <Link className="btn btn-primary" style={{ marginTop: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=farmer&addFarmer=1`}>
                    + Add Farmer Profile Now
                  </Link>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: SHG */}
        {tab === "shg" && (
          <section className="card detail-panel">
            <h3>Self-Help Group (SHG) Membership</h3>
            {shgMember && shg ? (
              <>
                <Facts
                  items={[
                    { label: "SHG Group name", value: shg.name },
                    { label: "SHG code", value: shg.code },
                    {
                      label: "Member designation",
                      value: shgMember.role.charAt(0).toUpperCase() + shgMember.role.slice(1),
                    },
                    { label: "Joined group on", value: formatDate(shgMember.joinDate) },
                    {
                      label: "Meeting cadence",
                      value: shg.meetingFrequency.charAt(0).toUpperCase() + shg.meetingFrequency.slice(1),
                    },
                    { label: "Net savings balance", value: formatCurrency(totalSavings) },
                  ]}
                />
                <div style={{ marginTop: "16px" }}>
                  <Link href={`/shgs/${shg.id}`} className="btn">
                    View Full Group Details & Savings Ledger →
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <p className="muted">This beneficiary is not currently a member of any Self-Help Group.</p>
                <Link href="/shgs" className="btn" style={{ marginTop: "12px" }}>
                  Explore Active SHGs →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* TAB 4: PWD (Sensitive) */}
        {tab === "pwd" && allowPwd && (
          <section className="card detail-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ margin: 0 }}>Persons with Disabilities (PWD / GAP) Profile</h3>
                <span
                  className="tooltip-wrap"
                  tabIndex={0}
                  data-tooltip="Confidential record (PRD §5.2). All views are logged in the security audit trail."
                  aria-label="Confidential record notice"
                >
                  <span
                    className="pill"
                    data-tone="warn"
                    style={{
                      fontSize: "11px",
                      padding: "1px 8px",
                      cursor: "help",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Icon name="lock" size={11} /> Confidential ⓘ
                  </span>
                </span>
              </div>
              {canCreatePwd(profile.role) && (
                pwd ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link className="btn" style={{ fontSize: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=pwd&editPwd=1`}>
                      <Icon name="pencil" size={13} /> Edit Profile
                    </Link>
                    <Link className="btn" style={{ fontSize: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=pwd&addIntervention=1`}>
                      + Add Intervention
                    </Link>
                    <Link className="btn btn-primary" style={{ fontSize: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=pwd&addFollowup=1`}>
                      + Add Follow-up
                    </Link>
                  </div>
                ) : (
                  <Link className="btn btn-primary" style={{ fontSize: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=pwd&addPwd=1`}>
                    + Add PWD Profile
                  </Link>
                )
              )}
            </div>

            {pwd ? (
              <>
                <Facts
                  items={[
                    { label: "PWD file code", value: pwd.code },
                    { label: "Disability category", value: pwd.disabilityType },
                    { label: "Disability percentage", value: `${pwd.disabilityPercentage}%` },
                    { label: "Disability certificate no.", value: pwd.certificateNo },
                    { label: "Education attainment", value: pwd.educationLevel },
                    { label: "Vocational & livelihood status", value: pwd.vocationalStatus },
                    { label: "Accessibility needs", value: pwd.accessibilityNeeds || "None on file" },
                    { label: "Assistive device", value: pwd.assistiveDevice || "None on file" },
                    { label: "Individual plan", value: pwd.individualPlan || "None recorded" },
                    { label: "Outcome", value: pwd.outcome || "Pending" },
                    { label: "Family details", value: pwd.familyDetails || "Not recorded" },
                    { label: "Intervention support", value: pwd.interventionSupport || "Not recorded" },
                    { label: "Training records", value: pwd.trainingRecords || "Not recorded" },
                  ]}
                />

                {/* Interventions (PRD §4.6 / §7.6) */}
                <h4 style={{ margin: "24px 0 10px", fontSize: "var(--fs-13)" }}>Inclusion Interventions</h4>
                {interventions.length > 0 ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Intervention</th>
                          <th>Date Given</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interventions.map((inv) => (
                          <tr key={inv.id}>
                            <td><strong>{inv.interventionType}</strong></td>
                            <td>{formatDate(inv.givenOn)}</td>
                            <td>{inv.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">No interventions recorded yet.</p>
                )}

                {/* Follow-ups Timeline */}
                <h4 style={{ margin: "24px 0 10px", fontSize: "var(--fs-13)" }}>Field Follow-up Records</h4>
                {followups.length > 0 ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Follow-up Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {followups.map((flw) => (
                          <tr key={flw.id}>
                            <td>{formatDate(flw.followupDate)}</td>
                            <td>{flw.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">No field follow-ups recorded yet.</p>
                )}
              </>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <p className="muted">No disability inclusion profile recorded for this beneficiary.</p>
                {canCreatePwd(profile.role) && (
                  <Link className="btn btn-primary" style={{ marginTop: "12px" }} href={`/beneficiaries/${beneficiary.id}?tab=pwd&addPwd=1`}>
                    + Add PWD Profile Now
                  </Link>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 5: Projects */}
        {tab === "projects" && (
          <section className="card detail-panel">
            <h3>Enrolled Development Projects</h3>
            {projects.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Duration</th>
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
                        <td>
                          {formatDate(p.startDate)} – {formatDate(p.endDate)}
                        </td>
                        <td>
                          <StatusPill label={p.status} tone={statusTone(p.status)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Not currently enrolled in any projects.</p>
            )}
          </section>
        )}

        {/* TAB 6: Activities */}
        {tab === "activities" && (
          <section className="card detail-panel">
            <h3>Field Activities & Trainings Attended</h3>
            {activities.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.title}</strong>
                          <span className="cell-sub num">{a.code}</span>
                        </td>
                        <td>
                          <span className="pill" data-tone="brand" style={{ fontSize: "11px", padding: "1px 6px" }}>
                            {a.activityType}
                          </span>
                        </td>
                        <td>{a.date}</td>
                        <td>{a.projectName}</td>
                        <td>
                          <StatusPill label={a.status} tone={statusTone(a.status)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No recorded activity attendance found for this beneficiary.</p>
            )}
          </section>
        )}

        {/* TAB 7: Timeline / Audit */}
        {tab === "timeline" && (
          <section className="card detail-panel">
            <h3>Audit History & Activity Log</h3>
            {timeline.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.at)}</td>
                        <td>
                          <span
                            className="pill"
                            data-tone={
                              entry.action === "create"
                                ? "positive"
                                : entry.action === "delete"
                                ? "neg"
                                : entry.action === "view_sensitive"
                                ? "warn"
                                : "brand"
                            }
                            style={{ fontSize: "11px", padding: "1px 6px" }}
                          >
                            {entry.action.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <strong>{entry.actorName}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No audit trail entries for this record.</p>
            )}
          </section>
        )}
      </div>

      {/* Drawer: Add / Edit Farmer */}
      {showEditFarmer && (
        <>
          <Link className="drawer-scrim" href={`/beneficiaries/${beneficiary.id}?tab=farmer`} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="farmer-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">{beneficiary.fullName}</p>
                <h2 id="farmer-drawer-title">{farmer ? "Edit Farmer Profile" : "Add Farmer Profile"}</h2>
              </div>
              <Link className="btn" href={`/beneficiaries/${beneficiary.id}?tab=farmer`}>
                Close
              </Link>
            </div>
            <FarmerForm
              beneficiaryId={beneficiary.id}
              beneficiaryName={beneficiary.fullName}
              projectNames={projects.map((p) => p.name)}
              initialValues={
                farmer
                  ? {
                      id: farmer.id,
                      beneficiaryId: farmer.beneficiaryId,
                      landHoldingAcres: String(farmer.landHoldingAcres),
                      landOwnership: farmer.landOwnership,
                      farmingType: farmer.farmingType,
                      organicStatus: farmer.organicStatus,
                      irrigationSource: farmer.irrigationSource,
                      code: farmer.code,
                      trainingDetails: farmer.trainingDetails ?? "",
                      enrolmentDate: (farmer.enrolmentDate ?? "").slice(0, 10),
                      farmerGroup: farmer.farmerGroup ?? "",
                      status: farmer.status,
                      organicPractices: farmer.organicPractices ?? "",
                      supportReceived: farmer.supportReceived ?? "",
                      equipmentReceived: farmer.equipmentReceived ?? "",
                      gpsLatitude: farmer.gpsLatitude ? String(farmer.gpsLatitude) : "",
                      gpsLongitude: farmer.gpsLongitude ? String(farmer.gpsLongitude) : "",
                      followupNotes: farmer.followupNotes ?? "",
                      crops: farmer.crops,
                    }
                  : undefined
              }
              cancelHref={`/beneficiaries/${beneficiary.id}?tab=farmer`}
            />
          </aside>
        </>
      )}

      {/* Drawer: Add / Edit PWD */}
      {showEditPwd && (
        <>
          <Link className="drawer-scrim" href={`/beneficiaries/${beneficiary.id}?tab=pwd`} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="pwd-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">{beneficiary.fullName}</p>
                <h2 id="pwd-drawer-title">{pwd ? "Edit PWD Profile" : "Register PWD Profile"}</h2>
              </div>
              <Link className="btn" href={`/beneficiaries/${beneficiary.id}?tab=pwd`}>
                Close
              </Link>
            </div>
            <PwdForm
              beneficiaryId={beneficiary.id}
              beneficiaryName={beneficiary.fullName}
              initialValues={
                pwd
                  ? {
                      id: pwd.id,
                      beneficiaryId: pwd.beneficiaryId,
                      disabilityType: pwd.disabilityType,
                      disabilityPercentage: String(pwd.disabilityPercentage),
                      certificateNo: pwd.certificateNo,
                      certificateIssueDate: pwd.certificateIssueDate ?? "",
                      certificateIssuingAuthority: pwd.certificateIssuingAuthority ?? "",
                      educationLevel: pwd.educationLevel,
                      vocationalStatus: pwd.vocationalStatus,
                      accessibilityNeeds: pwd.accessibilityNeeds ?? "",
                      assistiveDevice: pwd.assistiveDevice ?? "",
                      individualPlan: pwd.individualPlan ?? "",
                      outcome: pwd.outcome ?? "",
                    }
                  : undefined
              }
              cancelHref={`/beneficiaries/${beneficiary.id}?tab=pwd`}
            />
          </aside>
        </>
      )}

      {/* Drawer: Add Follow-up Note */}
      {showAddFollowup && pwd && (
        <>
          <Link className="drawer-scrim" href={`/beneficiaries/${beneficiary.id}?tab=pwd`} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="flw-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">{beneficiary.fullName}</p>
                <h2 id="flw-drawer-title">Add PWD Field Follow-up</h2>
              </div>
              <Link className="btn" href={`/beneficiaries/${beneficiary.id}?tab=pwd`}>
                Close
              </Link>
            </div>
            <form action={addPwdFollowup} className="form" style={{ padding: "16px" }}>
              <input type="hidden" name="pwdId" value={pwd.id} />
              <input type="hidden" name="beneficiaryId" value={beneficiary.id} />

              <div className="form-grid">
                <div className="field span-2">
                  <label className="label" htmlFor="field-flwDate">Follow-up Date</label>
                  <input
                    className="input"
                    id="field-flwDate"
                    name="followupDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="field span-2">
                  <label className="label" htmlFor="field-flwNotes">Observations & Next Steps</label>
                  <textarea
                    className="input"
                    id="field-flwNotes"
                    name="notes"
                    rows={4}
                    required
                    placeholder="Record device usage, school/training attendance, health checkups, or livelihood barriers..."
                  />
                </div>
              </div>

              <div className="drawer-foot" style={{ marginTop: "24px" }}>
                <Link className="btn" href={`/beneficiaries/${beneficiary.id}?tab=pwd`}>
                  Cancel
                </Link>
                <button className="btn btn-primary" type="submit">
                  Save Follow-up Note
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      {/* Drawer: Add PWD Intervention (PRD §4.6 / §7.6) */}
      {showAddIntervention && pwd && (
        <>
          <Link className="drawer-scrim" href={`/beneficiaries/${beneficiary.id}?tab=pwd`} aria-label="Close form" />
          <aside className="drawer" aria-labelledby="inv-drawer-title">
            <div className="drawer-head">
              <div>
                <p className="drawer-kicker">Disability Inclusion (PRD §7.6)</p>
                <h2 id="inv-drawer-title">Record PWD Intervention</h2>
              </div>
              <Link className="btn" href={`/beneficiaries/${beneficiary.id}?tab=pwd`}>
                Close
              </Link>
            </div>
            <form action={addPwdIntervention} className="form" style={{ padding: "16px" }}>
              <input type="hidden" name="pwdId" value={pwd.id} />
              <input type="hidden" name="beneficiaryId" value={beneficiary.id} />

              <div className="form-grid">
                <div className="field span-2">
                  <label className="label" htmlFor="field-invType">
                    Intervention Type <span aria-hidden="true">*</span>
                  </label>
                  <select className="input" id="field-invType" name="interventionType" required defaultValue="Assistive device">
                    <option value="Assistive device">Assistive device distribution</option>
                    <option value="Vocational training">Vocational & skills training</option>
                    <option value="Disability pension">Disability pension linkage</option>
                    <option value="Education aid">Educational aid & scholarships</option>
                    <option value="Medical checkup">Medical assessment & therapy</option>
                    <option value="SHG linkage">SHG & livelihood integration</option>
                  </select>
                </div>
                <div className="field span-2">
                  <label className="label" htmlFor="field-invDate">
                    Date Given <span aria-hidden="true">*</span>
                  </label>
                  <input
                    className="input"
                    id="field-invDate"
                    name="givenOn"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="field span-2">
                  <label className="label" htmlFor="field-invDesc">
                    Description & Support Details
                  </label>
                  <textarea
                    className="input"
                    id="field-invDesc"
                    name="description"
                    rows={3}
                    required
                    placeholder="Details of device, pension scheme, or training batch..."
                  />
                </div>
              </div>

              <div className="drawer-foot" style={{ marginTop: "24px" }}>
                <Link className="btn" href={`/beneficiaries/${beneficiary.id}?tab=pwd`}>
                  Cancel
                </Link>
                <button className="btn btn-primary" type="submit">
                  Record Intervention
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}


