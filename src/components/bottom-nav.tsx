"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Users, Building2, MessageCircle } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "الملاعب",
      href: "/courts",
      icon: MapPin,
      isActive: pathname === "/courts",
    },
    {
      label: "كمّل ماتشك",
      href: "/matchmaking",
      icon: Users,
      isActive: pathname?.startsWith("/matchmaking") ?? false,
    },
    {
      label: "سجّل ملعبك",
      href: "/#partner",
      icon: Building2,
      isActive: false,
    },
    {
      label: "الدعم",
      href: "https://wa.me/201000000000",
      icon: MessageCircle,
      isExternal: true,
      isActive: false,
    },
  ];

  return (
    <aside
      aria-label="التنقل السفلي للموبايل"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-[#141418]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 py-1 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 px-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 group ${
              item.isActive ? "text-primary" : "text-zinc-400 hover:text-white"
            }`}>
              <div className="relative">
                <Icon
                  className={`h-5 w-5 mb-0.5 transition-colors ${
                    item.isActive ? "text-primary" : "text-zinc-400 group-hover:text-primary"
                  }`}
                  strokeWidth={1.5}
                />
              </div>
              <span className={`tracking-tight transition-colors ${
                item.isActive ? "text-primary font-black" : "group-hover:text-primary"
              }`}>
                {item.label}
              </span>
            </div>
          );

          if (item.isExternal) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center"
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-center"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
