import type { NextRequest } from "next/server";
import { db } from "@/lib/data/store";
import { csvResponse } from "@/lib/csv";
import { listBeneficiaries, parseBeneficiaryQuery } from "@/lib/queries/beneficiaries";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const profile = await getSession();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const query = parseBeneficiaryQuery(params);

  // For export, return all matching rows by bypassing pagination
  const result = listBeneficiaries(profile, { ...query, page: 1 }, Number.MAX_SAFE_INTEGER);
  const exportRows = result.rows;

  const header = [
    "Code",
    "Full Name",
    "Gender",
    "Age",
    "Mobile",
    "Village",
    "Block",
    "District",
    "Profiles",
    "Projects Count",
    "Status",
  ];

  const dataRows = exportRows.map((r) => [
    r.code,
    r.fullName,
    r.gender,
    r.age !== null ? r.age : "",
    r.mobile,
    r.villageName,
    r.block,
    r.district,
    [
      r.profiles.isFarmer ? "Farmer" : "",
      r.profiles.isShg ? "SHG" : "",
      r.profiles.isPwd ? "PWD" : "",
    ]
      .filter(Boolean)
      .join(", "),
    r.projectsCount,
    r.status,
  ]);

  const table = [header, ...dataRows];

  db.audit.push({
    id: `aud-beneficiaries-export-${Date.now()}`,
    actorId: profile.id,
    actorName: profile.fullName,
    action: "export",
    tableName: "beneficiaries",
    recordId: "",
    at: new Date().toISOString(),
  });

  return csvResponse(table, `voice-trust-beneficiaries-${new Date().toISOString().slice(0, 10)}.csv`);
}
