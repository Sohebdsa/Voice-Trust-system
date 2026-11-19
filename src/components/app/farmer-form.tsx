"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveFarmerProfile, type ProfileSaveState } from "@/app/actions/profiles";
import { Icon } from "@/components/ui/icons";
import type { FarmerFormValues } from "@/lib/profiles";

const INITIAL: ProfileSaveState = {};

export function FarmerForm({
  beneficiaryId,
  beneficiaryName,
  projectNames,
  initialValues,
  cancelHref,
}: {
  beneficiaryId: string;
  beneficiaryName?: string;
  projectNames?: string[];
  initialValues?: Partial<FarmerFormValues>;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveFarmerProfile, INITIAL);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [lat, setLat] = useState(initialValues?.gpsLatitude ?? "");
  const [lng, setLng] = useState(initialValues?.gpsLongitude ?? "");
  const [landHolding, setLandHolding] = useState<number>(Number(initialValues?.landHoldingAcres) || 0);

  const [crops, setCrops] = useState<
    { season: "kharif" | "rabi" | "zaid" | "perennial"; crop: string; areaAcres: number }[]
  >(
    initialValues?.crops && initialValues.crops.length > 0
      ? initialValues.crops
      : [{ season: "kharif", crop: "", areaAcres: 0 }]
  );

  const captureGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (err) => {
        alert(`Failed to get GPS location: ${err.message}`);
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const addCropRow = () => {
    setCrops([...crops, { season: "kharif", crop: "", areaAcres: 0 }]);
  };

  const removeCropRow = (index: number) => {
    if (crops.length > 1) {
      setCrops(crops.filter((_, i) => i !== index));
    }
  };

  const updateCrop = (index: number, field: string, value: any) => {
    const updated = [...crops];
    updated[index] = { ...updated[index]!, [field]: value };
    setCrops(updated);
  };

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
        <p className="form-section-title span-2">1. Profile & Enrolment</p>

        <div className="field">
          <label className="label" htmlFor="field-farmerCode">
            Farmer ID
          </label>
          <input
            className="input num"
            id="field-farmerCode"
            value={initialValues?.code ?? "Auto-generated on save"}
            readOnly
          />
        </div>

        <div className="field">
          <label className="label">Beneficiary</label>
          <input className="input" type="text" value={beneficiaryName || beneficiaryId} disabled readOnly />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-enrolmentDate">
            Date of enrolment
          </label>
          <input
            className="input"
            id="field-enrolmentDate"
            name="enrolmentDate"
            type="date"
            defaultValue={
              String(initialValues?.enrolmentDate ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10)
            }
            aria-invalid={state.fieldErrors?.enrolmentDate ? true : undefined}
          />
          {state.fieldErrors?.enrolmentDate && <p className="error-text">{state.fieldErrors.enrolmentDate}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-projects">
            Project IDs (via beneficiary)
          </label>
          <input
            className="input"
            id="field-projects"
            value={projectNames && projectNames.length > 0 ? projectNames.join(", ") : "No project enrolment"}
            readOnly
          />
        </div>

        <p className="form-section-title span-2">2. Land Details (PRD §7.4)</p>

        <div className="field">
          <label className="label" htmlFor="field-landHolding">
            Land holding (Acres) <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-landHolding"
            name="landHoldingAcres"
            type="number"
            step="0.1"
            min="0"
            required
            defaultValue={initialValues?.landHoldingAcres ?? ""}
            onChange={(e) => setLandHolding(Number(e.target.value) || 0)}
            aria-invalid={state.fieldErrors?.landHoldingAcres ? true : undefined}
          />
          {state.fieldErrors?.landHoldingAcres && (
            <p className="error-text">{state.fieldErrors.landHoldingAcres}</p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-landOwnership">
            Land ownership <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-landOwnership"
            name="landOwnership"
            required
            defaultValue={initialValues?.landOwnership ?? "owned"}
          >
            <option value="owned">Owned</option>
            <option value="leased">Leased</option>
            <option value="shared">Shared</option>
            <option value="landless">Landless</option>
          </select>
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-irrigation">
            Irrigation source <span aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="field-irrigation"
            name="irrigationSource"
            type="text"
            placeholder="e.g. Well, Canal, Rain-fed, Borewell"
            required
            defaultValue={initialValues?.irrigationSource ?? ""}
          />
        </div>

        <p className="form-section-title span-2">3. Agricultural Practices</p>

        <div className="field">
          <label className="label" htmlFor="field-farmingType">
            Farming practice <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-farmingType"
            name="farmingType"
            required
            defaultValue={initialValues?.farmingType ?? "conventional"}
          >
            <option value="conventional">Conventional</option>
            <option value="organic">Organic</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="field-organicStatus">
            Organic transition status <span aria-hidden="true">*</span>
          </label>
          <select
            className="input"
            id="field-organicStatus"
            name="organicStatus"
            required
            defaultValue={initialValues?.organicStatus ?? "none"}
          >
            <option value="none">None</option>
            <option value="in_conversion">In conversion</option>
            <option value="certified">Certified organic</option>
          </select>
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-practices">
            Specific organic practices
          </label>
          <input
            className="input"
            id="field-practices"
            name="organicPractices"
            type="text"
            placeholder="e.g. Vermicompost, Neem cake, Jeevamrut, crop rotation"
            defaultValue={initialValues?.organicPractices ?? ""}
          />
        </div>

        <p className="form-section-title span-2">4. Seasonal Crops (Repeatable Rows)</p>

        <div className="field span-2" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {crops.map((c, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 90px auto",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <select
                className="input"
                name="crop_season"
                value={c.season}
                onChange={(e) => updateCrop(idx, "season", e.target.value)}
              >
                <option value="kharif">Kharif</option>
                <option value="rabi">Rabi</option>
                <option value="zaid">Zaid</option>
                <option value="perennial">Perennial</option>
              </select>
              <input
                className="input"
                name="crop_name"
                type="text"
                placeholder="Crop name (e.g. Rice, Wheat)"
                value={c.crop}
                onChange={(e) => updateCrop(idx, "crop", e.target.value)}
                required
              />
              <input
                className="input"
                name="crop_area"
                type="number"
                step="0.1"
                min="0"
                placeholder="Acres"
                value={c.areaAcres || ""}
                onChange={(e) => updateCrop(idx, "areaAcres", Number(e.target.value))}
                required
              />
              {crops.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "4px 8px", color: "var(--negative)" }}
                  onClick={() => removeCropRow(idx)}
                  title="Remove crop row"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn"
            style={{ alignSelf: "flex-start", fontSize: "var(--fs-12)", marginTop: "4px" }}
            onClick={addCropRow}
          >
            + Add seasonal crop row
          </button>
          {landHolding > 0 && crops.reduce((sum, c) => sum + (Number(c.areaAcres) || 0), 0) > landHolding && (
            <p className="help" style={{ color: "var(--brand)", margin: "4px 0 0 0" }}>
              ⓘ Multi-cropping: total seasonal crop area ({crops.reduce((sum, c) => sum + (Number(c.areaAcres) || 0), 0).toFixed(1)} acres) exceeds physical land holding ({landHolding} acres) across cycles (PRD §7.4).
            </p>
          )}
        </div>

        <p className="form-section-title span-2">5. Support, Training & Group</p>

        <div className="field">
          <label className="label" htmlFor="field-support">
            Support received
          </label>
          <input
            className="input"
            id="field-support"
            name="supportReceived"
            type="text"
            placeholder="e.g. Soil health card, bio-fertilizer supply"
            defaultValue={initialValues?.supportReceived ?? ""}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-equipment">
            Equipment received
          </label>
          <input
            className="input"
            id="field-equipment"
            name="equipmentReceived"
            type="text"
            placeholder="e.g. Battery sprayer, weeding kit"
            defaultValue={initialValues?.equipmentReceived ?? ""}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-farmerGroup">
            Farmer group ID
          </label>
          <input
            className="input"
            id="field-farmerGroup"
            name="farmerGroup"
            type="text"
            placeholder="e.g. FGRP-04"
            defaultValue={initialValues?.farmerGroup ?? ""}
          />
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="field-training">
            Training details
          </label>
          <textarea
            className="input"
            id="field-training"
            name="trainingDetails"
            rows={2}
            defaultValue={initialValues?.trainingDetails ?? ""}
            placeholder="e.g. Organic certification orientation, bio-input preparation (2 days)"
          />
        </div>

        <p className="form-section-title span-2">6. Geo-Coordinates (Mobile GPS Capture)</p>

        <div className="field">
          <label className="label" htmlFor="field-lat">
            GPS Latitude
          </label>
          <input
            className="input"
            id="field-lat"
            name="gpsLatitude"
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="e.g. 19.245000"
            aria-invalid={state.fieldErrors?.gpsLatitude ? true : undefined}
          />
          {state.fieldErrors?.gpsLatitude && (
            <p className="error-text">{state.fieldErrors.gpsLatitude}</p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="field-lng">
            GPS Longitude
          </label>
          <input
            className="input"
            id="field-lng"
            name="gpsLongitude"
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="e.g. 73.182000"
            aria-invalid={state.fieldErrors?.gpsLongitude ? true : undefined}
          />
          {state.fieldErrors?.gpsLongitude && (
            <p className="error-text">{state.fieldErrors.gpsLongitude}</p>
          )}
        </div>

        <div className="field span-2">
          <button
            type="button"
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={captureGps}
            disabled={gpsLoading}
          >
            <Icon name="map" size={14} />
            {gpsLoading ? "Acquiring GPS fix…" : "Capture live GPS coordinates"}
          </button>
          <p className="help">Capture current device latitude & longitude on field visits.</p>
        </div>

        <p className="form-section-title span-2">7. Follow-up Notes & Status</p>

        <div className="field span-2">
          <label className="label" htmlFor="field-notes">
            Field notes & follow-up recommendations
          </label>
          <textarea
            className="input"
            id="field-notes"
            name="followupNotes"
            rows={2}
            defaultValue={initialValues?.followupNotes ?? ""}
            placeholder="e.g. Transitioning 1.5 acres to organic vegetables; next visit scheduled in 3 weeks."
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="field-status">
            Status
          </label>
          <select
            className="input"
            id="field-status"
            name="status"
            defaultValue={String(initialValues?.status || "active")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="drawer-foot">
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save farmer profile"}
        </button>
      </div>
    </form>
  );
}
