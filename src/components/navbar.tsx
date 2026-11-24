"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Ticket,
  Building2,
  ChevronDown,
  LogIn,
  User,
  Heart,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "المشرف العام",
  venue_owner: "صاحب منشأة",
  receptionist: "موظف استقبال",
  player: "لاعب",
};

export default function Navbar() {
  const pathname = usePathname();
  const {
    user,
    profile,
    role,
    favoriteVenueIds,
    isLoading,
    openAuthModal,
    signOut,
  } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCourtsActive = pathname?.startsWith("/courts");
  const isDashboardActive = pathname?.startsWith("/dashboard");
  const isMatchmakingActive = pathname?.startsWith("/matchmaking");
  const isBookingsActive = pathname?.startsWith("/my-bookings");
  const isFavoritesActive = pathname?.startsWith("/favorites");
  const isProfileActive = pathname?.startsWith("/profile");

  const canManageVenues =
    Boolean(user) &&
    (role === "venue_owner" || role === "receptionist" || role === "super_admin");

  const showPartnerLink = !user || canManageVenues;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-white/[0.06] transition-all">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-2">
        {/* Pure Arabic Brand Wordmark */}
        <Link href="/" className="flex items-center group py-1 shrink-0">
          <span className="font-display text-2xl sm:text-[26px] font-black tracking-normal text-white leading-none">
            باصي&zwj;<span className="text-primary">&zwj;لي</span>
          </span>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <Link
            href="/courts"
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              isCourtsActive
                ? "text-white font-bold bg-white/[0.08]"
                : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            الملاعب
          </Link>
          <Link
            href="/matchmaking"
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              isMatchmakingActive
                ? "text-white font-bold bg-white/[0.08]"
                : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            التقسيمات المفتوحة
          </Link>
          <Link
            href="/my-bookings"
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              isBookingsActive
                ? "text-white font-bold bg-white/[0.08]"
                : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            تذاكري
          </Link>
          {user && (
            <Link
              href="/favorites"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                isFavoritesActive
                  ? "text-white font-bold bg-white/[0.08]"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span>المفضلة</span>
              {favoriteVenueIds.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-black tabular-nums leading-none">
                  {favoriteVenueIds.length}
                </span>
              )}
            </Link>
          )}
          {showPartnerLink && (
            <Link
              href="/#partner"
              className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              أضف ملعبك
            </Link>
          )}
          {canManageVenues && (
            <Link
              href="/dashboard"
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                isDashboardActive
                  ? "text-white font-bold bg-white/[0.08]"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              إدارة الملاعب
            </Link>
          )}
        </nav>

        {/* Auth & Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isLoading ? (
            <div className="h-[44px] w-24 rounded-full bg-white/[0.06] animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#18181c] hover:bg-[#222227] border border-white/10 px-2.5 sm:px-3.5 text-xs font-bold text-white transition-all"
              >
                <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{profile?.full_name?.slice(0, 1) || "ل"}</span>
                  )}
                </div>
                <span className="max-w-[90px] truncate hidden sm:inline-block">
                  {profile?.full_name || "حسابي"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-60 rounded-2xl bg-[#141418] border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  dir="rtl"
                >
                  <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                    <span className="text-xs font-black text-white block truncate">
                      {profile?.full_name || "كابتن"}
                    </span>
                    <span className="text-[11px] text-zinc-400 block truncate" dir="ltr">
                      {user.email || profile?.phone || "حساب موثق"}
                    </span>
                    <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {ROLE_LABELS[role] || "لاعب"}
                    </span>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
                      isProfileActive
                        ? "bg-white/[0.08] text-white"
                        : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span>ملفي الشخصي</span>
                  </Link>

                  <Link
                    href="/my-bookings"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
                      isBookingsActive
                        ? "bg-white/[0.08] text-white"
                        : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <Ticket className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span>تذاكري وماتشاتي</span>
                  </Link>

                  <Link
                    href="/favorites"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
                      isFavoritesActive
                        ? "bg-white/[0.08] text-white"
                        : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Heart className="h-4 w-4 text-rose-400" strokeWidth={1.5} />
                      <span>ملاعبي المفضلة</span>
                    </span>
                    {favoriteVenueIds.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-black tabular-nums">
                        {favoriteVenueIds.length}
                      </span>
                    )}
                  </Link>

                  {canManageVenues && (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
                        isDashboardActive
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
                      <span>إدارة الملاعب</span>
                    </Link>
                  )}

                  <div className="border-t border-white/[0.06] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("signin")}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/10 px-3.5 sm:px-4 text-xs font-bold text-zinc-200 hover:text-white transition-all border border-white/10"
            >
              <LogIn className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              <span>دخول</span>
            </button>
          )}

          <Link
            href="/courts"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary px-4 sm:px-6 text-xs sm:text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(16,185,129,0.3)]"
          >
            احجز الآن
          </Link>
        </div>
      </div>
    </header>
  );
}
