import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { StatusPill, statusTone } from "./status-pill";
import { archiveMaster } from "@/app/actions/masters";

/** Detail page header: name, code, status, and the actions for that record. */
export function DetailHeader({
  backHref,
  backLabel,
  title,
  code,
  status,
  subtitle,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  code: string;
  status: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="detail-head">
      <Link className="back-link" href={backHref}>
        <Icon name="chevronDown" size={13} className="back-icon" />
        {backLabel}
      </Link>
      <div className="detail-title">
        <div>
          <h1>{title}</h1>
          <p className="greeting-sub">
            <span className="num">{code}</span>
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        <div className="detail-actions">
          <StatusPill label={status.replace("_", " ")} tone={statusTone(status)} />
          {children}
        </div>
      </div>
    </header>
  );
}

/**
 * Section tabs as links: they change which panel the page renders, so this is
 * navigation, not the ARIA tab widget (Modern Web Guidance: tabs).
 */
export function DetailTabs({
  base,
  active,
  tabs,
}: {
  base: string;
  active: string;
  tabs: { key: string; label: string; count?: number }[];
}) {
  return (
    <nav className="tabs" aria-label="Sections">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          className="tab"
          href={`${base}${base.includes("?") ? "&" : "?"}tab=${tab.key}`}
          aria-current={active === tab.key ? "page" : undefined}
        >
          {tab.label}
          {typeof tab.count === "number" ? <span className="tab-count">{tab.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function Facts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="facts">
      {items.map((item) => (
        <div className="fact" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Archive states the consequence and uses the same verb on the button (PRD §9.4). */
export function ArchiveButton({ entity, id, name }: { entity: string; id: string; name: string }) {
  return (
    <details className="archive">
      <summary className="btn btn-ghost">Archive</summary>
      <form className="archive-panel" action={archiveMaster}>
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={id} />
        <p>
          Archive <strong>{name}</strong>? It stops appearing in lists and pickers, and its history is kept.
        </p>
        <div className="drawer-foot">
          <button className="btn btn-danger" type="submit">
            Archive {name}
          </button>
        </div>
      </form>
    </details>
  );
}
