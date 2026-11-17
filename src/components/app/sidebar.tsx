"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { navForRole, roleLabel } from "@/lib/nav";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/data/types";
import { signOut } from "@/app/actions/auth";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const groups = navForRole(profile.role);

  return (
    <aside className="sidebar">
      <Link className="workspace" href="/dashboard" aria-label="VOICE Trust workspace">
        <span className="workspace-mark">
          <Icon name="logo" size={16} />
        </span>
        <span className="workspace-text">
          <span className="workspace-name">VOICE Trust</span>
          <span className="workspace-email">{profile.email}</span>
        </span>
        <Icon name="chevronDown" size={14} />
      </Link>

      <nav className="nav" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="nav-group-label">{group.label}</p>
            <ul className="nav-list">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      className="nav-item"
                      href={item.href}
                      data-active={active}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                    >
                      <span className="nav-icon">
                        <Icon name={item.icon} size={16} />
                      </span>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="user-card">
        <span className="avatar">{initials(profile.fullName)}</span>
        <span className="user-text">
          <span className="user-name">{profile.fullName}</span>
          <span className="user-meta">{roleLabel(profile.role)}</span>
        </span>
        <form action={signOut}>
          <button className="icon-btn" type="submit" title="Sign out" aria-label="Sign out">
            <Icon name="logout" size={15} />
          </button>
        </form>
      </div>
    </aside>
  );
}
