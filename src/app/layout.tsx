import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles/app.css";
import "@/styles/masters.css";

export const metadata: Metadata = {
  title: "VOICE Trust MIS",
  description: "Integrated MIS, HRMS and programme management for VOICE Trust (prototype).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
