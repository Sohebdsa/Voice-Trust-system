import { FieldChecklist } from "@/components/app/field-checklist";
import { Topbar } from "@/components/app/topbar";
import { CHECKLIST } from "@/lib/checklist";
import { requireRole } from "@/lib/session";

export default async function ChecklistPage() {
  const profile = await requireRole(["admin"]);
  const total = CHECKLIST.reduce((sum, table) => sum + table.fields.length, 0);

  return (
    <>
      <Topbar
        name={profile.fullName}
        subtitle={`${CHECKLIST.length} tables · ${total} PRD fields checked against the data model`}
      />
      <FieldChecklist />
    </>
  );
}
