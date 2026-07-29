import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Clerk renders its own design system, so it has to be told ours once here —
 * otherwise the switcher, user button and org profile arrive in Clerk purple
 * while everything around them is navy and sky. Literal hex, not the CSS vars
 * from globals.css: Clerk derives hover/active shades from these values and
 * needs to read a real color.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "#023047",
    colorPrimaryForeground: "#f4fafc",
    colorForeground: "#023047",
    colorMuted: "#e1eff6",
    colorMutedForeground: "#486b7a",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#023047",
    colorBorder: "#a9d6e9",
    colorRing: "#219ebc",
    colorDanger: "#c0392b",
    colorShadow: "#023047",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-geist-sans)",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CCOS — Creator Campaign Operating System",
  description: "Campaign-centric influencer CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}