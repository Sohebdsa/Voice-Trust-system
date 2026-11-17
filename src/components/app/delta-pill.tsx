import { Icon } from "@/components/ui/icons";

/** Delta pill: always carries an arrow and a sign, never colour alone (PRD §9.2). */
export function DeltaPill({
  trend,
  label,
  context,
}: {
  trend: "up" | "down" | "flat";
  label: string;
  context?: string;
}) {
  return (
    <span className="delta" data-trend={trend}>
      <Icon name={trend === "down" ? "arrowDown" : "arrowUp"} size={11} strokeWidth={2.2} />
      <span className="num">{label}</span>
      {context ? <span className="visually-hidden">{context}</span> : null}
    </span>
  );
}
