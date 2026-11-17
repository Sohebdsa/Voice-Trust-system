"use client";

import Link from "next/link";
import { useActionState } from "react";
import { savePwdProfile, type ProfileSaveState } from "@/app/actions/profiles";
import { Icon } from "@/components/ui/icons";
import type { PwdFormValues } from "@/lib/profiles";

const INITIAL: ProfileSaveState = {};

export function PwdForm({
  beneficiaryId,
  beneficiaryName,
  initialValues,
  cancelHref,
}: {
  beneficiaryId: string;
  beneficiaryName?: string;
  initialValues?: Partial<PwdFormValues>;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(savePwdProfile, INITIAL);

  return (
    <form action={action} className="form" noValidate>
      {initialValues?.id ? <input type="hidden" name="id" value={initialValues.id} /> : null}
      <input type="hidden" name="beneficiaryId" value={beneficiaryId} />

      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="form-grid">
        <div className="field span-2">
          <label className="label">Beneficiary</label>
          <input className="input" type="text" value={beneficiaryName || beneficiaryId} disabled readOnly />
        </div>

        <div className="span-2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
          <p className="form-section-title" style={{ margin: 0 }}>1. Disability Details (PRD §7.6)</p>
          <span
            className="tooltip-wrap"
            tabIndex={0}
            data-tooltip="Confidential record: all additions and edits are strictly audited under DPDP regulations."
            data-tooltip-align="right"
            aria-label="Confidential record notice"
          >
            <span
              className="pill"
              data-tone="warn"
              style={{
                fontSize: "11px",
                padding: "2px 8px",
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

        <div className="field">
          <label className="label" htmlFor="field-disabilityType">
            Disability category <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-disabilityType"
            name="disabilityType"
            required
            defaultValue={initialValues?.disabilityType ?? "Locomotor"}
          >
            <option value="Locomotor">Locomotor</option>
            <option value="Visual">Visual impairment</option>
            <option value="Hearing">Hearing impairment</option>
            <option value="Intellectual">Intellectual disability</option>
            <option value="Multiple">Multiple disabilities</option>
            <option value="Mental illness">Mental illness</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="field-disabilityPct">
            Disability percentage (0–100%) <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-disabilityPct"
            name="disabilityPercentage"
            type="number"
            min="0"
            max="100"
            required
            defaultValue={initialValues?.disabilityPercentage ?? "40"}
            aria-invalid={state.fieldErrors?.disabilityPercentage ? true : undefined}
          />
          {state.fieldErrors?.disabilityPercentage && (
            <p className="error-text">{state.fieldErrors.disabilityPercentage}</p>
          )}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-certNo">
            Disability certificate number / UDID <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-certNo"
            name="certificateNo"
            type="text"
            placeholder="e.g. MH/TH/2024/12345"
            required
            defaultValue={initialValues?.certificateNo ?? ""}
          />
          {state.fieldErrors?.certificateNo && (
            <p className="error-text">{state.fieldErrors.certificateNo}</p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-certDate">
            Certificate issue date
          </label>
          <input
            className="input"
            id="field-certDate"
            name="certificateIssueDate"
            type="date"
            defaultValue={initialValues?.certificateIssueDate ?? ""}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-authority">
            Issuing medical authority
          </label>
          <input
            className="input"
            id="field-authority"
            name="certificateIssuingAuthority"
            type="text"
            placeholder="e.g. District Civil Surgeon, Thane"
            defaultValue={initialValues?.certificateIssuingAuthority ?? "District Civil Surgeon, Thane"}
          />
        </div>

        <p className="form-section-title span-2">2. Education & Vocation</p>

        <div className="field">
          <label className="label" htmlFor="field-edu">
            Education attainment <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-edu"
            name="educationLevel"
            required
            defaultValue={initialValues?.educationLevel ?? "Secondary"}
          >
            <option value="None">None / Illiterate</option>
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Higher secondary">Higher secondary</option>
            <option value="Graduate">Graduate</option>
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="field-vocation">
            Livelihood & vocational status <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-vocation"
            name="vocationalStatus"
            required
            defaultValue={initialValues?.vocationalStatus ?? "Seeking work"}
          >
            <option value="Trained">Trained</option>
            <option value="Seeking work">Seeking work</option>
            <option value="Self-employed">Self-employed</option>
            <option value="Wage employed">Wage employed</option>
            <option value="Not working">Not working</option>
          </select>
        </div>

        <p className="form-section-title span-2">3. Accessibility & Assistive Devices</p>

        <div className="field">
          <label className="label" htmlFor="field-needs">
            Accessibility needs
          </label>
          <input
            className="input"
            id="field-needs"
            name="accessibilityNeeds"
            type="text"
            placeholder="e.g. Wheelchair ramp, braille, tactile aids"
            defaultValue={initialValues?.accessibilityNeeds ?? ""}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-device">
            Assistive device required / provided
          </label>
          <input
            className="input"
            id="field-device"
            name="assistiveDevice"
            type="text"
            placeholder="e.g. Tricycle, wheelchair, hearing aid"
            defaultValue={initialValues?.assistiveDevice ?? ""}
          />
        </div>

        <p className="form-section-title span-2">4. Individual Inclusion Plan</p>

        <div className="field span-2">
          <label className="label" htmlFor="field-plan">
            Inclusion plan & proposed support
          </label>
          <textarea
            className="input"
            id="field-plan"
            name="individualPlan"
            rows={2}
            placeholder="e.g. Link to SHG for savings; facilitate skill training in tailoring; pension follow-up."
            defaultValue={initialValues?.individualPlan ?? ""}
          />
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-outcome">
            Long-term inclusion outcome
          </label>
          <input
            className="input"
            id="field-outcome"
            name="outcome"
            type="text"
            placeholder="e.g. Achieved sustainable monthly income of ₹6,000"
            defaultValue={initialValues?.outcome ?? ""}
          />
        </div>
      </div>

      <div className="drawer-foot">
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save confidential PWD profile"}
        </button>
      </div>
    </form>
  );
}
