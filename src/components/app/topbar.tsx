import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { InboxToggle } from "./inbox-toggle";
import { greetingFor } from "@/lib/format";

export function Topbar({
  name,
  subtitle,
  action,
  secondary,
}: {
  name: string;
  subtitle?: string;
  action?: { label: string; href: string; icon?: string };
  secondary?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar-lead">
        <h1 className="greeting">{greetingFor(name)}</h1>
        {subtitle ? <p className="greeting-sub">{subtitle}</p> : null}
      </div>
      <div className="topbar-actions">
        <InboxToggle />
        <button className="icon-btn" type="button" aria-label="Search (Ctrl or Cmd + K)" title="Search — Ctrl/Cmd + K">
          <Icon name="search" size={15} />
        </button>
        {secondary}
        {action ? (
          <Link className="btn btn-primary" href={action.href}>
            <Icon name="plus" size={14} />
            {action.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function FilterBar({
  items,
}: {
  items: { label: string; value: string; icon?: string }[];
}) {
  return (
    <div className="filterbar" aria-label="Filters">
      {items.map((item) => (
        <button className="filter-pill" key={item.label} type="button">
          <span className="label">{item.label}</span>
          {item.value}
          <Icon name={item.icon ?? "chevronDown"} size={12} />
        </button>
      ))}
    </div>
  );
}
