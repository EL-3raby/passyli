import type { Metadata, Viewport } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";
import SiteChrome from "@/components/layout/site-chrome";
import { AuthProvider } from "@/components/auth/auth-provider";
import AuthModal from "@/components/auth/auth-modal";

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-alexandria",
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://passyli.com"),
  title: {
    default: "باصيلي | Passyli — احجز ملعبك، كمّل ماتشك",
    template: "%s | باصيلي",
  },
  description: "المنصة الأولى لحجز ملاعب كرة القدم الخماسي وملاعب البادل في دمنهور والبحيرة.",
  applicationName: "باصيلي (Passyli)",
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/icon.svg",
    apple: "/brand/icon.svg",
  },
  openGraph: {
    title: "باصيلي | Passyli — احجز ملعبك، كمّل ماتشك",
    description: "المنصة الأولى لحجز ملاعب كرة القدم الخماسي وملاعب البادل في دمنهور والبحيرة.",
    url: "https://passyli.com",
    siteName: "باصيلي (Passyli)",
    locale: "ar_EG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body
        className={`${alexandria.variable} ${ibmPlexArabic.variable} ${inter.variable} font-sans bg-background text-foreground antialiased selection:bg-primary selection:text-black min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <SiteChrome footer={<Footer />}>{children}</SiteChrome>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
