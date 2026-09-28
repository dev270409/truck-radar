import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ThemeProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Truck Radar â€” Transport Operating System",
  description:
    "Gestione flotta, autisti, viaggi e Network per aziende di trasporto. Analytics, DDT digitale e Smart Return in un unico sistema.",
  applicationName: "Truck Radar",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://www.truck-radar.it"),
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Truck Radar",
    title: "Truck Radar â€” Il sistema operativo della tua flotta",
    description:
      "Mezzi, autisti, viaggi, DDT e margini in un unico posto. Meno km a vuoto, meno scadenze dimenticate. Prova gratis 21 giorni.",
    images: [{ url: "/dashboard-preview.svg", width: 720, height: 440, alt: "Dashboard Truck Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Truck Radar â€” Il sistema operativo della tua flotta",
    description:
      "Mezzi, autisti, viaggi, DDT e margini in un unico posto. Meno km a vuoto, meno scadenze dimenticate.",
    images: ["/dashboard-preview.svg"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
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
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: applica il tema salvato prima del primo paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tr-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
