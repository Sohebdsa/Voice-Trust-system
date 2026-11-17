"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function SignInForm() {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form className="form" action={formAction} noValidate>
      {state.error ? (
        <p className="alert" role="alert" aria-live="polite">
          <Icon name="shield" size={14} />
          <span>{state.error}</span>
        </p>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="email">
          Work email
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="name@voicetrust.org"
          defaultValue={state.email ?? ""}
          aria-invalid={state.error ? true : undefined}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="At least 10 characters"
          aria-invalid={state.error ? true : undefined}
          required
        />
      </div>

      <SubmitButton />

      <div className="auth-foot">
        <Link href="/forgot-password">Forgot password?</Link>
        <span>Prototype · dummy data</span>
      </div>
    </form>
  );
}
