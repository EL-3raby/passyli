import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import BottomNav from "@/components/bottom-nav";

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

export const metadata: Metadata = {
  title: "باصيلي | Passyli — احجز ملعبك، كمّل ماتشك",
  description: "المنصة الأولى لحجز ملاعب كرة القدم الخماسي وملاعب البادل في دمنهور والبحيرة.",
  icons: {
    icon: "/brand/icon.svg",
    apple: "/brand/icon.svg",
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
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
