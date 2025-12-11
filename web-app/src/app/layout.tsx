import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { AcademyProvider } from "@/contexts/AcademyContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Suarez Academy | Sistema de Gestión",
  description: "Sistema de gestión integral para Suarez Academy",
};

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
  // #region agent log
  const logData = {location:'layout.tsx:24',message:'RootLayout rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
  console.log('[DEBUG]', JSON.stringify(logData));
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/9bb383e5-e9d8-4a41-b56c-bd9bbb1d838d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
  }
  // #endregion
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
