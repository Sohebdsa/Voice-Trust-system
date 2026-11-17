import Link from "next/link";
import { FilterBar, Topbar } from "@/components/app/topbar";
import { Icon } from "@/components/ui/icons";
import { requireSession } from "@/lib/session";

/**
 * Placeholder for modules built in later steps. Static routes win over this
 * catch-all, so /dashboard, /dashboard/hr, /dashboard/finance and /home keep
 * their real pages while every nav item stays clickable during the demo.
 */
const MODULES: Record<string, { title: string; step: number; prd: string; summary: string }> = {
  activities: {
    title: "Activities",
    step: 5,
    prd: "§7.7",
    summary: "List and calendar, activity form, participants with bulk add by village, attachments and derived gender counts.",
  },
  mel: {
    title: "MEL indicators",
    step: 6,
    prd: "§7.8",
    summary: "Indicators per project with target versus achievement, and period value entry with the male + female = total rule.",
  },
  employees: {
    title: "Employees",
    step: 7,
    prd: "§7.9",
    summary: "Employee list and detail tabs for profile, allocation, attendance and leave.",
  },
  attendance: {
    title: "Attendance",
    step: 7,
    prd: "§7.9",
    summary: "Bulk daily attendance grid with exceptions, plus self check-in and the late flag.",
  },
  leave: {
    title: "Leave",
    step: 7,
    prd: "§7.9",
    summary: "Leave application with balance and overlap checks, approval queue and automatic attendance update.",
  },
  users: {
    title: "Users and roles",
    step: 8,
    prd: "§7.1",
    summary: "User list, role assignment, activation and scope rows for programme, project and village limits.",
  },
  audit: {
    title: "Audit log",
    step: 8,
    prd: "§5.2",
    summary: "Append-only log filtered by user, table, action and date, with CSV export.",
  },
};

export default async function NotBuiltPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const profile = await requireSession();
  const { slug } = await params;
  const key = slug[0] ?? "";
  const module = MODULES[key];

  if (!module) {
    return (
      <>
        <Topbar name={profile.fullName} subtitle="Screen not found" />
        <div className="main-body">
          <section className="card placeholder">
            <h2>This screen does not exist yet</h2>
            <p>
              <strong>/{slug.join("/")}</strong> is not part of Step 1. Use the sidebar to reach a screen that is
              built, or head back to your starting page.
            </p>
            <Link className="btn btn-primary" href="/">
              Go to my starting page
            </Link>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar name={profile.fullName} subtitle={`${module.title} · arrives in Step ${module.step}`} />
      <FilterBar
        items={[
          { label: "Period", value: "This FY" },
          { label: "Status", value: "All" },
        ]}
      />
      <div className="main-body">
        <section className="card placeholder">
          <p className="pill" data-tone="brand">
            Step {module.step} · PRD {module.prd}
          </p>
          <h2>{module.title} is planned, not built yet</h2>
          <p>{module.summary}</p>
          <p>
            Step 1 delivered the shell, sign-in for all eight departments and the starting pages. This screen is
            built in Step {module.step} of the plan in <strong>Docs/MVP-PLAN.md</strong>, after the module it depends
            on.
          </p>
          <Link className="btn" href="/dashboard">
            <Icon name="dashboard" size={14} /> Back to dashboard
          </Link>
        </section>
      </div>
    </>
  );
}
