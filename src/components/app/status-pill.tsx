export type PillTone = "neutral" | "positive" | "negative" | "warn" | "brand";

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  return (
    <span className="pill" data-tone={tone}>
      {label}
    </span>
  );
}

export function statusTone(status: string): PillTone {
  switch (status) {
    case "active":
    case "completed":
    case "approved":
    case "on_track":
    case "present":
      return "positive";
    case "cancelled":
    case "rejected":
    case "behind":
    case "absent":
      return "negative";
    case "pending":
    case "on_hold":
    case "planned":
    case "in_conversion":
      return "warn";
    case "draft":
    case "no_data":
      return "neutral";
    default:
      return "neutral";
  }
}
