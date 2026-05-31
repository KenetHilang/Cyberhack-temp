import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AromaFlow",
  description:
    "Integrated manufacturing operations platform with AI quality control, lot traceability, and a tamper-evident audit trail.",
  icons:{
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
