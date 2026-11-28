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
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import NotificationsPopover, {
  type OperationalNotification,
} from "@/components/shared/notifications-popover";
import { createClient } from "@/lib/supabase/client";
import { playReceiptChime } from "@/lib/sound";

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
  const isAdminActive = pathname?.startsWith("/admin");

  const canManageVenues =
    Boolean(user) && (role === "venue_owner" || role === "super_admin");
  const isStaff = Boolean(user) && role === "receptionist";
  const isSuperAdmin = Boolean(user) && role === "super_admin";

  const showPartnerLink = !user || canManageVenues;

  const [playerNotifications, setPlayerNotifications] = useState<OperationalNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const clearedIdsRef = useRef<Set<string>>(new Set());
  clearedIdsRef.current = clearedIds;
  const readIdsRef = useRef<Set<string>>(new Set());
  readIdsRef.current = readIds;

  // Restore persisted read and cleared notification IDs from localStorage
  useEffect(() => {
    if (!user) {
      setReadIds(new Set());
      setClearedIds(new Set());
      return;
    }
    try {
      const storedRead = localStorage.getItem(`passyli_read_notifs_${user.id}`);
      if (storedRead) {
        setReadIds(new Set(JSON.parse(storedRead)));
      }
      const storedCleared = localStorage.getItem(`passyli_cleared_notifs_${user.id}`);
      if (storedCleared) {
        setClearedIds(new Set(JSON.parse(storedCleared)));
      }
    } catch {
      // LocalStorage access fallback
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPlayerNotifications([]);
      return;
    }

    const supabase = createClient();
    let isMounted = true;

    const fetchNotifications = async () => {
      const { data: bookingsData, error } = await supabase.rpc("get_player_bookings", {
        p_phone: profile?.phone || null,
        p_user_id: user.id,
      });

      if (error || !Array.isArray(bookingsData) || !isMounted) return;

      const notifs: OperationalNotification[] = [];
      const currentCleared = clearedIdsRef.current;
      const currentRead = readIdsRef.current;

      bookingsData.slice(0, 15).forEach((b: any) => {
        const venueName = b.court?.venue?.name || "الملعب";
        const courtName = b.court?.name || "";
        const ref = b.booking_reference;
        const bookingDate = b.booking_date;
        const time = b.start_time;

        if (b.status === "confirmed") {
          const id = `notif-confirmed-${ref}`;
          if (currentCleared.has(id)) return;
          notifs.push({
            id,
            type: "booking",
            title: `حجز مؤكد في ${venueName}`,
            description: `ميعادك: ${bookingDate} الساعة ${time} (${courtName}) • كود: ${ref}`,
            timestamp: b.created_at || new Date().toISOString(),
            isRead: currentRead.has(id),
            actionLabel: "عرض التذكرة",
            actionHref: `/ticket/${ref}`,
            priority: "success",
          });
        } else if (b.status === "pending_payment") {
          const id = `notif-pending-${ref}`;
          if (currentCleared.has(id)) return;
          notifs.push({
            id,
            type: "receipt",
            title: `إيصالك قيد المراجعة في ${venueName}`,
            description: `جاري مراجعة إيصال التحويل لميعاد ${bookingDate} الساعة ${time}`,
            timestamp: b.created_at || new Date().toISOString(),
            isRead: currentRead.has(id),
            actionLabel: "متابعة التذكرة",
            actionHref: `/ticket/${ref}`,
            priority: "normal",
          });
        } else if (b.status === "cancelled") {
          const id = `notif-cancelled-${ref}`;
          if (currentCleared.has(id)) return;
          notifs.push({
            id,
            type: "dispute",
            title: `تم إلغاء حجز في ${venueName}`,
            description: b.cancellation_reason || `تم إلغاء ميعاد ${bookingDate} الساعة ${time}`,
            timestamp: b.created_at || new Date().toISOString(),
            isRead: currentRead.has(id),
            actionLabel: "عرض التفاصيل",
            actionHref: `/ticket/${ref}`,
            priority: "urgent",
          });
        }
      });

      setPlayerNotifications(notifs);
    };

    fetchNotifications();

    const channel = supabase
      .channel(`player-navbar-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `booker_id=eq.${user.id}`,
        },
        (payload) => {
          fetchNotifications();
          const newBooking = payload.new as any;
          if (newBooking?.status === "confirmed") {
            playReceiptChime();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, profile?.phone, clearedIds]);

  const handleMarkAllAsRead = () => {
    if (!user) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      playerNotifications.forEach((n) => next.add(n.id));
      try {
        localStorage.setItem(`passyli_read_notifs_${user.id}`, JSON.stringify(Array.from(next)));
      } catch { }
      return next;
    });
    setPlayerNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkAsRead = (id: string) => {
    if (!user) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`passyli_read_notifs_${user.id}`, JSON.stringify(Array.from(next)));
      } catch { }
      return next;
    });
    setPlayerNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleClearAll = () => {
    if (!user) return;
    setClearedIds((prev) => {
      const next = new Set(prev);
      playerNotifications.forEach((n) => next.add(n.id));
      try {
        localStorage.setItem(`passyli_cleared_notifs_${user.id}`, JSON.stringify(Array.from(next)));
      } catch { }
      return next;
    });
    setPlayerNotifications([]);
  };

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
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border transition-colors">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-2">
        {/* Pure Arabic Brand Wordmark */}
        <Link href="/" className="flex items-center group py-1 shrink-0">
          <span className="font-display text-2xl sm:text-[26px] font-black tracking-normal text-foreground leading-none">
            باصي&zwj;<span className="text-primary">&zwj;لي</span>
          </span>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <Link
            href="/courts"
            className={`px-3.5 py-1.5 rounded-full transition-all ${isCourtsActive
              ? "text-foreground font-bold bg-muted"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            الملاعب
          </Link>
          <Link
            href="/matchmaking"
            className={`px-3.5 py-1.5 rounded-full transition-all ${isMatchmakingActive
              ? "text-foreground font-bold bg-muted"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            التقسيمات المفتوحة
          </Link>
          <Link
            href="/my-bookings"
            className={`px-3.5 py-1.5 rounded-full transition-all ${isBookingsActive
              ? "text-foreground font-bold bg-muted"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            تذاكري
          </Link>
          {user && (
            <Link
              href="/favorites"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${isFavoritesActive
                ? "text-foreground font-bold bg-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <span>المفضلة</span>
              {favoriteVenueIds.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 text-[10px] font-black tabular-nums leading-none">
                  {favoriteVenueIds.length}
                </span>
              )}
            </Link>
          )}
          {showPartnerLink && (
            <Link
              href="/partner"
              className="px-3.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              أضف ملعبك
            </Link>
          )}
          {canManageVenues && (
            <Link
              href="/dashboard"
              className={`px-3.5 py-1.5 rounded-full transition-all ${isDashboardActive
                ? "text-foreground font-bold bg-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              إدارة الملاعب
            </Link>
          )}
          {isStaff && (
            <Link
              href="/staff"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${pathname?.startsWith("/staff")
                ? "text-amber-500 dark:text-amber-300 font-bold bg-amber-500/15"
                : "text-amber-600 dark:text-amber-300 hover:bg-amber-500/10"
                }`}
            >
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>بوابة الموظف</span>
            </Link>
          )}
          {isSuperAdmin && (
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${isAdminActive
                ? "text-emerald-600 dark:text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30"
                : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>لوحة المشرف</span>
            </Link>
          )}
        </nav>

        {/* Auth & Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {user && (
            <NotificationsPopover
              notifications={playerNotifications}
              onMarkAllAsRead={handleMarkAllAsRead}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearAll}
              align="left"
              title="تنبيهاتك وماتشاتك"
              emptyMessage="لا توجد تنبيهات جديدة حالياً. كل تحديثات حجوزاتك وإيصالاتك هتظهر هنا أول بأول."
            />
          )}

          {isLoading ? (
            <div className="h-[44px] w-24 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-surface hover:bg-muted border border-border px-2.5 sm:px-3.5 text-xs font-bold text-foreground transition-all"
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
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-60 rounded-2xl bg-popover border border-border p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 text-popover-foreground"
                  dir="rtl"
                >
                  <div className="px-3 py-2.5 border-b border-border mb-1">
                    <span className="text-xs font-black text-foreground block truncate">
                      {profile?.full_name || "كابتن"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block truncate" dir="ltr">
                      {user.email || profile?.phone || "حساب موثق"}
                    </span>
                    <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {ROLE_LABELS[role] || "لاعب"}
                    </span>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${isProfileActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                  >
                    <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span>ملفي الشخصي</span>
                  </Link>

                  <Link
                    href="/my-bookings"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${isBookingsActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                  >
                    <Ticket className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span>تذاكري وماتشاتي</span>
                  </Link>

                  <Link
                    href="/favorites"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${isFavoritesActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Heart className="h-4 w-4 text-rose-500" strokeWidth={1.5} />
                      <span>ملاعبي المفضلة</span>
                    </span>
                    {favoriteVenueIds.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 text-[10px] font-black tabular-nums">
                        {favoriteVenueIds.length}
                      </span>
                    )}
                  </Link>

                  {canManageVenues && (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${isDashboardActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }`}
                    >
                      <Building2 className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
                      <span>إدارة الملاعب</span>
                    </Link>
                  )}

                  {isStaff && (
                    <Link
                      href="/staff"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold text-amber-500 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
                    >
                      <KeyRound className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                      <span>بوابة موظف الدكة</span>
                    </Link>
                  )}

                  {isSuperAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${isAdminActive
                        ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-300"
                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                    >
                      <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                      <span>لوحة المشرف العام</span>
                    </Link>
                  )}

                  <div className="border-t border-border my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
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
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-surface hover:bg-muted px-3.5 sm:px-4 text-xs font-bold text-foreground transition-all border border-border"
            >
              <LogIn className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              <span>دخول</span>
            </button>
          )}

          <Link
            href="/courts"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary px-4 sm:px-6 text-xs sm:text-sm font-black text-white dark:text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(16,185,129,0.3)]"
          >
            احجز الآن
          </Link>
        </div>
      </div>
    </header>
  );
}
