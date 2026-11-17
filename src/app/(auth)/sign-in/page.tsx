import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { db } from "@/lib/data/store";
import { getSession, landingFor } from "@/lib/session";
import { roleLabel } from "@/lib/rbac";
import { SignInForm } from "./sign-in-form";

const ROLE_ORDER = [
  "admin",
  "programme_manager",
  "project_coordinator",
  "mel_officer",
  "field_staff",
  "hr_admin",
  "finance",
  "data_entry",
] as const;

export default async function SignInPage() {
  const profile = await getSession();
  if (profile) redirect(landingFor(profile.role));

  const accounts = [...db.profiles].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="workspace-mark">
            <Icon name="logo" size={18} />
          </span>
          <span>
            <span className="workspace-name">VOICE Trust</span>
            <span className="workspace-email">Integrated MIS, HRMS &amp; programmes</span>
          </span>
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">
          Use your VOICE Trust work email. Each department lands on its own starting page.
        </p>

        <SignInForm />

        <details className="auth-demo">
          <summary>Demo accounts for all eight departments</summary>
          <table className="demo-table">
            <thead>
              <tr>
                <th scope="col">Department</th>
                <th scope="col">Email</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{roleLabel(account.role)}</td>
                  <td>{account.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginBlockStart: 8 }}>
            Password for every demo account: <strong>Voice@2026</strong>
          </p>
        </details>
      </div>
    </main>
  );
}
