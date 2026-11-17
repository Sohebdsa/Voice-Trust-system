/**
 * Small inline icon set (stroke 1.7, 24px viewBox). Written by hand instead of
 * pulling in an icon package — the prototype needs ~28 glyphs, and this keeps
 * the dependency list to Next + React (see Docs/decisions.md).
 */
const PATHS: Record<string, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z",
  hr: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.9M16.5 3.1a4 4 0 0 1 0 7.8",
  wallet: "M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm13 4h3M3 9h17",
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z",
  people: "M17 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 3 18.5V20M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1.5a4.5 4.5 0 0 0-3.2-4.3M15.6 3.6a3.5 3.5 0 0 1 0 6.8",
  group: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 8v-1a7 7 0 0 1 14 0v1H5Z",
  accessibility: "M12 6a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 12 6ZM6 9h12M12 9v5m0 0 3 7m-3-7-3 7",
  badge: "M9 3h6v3l2 2v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-2V3Zm1 11h4",
  calendar: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  activity: "M3 12h4l2.5-7 4 14L16 12h5",
  target: "M12 3v3m0 12v3M3 12h3m12 0h3M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z",
  layers: "M12 3 3 8l9 5 9-5-9-5Zm-9 8 9 5 9-5M3 16l9 5 9-5",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  map: "M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  handshake: "M4 12l4-4 3 3 1-1 4 4M3 15l4 4 5-3 5 3 4-4M14 8l4 4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2",
  shield: "M12 21c4.5-1.6 7-5 7-9V5.5L12 3 5 5.5V12c0 4 2.5 7.4 7 9Zm-2.5-9.5 2 2 4-4",
  list: "M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 1-4.5-4.5",
  plus: "M12 5v14M5 12h14",
  chevronDown: "m6 9 6 6 6-6",
  arrowUp: "M12 19V5m0 0-6 6m6-6 6 6",
  arrowDown: "M12 5v14m0 0 6-6m-6 6-6-6",
  logo: "M12 2c2 3 5 4.5 8 4.5-.5 8-4 14-8 15.5-4-1.5-7.5-7.5-8-15.5C7 6.5 10 5 12 2Z",
  inbox: "M4 13h4l1.5 2.5h5L16 13h4M4 13 6 5h12l2 8v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z",
  check: "m5 13 4 4L19 7",
  logout: "M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6",
  download: "M12 4v10m0 0 4-4m-4 4-4-4M5 20h14",
  filter: "M4 6h16M7 12h10m-7 6h4",
  user: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
};

export type IconName = keyof typeof PATHS | string;

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.7,
  className,
  "aria-hidden": ariaHidden = true,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const path = PATHS[name] ?? PATHS.list!;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}
