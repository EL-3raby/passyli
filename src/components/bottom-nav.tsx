"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  Users,
  Ticket,
  Building2,
  Heart,
  User,
  LogIn,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  isActive: boolean;
  badgeCount?: number;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user, role, favoriteVenueIds, openAuthModal } = useAuth();

  const canManageVenues =
    Boolean(user) &&
    (role === "venue_owner" || role === "receptionist" || role === "super_admin");

  const navItems: NavItem[] = !user
    ? [
        {
          label: "الملاعب",
          href: "/courts",
          icon: MapPin,
          isActive: pathname?.startsWith("/courts") ?? false,
        },
        {
          label: "كمّل ماتشك",
          href: "/matchmaking",
          icon: Users,
          isActive: pathname?.startsWith("/matchmaking") ?? false,
        },
        {
          label: role === "super_admin" ? "المشرف" : "تذاكري",
          href: role === "super_admin" ? "/admin" : "/my-bookings",
          icon: role === "super_admin" ? ShieldCheck : Ticket,
          isActive:
            role === "super_admin"
              ? pathname?.startsWith("/admin") ?? false
              : pathname?.startsWith("/my-bookings") ?? false,
        },
        {
          label: "أضف ملعبك",
          href: "/#partner",
          icon: Building2,
          isActive: false,
        },
        {
          label: "دخول",
          onClick: () => openAuthModal("signin"),
          icon: LogIn,
          isActive: false,
        },
      ]
    : canManageVenues
    ? [
        {
          label: "الملاعب",
          href: "/courts",
          icon: MapPin,
          isActive: pathname?.startsWith("/courts") ?? false,
        },
        {
          label: "التقسيمات",
          href: "/matchmaking",
          icon: Users,
          isActive: pathname?.startsWith("/matchmaking") ?? false,
        },
        {
          label: "الإدارة",
          href: "/dashboard",
          icon: Building2,
          isActive: pathname?.startsWith("/dashboard") ?? false,
        },
        {
          label: role === "super_admin" ? "المشرف" : "تذاكري",
          href: role === "super_admin" ? "/admin" : "/my-bookings",
          icon: role === "super_admin" ? ShieldCheck : Ticket,
          isActive:
            role === "super_admin"
              ? pathname?.startsWith("/admin") ?? false
              : pathname?.startsWith("/my-bookings") ?? false,
        },
        {
          label: "ملفي",
          href: "/profile",
          icon: User,
          isActive: pathname?.startsWith("/profile") ?? false,
        },
      ]
    : [
        {
          label: "الملاعب",
          href: "/courts",
          icon: MapPin,
          isActive: pathname?.startsWith("/courts") ?? false,
        },
        {
          label: "كمّل ماتشك",
          href: "/matchmaking",
          icon: Users,
          isActive: pathname?.startsWith("/matchmaking") ?? false,
        },
        {
          label: role === "super_admin" ? "المشرف" : "تذاكري",
          href: role === "super_admin" ? "/admin" : "/my-bookings",
          icon: role === "super_admin" ? ShieldCheck : Ticket,
          isActive:
            role === "super_admin"
              ? pathname?.startsWith("/admin") ?? false
              : pathname?.startsWith("/my-bookings") ?? false,
        },
        {
          label: "المفضلة",
          href: "/favorites",
          icon: Heart,
          isActive: pathname?.startsWith("/favorites") ?? false,
          badgeCount: favoriteVenueIds.length,
        },
        {
          label: "ملفي",
          href: "/profile",
          icon: User,
          isActive: pathname?.startsWith("/profile") ?? false,
        },
      ];

  return (
    <aside
      aria-label="التنقل السفلي للموبايل"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-[#141418]/95 backdrop-blur-xl border-t border-white/[0.08] px-1.5 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center justify-between max-w-lg mx-auto gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <div
              className={`flex flex-col items-center justify-center min-h-[46px] w-full py-1 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 group ${
                item.isActive
                  ? "text-primary bg-primary/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 mb-0.5 transition-colors ${
                    item.isActive
                      ? "text-primary"
                      : "text-zinc-400 group-hover:text-primary"
                  }`}
                  strokeWidth={1.5}
                />
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="absolute -top-1 -left-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center tabular-nums leading-none">
                    {item.badgeCount}
                  </span>
                ) : null}
              </div>
              <span
                className={`tracking-tight truncate max-w-full transition-colors ${
                  item.isActive
                    ? "text-primary font-black"
                    : "group-hover:text-primary"
                }`}
              >
                {item.label}
              </span>
            </div>
          );

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex-1 flex items-center justify-center"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href || "/"}
              className="flex-1 flex items-center justify-center"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
