"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveShg, type ProfileSaveState } from "@/app/actions/profiles";
import type { ShgFormValues } from "@/lib/profiles";
import { ProjectPicker } from "./project-picker";

const INITIAL: ProfileSaveState = {};

export function ShgForm({
  initialValues,
  options,
  cancelHref,
}: {
  initialValues?: Partial<ShgFormValues>;
  options: {
    villages: { value: string; label: string }[];
    projects: { value: string; label: string }[];
  };
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveShg, INITIAL);

  const selectedProjects = initialValues?.projectIds ?? [];

  return (
    <form action={action} className="form" noValidate>
      {initialValues?.id ? <input type="hidden" name="id" value={initialValues.id} /> : null}

      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="form-grid">
        <div className="field span-2">
          <label className="label" htmlFor="field-name">
            SHG Group Name <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-name"
            name="name"
            type="text"
            required
            placeholder="e.g. Savitribai Mahila Bachat Gat"
            defaultValue={initialValues?.name ?? ""}
            aria-invalid={state.fieldErrors?.name ? true : undefined}
          />
          {state.fieldErrors?.name && <p className="error-text">{state.fieldErrors.name}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-village">
            Base Village <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-village"
            name="villageId"
            required
            defaultValue={initialValues?.villageId ?? ""}
          >
            <option value="">Select village</option>
            {options.villages.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.villageId && (
            <p className="error-text">{state.fieldErrors.villageId}</p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-date">
            Formation Date <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-date"
            name="formationDate"
            type="date"
            required
            defaultValue={initialValues?.formationDate ?? new Date().toISOString().slice(0, 10)}
          />
          {state.fieldErrors?.formationDate && (
            <p className="error-text">{state.fieldErrors.formationDate}</p>
          )}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-frequency">
            Meeting Frequency & Savings Cadence <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-frequency"
            name="meetingFrequency"
            required
            defaultValue={initialValues?.meetingFrequency ?? "monthly"}
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-number-of-members">
            Number of Members <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-number-of-members"
            name="numberOfMembers"
            type="number"
            min="0"
            required
            defaultValue={initialValues?.numberOfMembers ?? ""}
          />
          {state.fieldErrors?.numberOfMembers && <p className="error-text">{state.fieldErrors.numberOfMembers}</p>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-livelihood-activity">
            Livelihood Activity <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-livelihood-activity"
            name="livelihoodActivity"
            type="text"
            required
            placeholder="e.g. Papad making, Agarbatti, Handicrafts"
            defaultValue={initialValues?.livelihoodActivity ?? ""}
          />
          {state.fieldErrors?.livelihoodActivity && <p className="error-text">{state.fieldErrors.livelihoodActivity}</p>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-bank-name">
            Bank Name <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-bank-name"
            name="bankName"
            type="text"
            required
            placeholder="e.g. State Bank of India"
            defaultValue={initialValues?.bankName ?? ""}
          />
          {state.fieldErrors?.bankName && <p className="error-text">{state.fieldErrors.bankName}</p>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-bank-account">
            Bank Account No <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-bank-account"
            name="bankAccountNo"
            type="text"
            required
            placeholder="e.g. 123456789012"
            defaultValue={initialValues?.bankAccountNo ?? ""}
          />
          {state.fieldErrors?.bankAccountNo && <p className="error-text">{state.fieldErrors.bankAccountNo}</p>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-ifsc-code">
            IFSC Code <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-ifsc-code"
            name="ifscCode"
            type="text"
            required
            placeholder="e.g. SBIN0001234"
            defaultValue={initialValues?.ifscCode ?? ""}
          />
          {state.fieldErrors?.ifscCode && <p className="error-text">{state.fieldErrors.ifscCode}</p>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-bank-linkage-date">
            Bank Linkage Date <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-bank-linkage-date"
            name="bankLinkageDate"
            type="date"
            required
            defaultValue={initialValues?.bankLinkageDate ?? new Date().toISOString().slice(0, 10)}
          />
          {state.fieldErrors?.bankLinkageDate && <p className="error-text">{state.fieldErrors.bankLinkageDate}</p>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-support-received">
            Support Received <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-support-received"
            name="supportReceived"
            type="text"
            required
            placeholder="e.g. Revolving fund, micro-credit"
            defaultValue={initialValues?.supportReceived ?? ""}
          />
          {state.fieldErrors?.supportReceived && <p className="error-text">{state.fieldErrors.supportReceived}</p>}
        </div>

        <p className="form-section-title span-2">Linked Development Projects (PRD §4.7 / §7.5)</p>

        <div className="field span-2" role="group" aria-labelledby="field-projects-label">
          <span className="label" id="field-projects-label">
            Projects supporting this SHG
          </span>
          <ProjectPicker options={options.projects} selected={selectedProjects} />
          <p className="help">Choose every project that supports this group.</p>
        </div>
      </div>

      <div className="drawer-foot">
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Self-Help Group"}
        </button>
      </div>
    </form>
  );
}
