const inr = new Intl.NumberFormat("en-IN");

/** Indian digit grouping, e.g. 48215 -> "48,215" (PRD §9.7). */
export const formatNumber = (value: number) => inr.format(Math.round(value));

export const formatCompact = (value: number) =>
  value >= 100000 ? `${(value / 100000).toFixed(1)}L` : formatNumber(value);

export const formatCurrency = (value: number) =>
  `₹${inr.format(Math.round(value))}`;

export const formatCurrencyCompact = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return formatCurrency(value);
};

export const formatPercent = (value: number, digits = 0) =>
  `${value.toFixed(digits)}%`;

export function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/** Age in whole years from an ISO date (PRD §7.3: derived, never stored). */
export function ageFrom(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age < 0 ? null : age;
}

const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: string | Date, to: string | Date = new Date()) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.floor((b.getTime() - a.getTime()) / DAY);
}

/** "2 min ago" style relative time for list cards (PRD §9.1). */
export function relativeTime(date: string | Date, now: Date = new Date()) {
  const diffMs = now.getTime() - new Date(date).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function formatDateShort(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function greetingFor(name: string, now: Date = new Date()) {
  const istHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  const part = istHour < 12 ? "Good morning" : istHour < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0] ?? name;
  return `${part}, ${first}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Percentage change for KPI delta pills; never invents a number when there is no baseline. */
export function delta(current: number, previous: number): { trend: "up" | "down" | "flat"; label: string } {
  if (previous === 0 && current === 0) return { trend: "flat", label: "0%" };
  if (previous === 0) return { trend: "up", label: `+${current}` };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { trend: "flat", label: "0%" };
  const sign = change > 0 ? "+" : "";
  return { trend: change > 0 ? "up" : "down", label: `${sign}${change.toFixed(1)}%` };
}

/** Financial year (April–March), PRD §8.1. */
export function currentFinancialYear(now: Date = new Date()) {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: new Date(year, 3, 1),
    end: new Date(year + 1, 2, 31, 23, 59, 59),
    label: `FY ${year}-${String((year + 1) % 100).padStart(2, "0")}`,
  };
}

export function fyStart(now: Date = new Date()) {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1);
}

export function isWithin(date: string | Date, from: Date, to: Date) {
  const d = new Date(date).getTime();
  return d >= from.getTime() && d <= to.getTime();
}
