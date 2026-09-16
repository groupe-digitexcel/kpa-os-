import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import LanguageBootstrap from "@/components/LanguageBootstrap";
import { getSchoolSettings } from "@/lib/actions/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSchoolSettings();
  return {
    title: `${settings.school_name} | School Operations System`,
    description: `Bilingual school management system — ${settings.address ?? "Douala PK17"}`,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings.school_name,
    },
    icons: {
      icon: "/icon-192.png",
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#1B2B5E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <LanguageBootstrap />
        <ServiceWorkerRegister />
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
