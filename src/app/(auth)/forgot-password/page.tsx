import Link from "next/link";
import { Icon } from "@/components/ui/icons";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="workspace-mark">
            <Icon name="logo" size={18} />
          </span>
          <span className="workspace-name">VOICE Trust</span>
        </div>

        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-sub">
          Enter your work email and the HR admin will send a reset link.
        </p>

        <form className="form">
          <p className="alert" data-tone="info" aria-live="polite">
            <Icon name="shield" size={14} />
            <span>
              Prototype: no email is sent. Use the demo password <strong>Voice@2026</strong> on the sign-in
              page, or ask the HR admin to reset the account in the real system.
            </span>
          </p>

          <div className="field">
            <label className="label" htmlFor="reset-email">
              Work email
            </label>
            <input
              className="input"
              id="reset-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@voicetrust.org"
            />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled>
            Send reset link
          </button>

          <div className="auth-foot">
            <Link href="/sign-in">Back to sign in</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
