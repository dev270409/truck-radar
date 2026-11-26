import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Truck Radar — Gestionale per aziende di autotrasporto",
  description:
    "Gestisci mezzi e viaggi, importa rendiconti e consulta costi e ricavi con fonti e stime distinte. Prova gratuita di 21 giorni, senza carta.",
  applicationName: "Truck Radar",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://www.truck-radar.it"),
  other: {
    "page-type": "software",
    "site-kind": "software",
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Truck Radar",
    title: "Truck Radar — Flotta e viaggi, in un solo gestionale",
    description:
      "Gestisci mezzi e viaggi, importa rendiconti e consulta costi e ricavi con fonti e stime distinte.",
    images: [{ url: "/dashboard-preview.svg", width: 1200, height: 630, alt: "Anteprima del flusso Truck Radar: rendiconto, verifica dell’abbinamento e assegnazione del viaggio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Truck Radar — Flotta e viaggi, in un solo gestionale",
    description:
      "Gestisci mezzi e viaggi, importa rendiconti e consulta costi e ricavi con fonti e stime distinte.",
    images: ["/dashboard-preview.svg"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Truck Radar",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      data-type="software"
      data-radius="soft"
      data-buttons="solid"
      className={`${archivo.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
