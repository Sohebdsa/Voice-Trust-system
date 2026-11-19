"use client";

/** Beneficiary dropdown for the farmer/PWD drawers: a server page cannot pass onChange itself. */
export function BeneficiarySelectNav({
  base,
  options,
}: {
  base: string;
  options: { id: string; fullName: string; code: string }[];
}) {
  return (
    <select
      className="input"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) {
          window.location.href = `${base}${base.includes("?") ? "&" : "?"}beneficiaryId=${e.target.value}`;
        }
      }}
    >
      <option value="">Choose beneficiary…</option>
      {options.map((b) => (
        <option key={b.id} value={b.id}>
          {b.fullName} ({b.code})
        </option>
      ))}
    </select>
  );
}
