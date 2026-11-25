"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";
import BottomNav from "@/components/bottom-nav";

interface SiteChromeProps {
  children: React.ReactNode;
  footer: React.ReactNode;
}

export default function SiteChrome({ children, footer }: SiteChromeProps) {
  const pathname = usePathname();
  const isDashboardPortal = pathname?.startsWith("/dashboard") ?? false;

  if (isDashboardPortal) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {footer}
      <BottomNav />
    </>
  );
}
