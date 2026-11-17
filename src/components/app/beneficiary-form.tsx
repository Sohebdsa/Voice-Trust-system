"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { checkDuplicateMobile, saveBeneficiary, type BeneficiarySaveState } from "@/app/actions/beneficiaries";
import { Icon } from "@/components/ui/icons";
import type { BeneficiaryFormValues, DuplicateMatch } from "@/lib/beneficiaries";

const INITIAL: BeneficiarySaveState = {};

export function BeneficiaryForm({
  id,
  initialValues,
  options,
  cancelHref,
}: {
  id?: string;
  initialValues?: Partial<BeneficiaryFormValues>;
  options: {
    villages: { value: string; label: string }[];
    projects: { value: string; label: string }[];
  };
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveBeneficiary, INITIAL);
  const [allowDup, setAllowDup] = useState(false);
  const [inlineDuplicates, setInlineDuplicates] = useState<DuplicateMatch[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>(String(initialValues?.photoPath ?? ""));

  const value = (name: keyof BeneficiaryFormValues) => {
    if (state.values && state.values[name] !== undefined) {
      return state.values[name];
    }
    return initialValues?.[name] ?? "";
  };

  const error = (name: string) => state.fieldErrors?.[name];

  const selectedProjects = () => {
    const v = value("projectIds");
    return Array.isArray(v) ? v : v ? [v] : [];
  };

  const handleMobileBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const mob = e.target.value.trim().replace(/\D/g, "");
    if (mob.length === 10) {
      try {
        const matches = await checkDuplicateMobile(mob, id);
        setInlineDuplicates(matches);
      } catch {
        // silently fallback
      }
    } else {
      setInlineDuplicates([]);
    }
  };

  const displayDuplicates = state.duplicateWarning?.matches ?? (allowDup ? [] : inlineDuplicates);

  return (
    <form action={action} className="form" noValidate>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="allowDuplicate" value={allowDup ? "true" : "false"} />

      {/* Global general error */}
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="form-grid">
        <p className="form-section-title span-2">1. Identity</p>

        <div className="field span-2">
          <label className="label" htmlFor="field-fullName">
            Full name <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="e.g. Sunita Shantaram Patil"
            defaultValue={String(value("fullName"))}
            aria-invalid={error("fullName") ? true : undefined}
            aria-describedby={error("fullName") ? "fullName-error" : undefined}
          />
          {error("fullName") && (
            <p className="error-text" id="fullName-error">
              {error("fullName")}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-gender">
            Gender <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-gender"
            name="gender"
            required
            defaultValue={String(value("gender"))}
            aria-invalid={error("gender") ? true : undefined}
            aria-describedby={error("gender") ? "gender-error" : undefined}
          >
            <option value="">Select gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
          {error("gender") && (
            <p className="error-text" id="gender-error">
              {error("gender")}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-dateOfBirth">
            Date of birth
          </label>
          <input
            className="input"
            id="field-dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={String(value("dateOfBirth"))}
            aria-invalid={error("dateOfBirth") ? true : undefined}
            aria-describedby={error("dateOfBirth") ? "dateOfBirth-error" : "dateOfBirth-help"}
          />
          <p className="help" id="dateOfBirth-help">
            Age is derived automatically.
          </p>
          {error("dateOfBirth") && (
            <p className="error-text" id="dateOfBirth-error">
              {error("dateOfBirth")}
            </p>
          )}
        </div>

        <p className="form-section-title span-2">2. Contact & Village</p>

        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="label" htmlFor="field-mobile" style={{ margin: 0 }}>
              Mobile number <span aria-hidden="true">*</span>
            </label>
            {displayDuplicates.length > 0 && (
              <span
                className="tooltip-wrap"
                tabIndex={0}
                data-tooltip={`Possible duplicate match: ${displayDuplicates.map((m) => `${m.fullName} (${m.code}, ${m.villageName})`).join("; ")}`}
                data-tooltip-align="right"
                aria-label="Duplicate phone match found"
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
                  <Icon name="alert" size={11} /> Duplicate match ⓘ
                </span>
              </span>
            )}
          </div>
          <input
            className="input"
            id="field-mobile"
            name="mobile"
            type="tel"
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit number"
            defaultValue={String(value("mobile"))}
            onBlur={handleMobileBlur}
            aria-invalid={error("mobile") ? true : undefined}
            aria-describedby={error("mobile") ? "mobile-error" : undefined}
          />
          {displayDuplicates.length > 0 && (
            <div style={{ marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="help" style={{ color: "var(--amber-500)", margin: 0, fontSize: "var(--fs-11)" }}>
                Match: {displayDuplicates[0]!.fullName}. Hover badge for details.
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: "11px", padding: "1px 6px" }}
                onClick={() => {
                  setAllowDup(true);
                  setInlineDuplicates([]);
                }}
              >
                Ignore & proceed
              </button>
            </div>
          )}
          {error("mobile") && (
            <p className="error-text" id="mobile-error">
              {error("mobile")}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-villageId">
            Village <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-villageId"
            name="villageId"
            required
            defaultValue={String(value("villageId"))}
            aria-invalid={error("villageId") ? true : undefined}
            aria-describedby={error("villageId") ? "villageId-error" : undefined}
          >
            <option value="">Select village</option>
            {options.villages.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          {error("villageId") && (
            <p className="error-text" id="villageId-error">
              {error("villageId")}
            </p>
          )}
        </div>

        <p className="form-section-title span-2">3. Identity Document</p>

        <div className="field">
          <label className="label" htmlFor="field-idProofType">
            ID proof type
          </label>
          <select
            className="input"
            id="field-idProofType"
            name="idProofType"
            defaultValue={String(value("idProofType"))}
          >
            <option value="">None / Not provided</option>
            <option value="aadhaar">Aadhaar Card</option>
            <option value="voter">Voter ID (EPIC)</option>
            <option value="ration">Ration Card</option>
            <option value="pan">PAN Card</option>
            <option value="other">Other Gov ID</option>
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="field-idProofLast4">
            Last 4 digits
          </label>
          <input
            className="input"
            id="field-idProofLast4"
            name="idProofLast4"
            type="text"
            maxLength={4}
            placeholder="e.g. 4821"
            defaultValue={String(value("idProofLast4"))}
            aria-invalid={error("idProofLast4") ? true : undefined}
            aria-describedby={error("idProofLast4") ? "idProofLast4-error" : "idProofLast4-help"}
          />
          <p className="help" id="idProofLast4-help">
            DPDP Act: store last 4 digits only.
          </p>
          {error("idProofLast4") && (
            <p className="error-text" id="idProofLast4-error">
              {error("idProofLast4")}
            </p>
          )}
        </div>

        <p className="form-section-title span-2">4. Projects</p>

        <fieldset className="field span-2 checks">
          <legend className="label">Projects to enrol in</legend>
          {options.projects.map((p) => (
            <label className="check" key={p.value}>
              <input
                type="checkbox"
                name="projectIds"
                value={p.value}
                defaultChecked={selectedProjects().includes(p.value)}
              />
              {p.label}
            </label>
          ))}
        </fieldset>

        <p className="form-section-title span-2">5. Photo & Profile Picture (Optional)</p>

        <div className="field span-2">
          <label className="label" htmlFor="field-photo">Beneficiary photograph</label>
          <input
            className="input"
            id="field-photo"
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setPhotoPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <input type="hidden" name="photoPath" value={photoPreview || String(value("photoPath") ?? "")} />
          {photoPreview && (
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <img src={photoPreview} alt="Beneficiary preview" style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }} />
              <button type="button" className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setPhotoPreview("")}>Remove</button>
            </div>
          )}
          <p className="help">Capture live via camera or upload photo file (PRD §7.3).</p>
        </div>

        <p className="form-section-title span-2">6. Consent</p>

        <div className="field span-2">
          <label className="check">
            <input
              type="checkbox"
              name="consentGiven"
              value="true"
              defaultChecked={Boolean(value("consentGiven") || value("consentGivenOn"))}
            />
            <span>Beneficiary has provided explicit consent for registration under DPDP Act</span>
          </label>
          {error("consentGiven") && (
            <p className="error-text" id="consentGiven-error">
              {error("consentGiven")}
            </p>
          )}
        </div>
      </div>

      <div className="drawer-foot">
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save beneficiary"}
        </button>
      </div>
    </form>
  );
}
