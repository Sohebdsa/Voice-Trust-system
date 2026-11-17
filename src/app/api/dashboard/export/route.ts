import type { NextRequest } from "next/server";
import { csvResponse } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { getDashboardData, parseFilters } from "@/lib/queries/dashboard";
import { getSession } from "@/lib/session";

/**
 * "Export of the current dashboard view (or underlying data) to Excel/PDF"
 * from the source document (B5). CSV opens in Excel; the same filters as the
 * on-screen view are applied.
 */
export async function GET(request: NextRequest) {
  const profile = await getSession();
  if (!profile) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFilters(params);
  const data = getDashboardData(profile, filters);

  const rows: string[][] = [
    ["VOICE Trust MIS — dashboard export"],
    ["Filters", `${data.rangeLabel} · ${data.filterLabel}`],
    ["Scope", data.scopeLabel],
    ["Generated", new Date().toISOString()],
    [],
    ["KPI", "Value", "Detail"],
    ...data.kpi.map((kpi) => [kpi.label, formatNumber(kpi.value), kpi.hint]),
    [],
    ["Month", "Completed", "Planned"],
    ...data.monthly.map((month) => [month.label, String(month.completed), String(month.planned)]),
    [],
    ["Beneficiary type", "Count", "Percent of total"],
    ...data.reach.segments.map((segment) => [segment.label, formatNumber(segment.count), `${segment.percent}%`]),
    [],
    ["Project", "Beneficiaries"],
    ...data.projectCoverage.map((row) => [row.label, formatNumber(row.count)]),
    [],
    ["Village", "Beneficiaries"],
    ...data.topVillages.map((row) => [row.label, formatNumber(row.count)]),
    [],
    ["Block", "Beneficiaries"],
    ...data.geoCoverage.map((row) => [row.label, formatNumber(row.count)]),
  ];

  return csvResponse(rows, `voice-trust-dashboard-${new Date().toISOString().slice(0, 10)}.csv`);
}
