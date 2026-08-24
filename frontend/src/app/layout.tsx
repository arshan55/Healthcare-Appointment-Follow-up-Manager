import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northwell Clinic",
  description: "Appointments, visit summaries, and follow-up",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "var(--font-body)" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
