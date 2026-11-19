"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { checkDuplicateMobile, saveBeneficiary, type BeneficiarySaveState } from "@/app/actions/beneficiaries";
import { ProjectPicker } from "./project-picker";
import { Icon } from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
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
    villages: {
      value: string;
      label: string;
      block?: string;
      panchayat?: string;
      district?: string;
      state?: string;
    }[];
    projects: { value: string; label: string }[];
  };
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveBeneficiary, INITIAL);
  const [allowDup, setAllowDup] = useState(false);
  const [inlineDuplicates, setInlineDuplicates] = useState<DuplicateMatch[]>([]);
  const [photoName, setPhotoName] = useState(String(initialValues?.photoPath ?? ""));
  const [villageId, setVillageId] = useState(String(initialValues?.villageId ?? ""));
  const selectedVillage = options.villages.find((v) => v.value === villageId);

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

        <div className="field">
          <label className="label" htmlFor="field-code">
            Beneficiary ID
          </label>
          <input
            className="input num"
            id="field-code"
            value={String(initialValues?.code ?? "Auto-generated on save")}
            readOnly
          />
          <p className="help">Assigned by the system as BEN-000000.</p>
        </div>

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

        <p className="form-section-title span-2">2. Contact & Address</p>

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
          <label className="label" htmlFor="field-alternateContact">
            Alternate contact
          </label>
          <input
            className="input"
            id="field-alternateContact"
            name="alternateContact"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Optional 10-digit number"
            defaultValue={String(value("alternateContact"))}
            aria-invalid={error("alternateContact") ? true : undefined}
            aria-describedby={error("alternateContact") ? "alternateContact-error" : undefined}
          />
          {error("alternateContact") && (
            <p className="error-text" id="alternateContact-error">
              {error("alternateContact")}
            </p>
          )}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-addressLine">
            Address line
          </label>
          <input
            className="input"
            id="field-addressLine"
            name="addressLine"
            type="text"
            placeholder="House / street / hamlet"
            maxLength={160}
            defaultValue={String(value("addressLine"))}
            aria-invalid={error("addressLine") ? true : undefined}
          />
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
            value={villageId}
            onChange={(e) => setVillageId(e.target.value)}
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

        <div className="field">
          <label className="label" htmlFor="field-enrolmentDate">
            Enrolment date
          </label>
          <input
            className="input"
            id="field-enrolmentDate"
            name="enrolmentDate"
            type="date"
            defaultValue={
              String(value("enrolmentDate")) || new Date().toISOString().slice(0, 10)
            }
            aria-invalid={error("enrolmentDate") ? true : undefined}
            aria-describedby={error("enrolmentDate") ? "enrolmentDate-error" : undefined}
          />
          {error("enrolmentDate") && (
            <p className="error-text" id="enrolmentDate-error">
              {error("enrolmentDate")}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-block">Block (from village)</label>
          <input className="input" id="field-block" value={selectedVillage?.block ?? ""} readOnly />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-panchayat">Panchayat (from village)</label>
          <input className="input" id="field-panchayat" value={selectedVillage?.panchayat ?? ""} readOnly />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-district">District (from village)</label>
          <input className="input" id="field-district" value={selectedVillage?.district ?? ""} readOnly />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-state">State (from village)</label>
          <input className="input" id="field-state" value={selectedVillage?.state ?? ""} readOnly />
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
            ID proof number
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
            DPDP Act: only the last 4 digits of the ID number are stored.
          </p>
          {error("idProofLast4") && (
            <p className="error-text" id="idProofLast4-error">
              {error("idProofLast4")}
            </p>
          )}
        </div>

        <p className="form-section-title span-2">4. Projects</p>

        <div className="field span-2" role="group" aria-labelledby="field-projects-label">
          <span className="label" id="field-projects-label">
            Projects to enrol in
          </span>
          <ProjectPicker options={options.projects} selected={selectedProjects()} />
          <p className="help">A beneficiary can be enrolled in more than one project.</p>
        </div>

        <p className="form-section-title span-2">5. Photograph</p>

        <div className="field span-2">
          <label className="label" htmlFor="field-photo">Beneficiary photograph</label>
          <input
            className="input"
            id="field-photo"
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? "")}
          />
          <input type="hidden" name="photoPath" value={photoName} />
          {photoName && (
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="help" style={{ margin: 0 }}>{photoName}</span>
              <button type="button" className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setPhotoName("")}>Remove</button>
            </div>
          )}
          <p className="help">Only the file name is recorded — this prototype stores no upload (PRD §7.3).</p>
        </div>

        <p className="form-section-title span-2">6. Record</p>

        <div className="field">
          <label className="label" htmlFor="field-status">Status</label>
          <select className="input" id="field-status" name="status" defaultValue={String(value("status") || "active")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {initialValues?.createdBy && (
          <div className="field">
            <label className="label" htmlFor="field-createdBy">Created by</label>
            <input className="input" id="field-createdBy" value={initialValues.createdBy} readOnly />
          </div>
        )}

        {initialValues?.createdAt && (
          <div className="field">
            <label className="label" htmlFor="field-createdAt">Created at</label>
            <input className="input" id="field-createdAt" value={formatDate(initialValues.createdAt)} readOnly />
          </div>
        )}

        {initialValues?.updatedAt && (
          <div className="field">
            <label className="label" htmlFor="field-updatedAt">Updated at</label>
            <input className="input" id="field-updatedAt" value={formatDate(initialValues.updatedAt)} readOnly />
          </div>
        )}

        <p className="form-section-title span-2">7. Consent</p>

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
