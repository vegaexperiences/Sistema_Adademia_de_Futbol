import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { AcademyProvider } from "@/contexts/AcademyContext";
import { getCurrentAcademy } from "@/lib/utils/academy";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const academy = await getCurrentAcademy();
    if (!academy) {
      return {
        title: "Suarez Academy | Sistema de Gestión",
        description: "Sistema de gestión integral para Suarez Academy",
      };
    }

    const academyName = academy.display_name || academy.name || "Suarez Academy";
    
    // Use custom metadata if available, otherwise use defaults
    const customTitle = academy.settings?.metadata?.page_title;
    const customDescription = academy.settings?.metadata?.page_description;
    
    const title = customTitle || `${academyName} | Sistema de Gestión`;
    const description = customDescription || `Sistema de gestión integral para ${academyName}`;
    
    return {
      title,
      description,
    };
  } catch (error) {
    // Fallback to default if academy cannot be fetched
    return {
      title: "Suarez Academy | Sistema de Gestión",
      description: "Sistema de gestión integral para Suarez Academy",
    };
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.className} antialiased`}
      >
        <AcademyProvider>
          <ConditionalNavbar />
          <main className="flex-grow">
            {children}
          </main>
          <ConditionalFooter />
        </AcademyProvider>
      </body>
    </html>
  );
}
