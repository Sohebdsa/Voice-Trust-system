import type { NextRequest } from "next/server";
import { db } from "@/lib/data/store";
import { csvResponse } from "@/lib/csv";
import { asEntity } from "@/lib/masters";
import { listMaster, parseListQuery } from "@/lib/queries/masters";
import { getSession } from "@/lib/session";

/** CSV of the master list as currently filtered (PRD §6: exports respect the filters). */
export async function GET(request: NextRequest) {
  const profile = await getSession();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const entity = asEntity(params.entity);
  if (!entity) return new Response("Unknown record type", { status: 400 });

  const result = listMaster(profile, entity, { ...parseListQuery(params), page: 1 }, Number.MAX_SAFE_INTEGER);

  const rows: Record<string, string | number>[] = result.rows.map((row) => row as Record<string, string | number>);
  const columns = Object.keys(rows[0] ?? {}).filter((key) => key !== "id");
  const table = [columns, ...rows.map((row) => columns.map((key) => row[key] ?? ""))];

  db.audit.push({
    id: `aud-${entity}-export-${Date.now()}`,
    actorId: profile.id,
    actorName: profile.fullName,
    action: "export",
    tableName: entity,
    recordId: "",
    at: new Date().toISOString(),
  });

  return csvResponse(table, `voice-trust-${entity}-${new Date().toISOString().slice(0, 10)}.csv`);
}
