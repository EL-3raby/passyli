"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Clock,
  ShieldCheck,
  ChevronLeft,
  Users,
  Calendar,
  Zap,
  Smartphone,
  Building2,
  MessageCircle,
  Wallet,
  Trophy,
  Ticket,
  Heart,
  ExternalLink,
  User,
  Phone,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import CourtsSection from "@/components/courts-section";
import HomeMatchmakingSection from "@/components/home/home-matchmaking-section";
import FavoriteVenueButton from "@/components/favorite-venue-button";
import { createClient } from "@/lib/supabase/client";
import { formatDateArabic, formatTimeArabic } from "@/lib/api/matchmaking";
import type { VenueWithCourts } from "@/lib/api/venues";
import type { SportType } from "@/lib/supabase/types";

interface NextBookingPreview {
  booking_reference: string;
  booking_date: string;
  start_time: string;
  status: string;
  cash_remaining: number;
  court?: {
    name?: string;
    sport?: "football" | "padel";
    venue?: {
      name?: string;
      district?: string;
      address?: string;
      phone?: string;
    };
  };
}

export default function HomeExperience() {
  const { user, profile, role, favoriteVenueIds, isLoading: authLoading } = useAuth();
  const [heroSportFilter, setHeroSportFilter] = useState<"all" | SportType>("all");
  const [loadedVenues, setLoadedVenues] = useState<VenueWithCourts[]>([]);
  const [nextBooking, setNextBooking] = useState<NextBookingPreview | null>(null);
  const [recentPastBooking, setRecentPastBooking] = useState<NextBookingPreview | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number>(0);

  const isSignedIn = !authLoading && Boolean(user);
  const canManageVenues =
    isSignedIn &&
    (role === "venue_owner" || role === "receptionist" || role === "super_admin");

  const loadUserHomeSnapshot = useCallback(async () => {
    if (!user) {
      setNextBooking(null);
      setRecentPastBooking(null);
      setConfirmedCount(0);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_player_bookings", {
      p_phone: profile?.phone || null,
      p_user_id: user.id,
    });

    if (error || !Array.isArray(data)) return;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const list = data as unknown as NextBookingPreview[];

    const confirmed = list.filter(
      (b) => b.status === "confirmed" || b.status === "completed"
    ).length;
    setConfirmedCount(confirmed);

    // Accurate Match Time Check: has this slot's time passed?
    const isUpcomingMatch = (b: NextBookingPreview) => {
      if (b.status === "cancelled" || b.status === "expired" || b.status === "completed") {
        return false;
      }
      if (b.booking_date > todayStr) return true;
      if (b.booking_date < todayStr) return false;

      // booking_date === todayStr: calculate match end time (slot start + 60 minutes)
      const cleanTime = b.start_time.replace(/[^0-9:]/g, "");
      let hours = 0;
      let minutes = 0;
      if (cleanTime.includes(":")) {
        const parts = cleanTime.split(":");
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
      }
      if (b.start_time.includes("م") && hours < 12) hours += 12;
      if (b.start_time.includes("ص") && hours === 12) hours = 0;

      const matchEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours + 1,
        minutes,
        0
      );
      return now < matchEnd;
    };

    const upcoming = list
      .filter(isUpcomingMatch)
      .sort((a, b) => {
        const dCmp = a.booking_date.localeCompare(b.booking_date);
        return dCmp !== 0 ? dCmp : a.start_time.localeCompare(b.start_time);
      });

    setNextBooking(upcoming[0] || null);

    // Most recent completed or past match (to show relevant action card instead of a stale upcoming match)
    const past = list
      .filter((b) => !isUpcomingMatch(b) && b.status !== "cancelled" && b.status !== "expired")
      .sort((a, b) => {
        const dCmp = b.booking_date.localeCompare(a.booking_date);
        return dCmp !== 0 ? dCmp : b.start_time.localeCompare(a.start_time);
      });

    setRecentPastBooking(past[0] || null);
  }, [user, profile?.phone]);

  useEffect(() => {
    if (isSignedIn) {
      loadUserHomeSnapshot();
    } else {
      setNextBooking(null);
      setRecentPastBooking(null);
      setConfirmedCount(0);
    }
  }, [isSignedIn, loadUserHomeSnapshot]);

  const handleHeroSportJump = (sport: "all" | SportType) => {
    setHeroSportFilter(sport);
    const el = document.getElementById("courts");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "كابتن";

  const favoriteVenues = loadedVenues.filter((v) =>
    favoriteVenueIds.includes(v.id)
  );

  return (
    <div className="flex flex-col w-full">
      {/* 1. Hero Section: Adapts cleanly between Logged-in Player Home & Guest Landing */}
      <section className="relative overflow-hidden min-h-[480px] lg:min-h-[540px] flex items-center bg-background">
        {/* Full-Bleed Panoramic Cover Image */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          <Image
            src="/images/hero-court.jpg"
            alt="ملاعب باصيلي المعتمدة في دمنهور"
            fill
            priority
            className="object-cover object-center lg:object-left"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#09090b]/85 to-[#09090b] md:to-[#09090b]/95" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/90 via-transparent to-[#09090b]" />
          <div className="absolute top-1/4 right-1/4 w-[450px] h-[300px] bg-emerald-500/10 blur-[140px] pointer-events-none" />

          {!isSignedIn && (
            <div className="absolute top-1/2 left-12 -translate-y-1/2 w-[380px] h-[380px] opacity-[0.06] pointer-events-none hidden lg:block">
              <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
                <path
                  d="M 10 40 L 14.5 8 L 28 8 C 36.5 8 40.5 12.5 39 21 C 37.5 29.5 31.5 32 23.5 32 L 17 32"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="26" cy="20" r="5" fill="#ffffff" />
              </svg>
            </div>
          )}
        </div>

        {/* Hero Content Layer */}
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 py-14 md:py-20">
          {isSignedIn ? (
            /* SIGNED-IN PERSONALIZED HOME HERO */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-[#141418]/85 px-4 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-md shadow-md w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                  <span>
                    {canManageVenues
                      ? "بوابة الشركاء والإدارة • باصيلي"
                      : `المركز المفضل: ${profile?.preferred_position || "أي مركز"}`}
                  </span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-normal leading-[1.45] sm:leading-[1.4]">
                  أهلاً كابتن {firstName}،
                  <span className="block mt-2 text-primary">
                    جاهز لماتشك الجاي؟
                  </span>
                </h1>

                <p className="text-zinc-300 text-sm sm:text-base max-w-xl leading-relaxed font-medium">
                  اختر ملعبك في دمنهور من المواعيد الحية أدناه، أو تابع تذاكرك وملاعبك المفضلة بضغطة زر.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleHeroSportJump("all")}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
                  >
                    <span>احجز ملعب الآن</span>
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHeroSportJump("padel")}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#242427]/90 backdrop-blur-md border border-white/[0.08] px-5 text-sm font-bold text-white hover:bg-[#2c2c30] active:scale-[0.98] transition-all"
                  >
                    ملاعب البادل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHeroSportJump("football")}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#242427]/90 backdrop-blur-md border border-white/[0.08] px-5 text-sm font-bold text-white hover:bg-[#2c2c30] active:scale-[0.98] transition-all"
                  >
                    كرة قدم خماسي
                  </button>
                  <Link
                    href="/matchmaking"
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-[#242427]/90 backdrop-blur-md border border-primary/40 px-5 text-sm font-bold text-primary hover:bg-[#2c2c30] active:scale-[0.98] transition-all"
                  >
                    <Users className="h-4 w-4" strokeWidth={1.5} />
                    <span>كمّل ماتشك</span>
                  </Link>
                </div>
              </div>

              {/* Right-Side Live Personal Card */}
              <div className="lg:col-span-5">
                {canManageVenues ? (
                  <div className="rounded-2xl bg-[#141418]/90 backdrop-blur-xl border border-emerald-500/30 p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        لوحة إدارة المنشأة
                      </span>
                      <Building2 className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-black text-white">
                        متابعة الحجوزات والإيصالات الحية
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        انتقل مباشرة إلى جدول المواعيد اليومي ومراجعة إيصالات التحويل وإدارة الكاش.
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="w-full min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <span>فتح لوحة إدارة الملاعب</span>
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                  </div>
                ) : nextBooking ? (
                  (() => {
                    const isToday =
                      nextBooking.booking_date ===
                      new Date().toISOString().split("T")[0];
                    const sportLabel =
                      nextBooking.court?.sport === "padel"
                        ? "بادل PAD"
                        : "خماسي 5V5";

                    return (
                      <div className="rounded-3xl bg-[#141418]/95 backdrop-blur-2xl border border-primary/30 p-5 sm:p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(16,185,129,0.14)] relative overflow-hidden transition-all">
                        {/* Top Ambient Glow Line */}
                        <div
                          className="absolute -top-12 -left-12 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none"
                          aria-hidden="true"
                        />

                        {/* Top Header Row: Sport Pill + Match Status + Ticket Reference */}
                        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                          <div className="flex items-center gap-2">
                            {isToday ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span>ماتش النهاردة!</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>ماتشك القادم</span>
                              </span>
                            )}

                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                              {sportLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                            <Ticket
                              className="h-3 w-3 text-primary shrink-0"
                              strokeWidth={1.5}
                            />
                            <span
                              className="font-mono text-xs font-bold text-zinc-300 tabular-nums"
                              dir="ltr"
                            >
                              {nextBooking.booking_reference}
                            </span>
                          </div>
                        </div>

                        {/* Venue Title & District Location */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-display text-lg sm:text-xl font-black text-white leading-tight">
                              {nextBooking.court?.venue?.name || "ملعب معتمد"}
                            </h2>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                              {nextBooking.court?.name || "ملعب رئيسي"}
                            </span>
                          </div>
                          {(nextBooking.court?.venue?.district ||
                            nextBooking.court?.venue?.address) && (
                            <p className="text-xs text-zinc-400 flex items-center gap-1.5 pt-0.5">
                              <MapPin
                                className="h-3.5 w-3.5 text-primary shrink-0"
                                strokeWidth={1.5}
                              />
                              <span className="truncate">
                                {nextBooking.court?.venue?.district || "دمنهور"}
                                {nextBooking.court?.venue?.address
                                  ? ` • ${nextBooking.court.venue.address}`
                                  : ""}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Date & Time Grid */}
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-primary shrink-0">
                              <Calendar className="h-4 w-4" strokeWidth={1.5} />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">
                                موعد الماتش
                              </span>
                              <span className="font-bold text-white tabular-nums">
                                {formatDateArabic(nextBooking.booking_date)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Clock className="h-4 w-4" strokeWidth={1.5} />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 block">
                                ساعة الصفر
                              </span>
                              <span className="font-black text-primary tabular-nums">
                                {formatTimeArabic(nextBooking.start_time)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Capsule */}
                        <div className="flex items-center justify-between rounded-xl bg-[#0e0e11] border border-white/[0.06] px-3.5 py-2.5 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">
                              حساب الماتش
                            </span>
                            <span className="font-bold text-zinc-300">
                              {nextBooking.cash_remaining === 0
                                ? "مدفوع بالكامل أونلاين"
                                : "متبقي كاش على الدكة"}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-zinc-500 block">
                              المتبقي للدكة
                            </span>
                            <span
                              className={`font-black tabular-nums text-sm ${
                                nextBooking.cash_remaining === 0
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {nextBooking.cash_remaining === 0
                                ? "0 ج.م (خالص)"
                                : `${nextBooking.cash_remaining} ج.م`}
                            </span>
                          </div>
                        </div>

                        {/* Actions Strip */}
                        <div className="flex items-center gap-2 pt-1">
                          <Link
                            href={`/ticket/${nextBooking.booking_reference}`}
                            className="flex-1 min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_2px_14px_rgba(16,185,129,0.28)]"
                          >
                            <Ticket className="h-4 w-4" strokeWidth={2} />
                            <span>فتح التذكرة وفاتورة الدخول</span>
                          </Link>

                          {nextBooking.court?.venue?.phone && (
                            <a
                              href={`tel:${nextBooking.court.venue.phone}`}
                              className="min-h-[46px] min-w-[46px] rounded-xl bg-white/[0.06] hover:bg-white/10 text-white flex items-center justify-center transition-all border border-white/[0.08]"
                              title="الاتصال بالملعب"
                              aria-label="الاتصال بالملعب"
                            >
                              <Phone className="h-4 w-4 text-primary" strokeWidth={1.5} />
                            </a>
                          )}

                          <Link
                            href="/my-bookings"
                            className="min-h-[46px] px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center transition-all border border-white/[0.08]"
                          >
                            كل تذاكري
                          </Link>
                        </div>
                      </div>
                    );
                  })()
                ) : recentPastBooking ? (
                  <div className="rounded-3xl bg-[#141418]/95 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all">
                    {/* Header: Ended Match Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-bold border border-white/10">
                          <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                          <span>انتهى الماتش السابق</span>
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                          {recentPastBooking.court?.sport === "padel" ? "بادل PAD" : "خماسي 5V5"}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-zinc-500 tabular-nums" dir="ltr">
                        {recentPastBooking.booking_reference}
                      </span>
                    </div>

                    {/* Venue & Time Summary */}
                    <div className="space-y-1">
                      <h3 className="font-display text-lg font-black text-white">
                        {recentPastBooking.court?.venue?.name || "ملعب باصيلي"} — {recentPastBooking.court?.name || "الملعب"}
                      </h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-2 pt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                        <span>{formatDateArabic(recentPastBooking.booking_date)}</span>
                        <span>•</span>
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                        <span className="font-bold text-zinc-300">{formatTimeArabic(recentPastBooking.start_time)}</span>
                      </p>
                    </div>

                    {/* Re-book / Next Match CTA */}
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-zinc-300 space-y-1">
                      <span className="font-bold text-white block">جاهز لماتشك الجاي يا كابتن؟</span>
                      <span className="text-[11px] text-zinc-400 block">
                        احجز نفس الملعب للأسبوع القادم، أو انضم لتقسيمات مفتوحة مع لاعيبة دمنهور.
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleHeroSportJump("all")}
                        className="flex-1 min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_2px_14px_rgba(16,185,129,0.28)]"
                      >
                        <RotateCcw className="h-4 w-4" strokeWidth={2} />
                        <span>احجز ماتش جديد الآن</span>
                      </button>

                      <Link
                        href="/my-bookings"
                        className="min-h-[46px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center transition-all border border-white/[0.08]"
                      >
                        سجل تذاكري
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#141418]/90 backdrop-blur-xl border border-white/10 p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300">
                        <Ticket className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        ملخص حسابك السريع
                      </span>
                      <Link
                        href="/profile"
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <User className="h-3 w-3" strokeWidth={1.5} />
                        ملفي
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href="/my-bookings"
                        className="rounded-xl bg-[#0e0e11] hover:bg-[#19191f] border border-white/[0.06] p-3.5 transition-colors"
                      >
                        <span className="text-[11px] text-zinc-400 block">
                          ماتشات مؤكدة
                        </span>
                        <span className="font-display text-xl font-black text-white tabular-nums mt-0.5 block">
                          {confirmedCount}
                        </span>
                      </Link>

                      <Link
                        href="/favorites"
                        className="rounded-xl bg-[#0e0e11] hover:bg-[#19191f] border border-white/[0.06] p-3.5 transition-colors"
                      >
                        <span className="text-[11px] text-zinc-400 block">
                          ملاعب مفضلة
                        </span>
                        <span className="font-display text-xl font-black text-rose-400 tabular-nums mt-0.5 block">
                          {favoriteVenueIds.length}
                        </span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/courts"
                        className="flex-1 min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>استعراض دليل الملاعب</span>
                        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                      <Link
                        href="/my-bookings"
                        className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center transition-all"
                      >
                        تذاكري
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* GUEST MARKETING LANDING HERO */
            <div className="max-w-2xl lg:max-w-3xl">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-[#141418]/85 px-4 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-md shadow-md mb-6 w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                <span>حجز ملاعب فوري ومضمون • دمنهور</span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-normal leading-[1.65] sm:leading-[1.6] lg:leading-[1.55] mb-6 drop-shadow-sm">
                احجز ملعبك في ثواني،
                <span className="block mt-3 sm:mt-4 text-primary">
                  وكمّل ماتشك <span className="text-white">على طول.</span>
                </span>
              </h1>

              <p className="text-zinc-300 text-sm sm:text-base max-w-xl leading-relaxed mb-8 drop-shadow-sm font-medium">
                احجز ملعبك المفضل في دمنهور بضغطة زر، واقفل ميعادك فوراً بدون مكالمات.
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleHeroSportJump("all")}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
                >
                  <span>تصفح كل الملاعب</span>
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => handleHeroSportJump("padel")}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#242427]/90 backdrop-blur-md border border-white/[0.08] px-5 text-sm font-bold text-white hover:bg-[#2c2c30] active:scale-[0.98] transition-all"
                >
                  ملاعب البادل
                </button>
                <button
                  type="button"
                  onClick={() => handleHeroSportJump("football")}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#242427]/90 backdrop-blur-md border border-white/[0.08] px-5 text-sm font-bold text-white hover:bg-[#2c2c30] active:scale-[0.98] transition-all"
                >
                  كرة قدم خماسي
                </button>
                <Link
                  href="/matchmaking"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full bg-[#242427]/90 backdrop-blur-md border border-primary/40 px-5 text-sm font-bold text-primary hover:bg-[#2c2c30] active:scale-[0.98] transition-all"
                >
                  <Users className="h-4 w-4" strokeWidth={1.5} />
                  <span>كمّل ماتشك</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Signed-in Quick Favorites Rail (if user saved favorites) */}
      {isSignedIn && favoriteVenues.length > 0 && (
        <section className="bg-[#141418] border-y border-white/[0.06] py-8">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-400 fill-rose-400" strokeWidth={1.5} />
                <h2 className="font-display text-base sm:text-lg font-black text-white">
                  ملاعبك المفضلة للحجز السريع
                </h2>
              </div>
              <Link
                href="/favorites"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {favoriteVenues.map((venue) => {
                const primaryCourt = venue.courts[0];
                return (
                  <div
                    key={venue.id}
                    className="w-72 shrink-0 rounded-2xl bg-[#1c1c20] border border-white/[0.08] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-sm font-black text-white">
                          {venue.name}
                        </h3>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
                          {venue.district}
                        </span>
                      </div>
                      <FavoriteVenueButton venueId={venue.id} />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <span className="text-xs font-black text-primary tabular-nums">
                        {primaryCourt?.price_evening || 200} ج.م / ساعة
                      </span>
                      <Link
                        href="/courts"
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-primary hover:bg-primary-hover text-black font-black text-[11px] px-3 transition-all"
                      >
                        <span>احجز</span>
                        <ChevronLeft className="h-3 w-3" strokeWidth={2.5} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 2. Platform Metrics & Trust Bar (Guests Only) */}
      {!isSignedIn && (
        <section className="bg-[#141418] py-10">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-right">
              <div className="flex flex-col gap-1 border-l border-border/30 last:border-l-0 pl-4">
                <span className="font-latin text-2xl sm:text-3xl font-black text-white tabular-nums">
                  +15
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  ملعب معتمد في دمنهور
                </span>
              </div>

              <div className="flex flex-col gap-1 border-l border-border/30 last:border-l-0 pl-4">
                <span className="font-latin text-2xl sm:text-3xl font-black text-primary tabular-nums">
                  100%
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  حجز موثق ومضمون بالثانية
                </span>
              </div>

              <div className="flex flex-col gap-1 border-l border-border/30 last:border-l-0 pl-4">
                <span className="font-latin text-2xl sm:text-3xl font-black text-white tabular-nums">
                  0%
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  تضارب أو حجز مزدوج للمواعيد
                </span>
              </div>

              <div className="flex flex-col gap-1 pl-4">
                <span className="font-latin text-2xl sm:text-3xl font-black text-primary tabular-nums">
                  فوري
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  تأكيد رقمي وتذكرة على الواتساب
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Featured Venues Section (Core Marketplace - Always Visible) */}
      <CourtsSection
        externalSport={heroSportFilter}
        onVenuesReady={setLoadedVenues}
      />

      {/* 4. Three Ways to Play (Guests Only) */}
      {!isSignedIn && (
        <section className="py-16 md:py-24 bg-[#141418]">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>طرق اللعب</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-[1.6] sm:leading-[1.55]">
                3 طرق تضمن لك ماتشك
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-2">
                العب بالطريقة اللي تريحك وبدون أي تعقيد.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex flex-col justify-between">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary mb-5">
                    <Calendar className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-bold text-white/50 block mb-1.5">
                    حجز المجموعات
                  </span>
                  <h3 className="font-display text-lg font-bold text-white mb-2">
                    احجز ملعب لفرقتك
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    اختر الساعة المناسبة، ادفع العربون، وميعادك اتقفل لفرقتك فوراً.
                  </p>
                </div>
                <Link
                  href="/courts"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2e2e33] hover:bg-primary hover:text-black px-4 text-xs font-bold text-white transition-all w-fit"
                >
                  <span>احجز ملعب الآن</span>
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              </div>

              <div className="p-6 rounded-[18px] border border-primary/30 bg-[#2d2d31] shadow-[0_4px_24px_rgba(16,185,129,0.08)] flex flex-col justify-between">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-[#35353a] flex items-center justify-center text-primary mb-5">
                    <Users className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-bold text-primary block mb-1.5">
                    بدون فرقة
                  </span>
                  <h3 className="font-display text-lg font-bold text-white mb-2">
                    كمّل ماتشك أو انزل تقسيمة
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    ناقصك لعيب أو عايز تلعب لوحدك؟ انشر تقسيمة وانزل ماتشك دلوقتي.
                  </p>
                </div>
                <Link
                  href="/matchmaking"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all w-fit"
                >
                  <span>استكشف التقسيمات</span>
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
                </Link>
              </div>

              <div className="p-6 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex flex-col justify-between">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary mb-5">
                    <Trophy className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-bold text-white/50 block mb-1.5">
                    تنافس وتحدي
                  </span>
                  <h3 className="font-display text-lg font-bold text-white mb-2">
                    بطولات ومنافسات رسمية
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    منافسات وجداول مباريات رسمية وجوائز لأبطال ملاعب دمنهور.
                  </p>
                </div>
                <span className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold text-muted-foreground w-fit">
                  <span>قريباً في الصيف القادم</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. How It Works (Guests Only) */}
      {!isSignedIn && (
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>خطوات الحجز</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-[1.6] sm:leading-[1.55]">
                احجز ماتشك في أقل من دقيقة
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-2">
                3 خطوات سريعة وماتشك في جيبك.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative flex flex-col gap-4 p-6 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all">
                <div className="flex items-center justify-between">
                  <span className="h-11 w-11 rounded-xl bg-[#2e2e33] flex items-center justify-center font-latin text-xl font-extrabold text-white tabular-nums">
                    01
                  </span>
                  <div className="h-11 w-11 rounded-xl bg-[#2e2e33] flex items-center justify-center text-primary">
                    <Calendar className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  اختر الملعب والميعاد
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  استعرض ملاعب دمنهور، قارن الأسعار، واختر ساعتك المفضلة.
                </p>
              </div>

              <div className="relative flex flex-col gap-4 p-6 rounded-[18px] border border-primary/30 bg-[#2d2d31] shadow-[0_4px_20px_rgba(16,185,129,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="h-11 w-11 rounded-xl bg-[#35353a] flex items-center justify-center font-latin text-xl font-extrabold text-primary tabular-nums">
                    02
                  </span>
                  <div className="h-11 w-11 rounded-xl bg-[#35353a] flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  تأكيد الحجز والدفع
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  حوّل العربون بسهولة عن طريق إنستاباي أو محفظتك لتأكيد الحجز فوراً.
                </p>
              </div>

              <div className="relative flex flex-col gap-4 p-6 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all">
                <div className="flex items-center justify-between">
                  <span className="h-11 w-11 rounded-xl bg-[#2e2e33] flex items-center justify-center font-latin text-xl font-extrabold text-white tabular-nums">
                    03
                  </span>
                  <div className="h-11 w-11 rounded-xl bg-[#2e2e33] flex items-center justify-center text-primary">
                    <Smartphone className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  تذكرتك على الواتساب
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  تصلك تذكرة رسمية ولوكيشن الملعب على الواتساب تشيرها مع فرقتك.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Live Open Matchmaking Feed (Always Visible, Real Supabase Data) */}
      <HomeMatchmakingSection />

      {/* 7. Venue Owners & Partners (Guests & Owners Only) */}
      {(!isSignedIn || canManageVenues) && (
        <section id="partner" className="relative overflow-hidden py-16 md:py-24 bg-background">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />

          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center text-center gap-8">
              <div className="flex flex-col items-center gap-4 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span>شراكة الملاعب</span>
                </div>

                <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.65] sm:leading-[1.6]">
                  عندك ملعب في دمنهور؟
                  <span className="block text-primary mt-3 sm:mt-4">
                    زوّد حجوزاتك واضمن عربونك.
                  </span>
                </h2>

                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl mt-1">
                  سجّل ملعبك مجاناً، واستقبل حجوزات مؤكدة بعربون فوري على إنستاباي أو محفظتك.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-right">
                <div className="p-6 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex flex-col gap-2.5">
                  <div className="h-12 w-12 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary mb-1">
                    <Wallet className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    عربون فوري
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    تحويل كاش أو إنستاباي لحسابك قبل بداية كل ماتش.
                  </p>
                </div>

                <div className="p-6 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex flex-col gap-2.5">
                  <div className="h-12 w-12 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary mb-1">
                    <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    بدون حجز مزدوج
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    الساعة بتتقفل آلياً بمجرد تأكيد الحجز ومستحيل ميعاد يتلغى.
                  </p>
                </div>

                <div className="p-6 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex flex-col gap-2.5">
                  <div className="h-12 w-12 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary mb-1">
                    <Zap className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    انضمام مجاني
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    بدون أي اشتراكات أو مصاريف تسجيل شهرية لملعبك.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <a
                  href="https://wa.me/201000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)]"
                >
                  <MessageCircle className="h-4 w-4 text-black" strokeWidth={2} />
                  <span>سجّل ملعبك عبر واتساب الشركاء</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 8. Why Passyli & 9. Mobile App Banner (Guests Only) */}
      {!isSignedIn && (
        <>
          <section className="py-16 md:py-24 bg-[#141418]">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md shadow-sm mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span>ليه باصيلي؟</span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-[1.6] sm:leading-[1.55]">
                  إيه اللي بيميزنا؟
                  <span className="block text-primary mt-3 sm:mt-4">
                    حجز ملاعب بدون وجع دماغ.
                  </span>
                </h3>

                <p className="text-muted-foreground text-xs sm:text-sm mt-2 leading-relaxed">
                  مفيش مكالمات ولا كشاكيل.. كل حاجة بتخلص من موبايلك في ثواني.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary shrink-0">
                    <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-white mb-1">
                      ماتشك مضمون بالثانية
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      الساعة بتتقفل باسمك فوراً ومستحيل ميعادك يتلغى أو يروح لغيرك.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary shrink-0">
                    <Clock className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-white mb-1">
                      تذكرتك على الواتساب
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      رسالة رسمية فيها كل تفاصيل الماتش واللوكيشن تشيرها مع فرقتك.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary shrink-0">
                    <Zap className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-white mb-1">
                      خفيفة وسريعة
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      تفتح في ثانية وتحجز ميعادك بدون أي استهلاك لباقة الموبايل.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-[18px] border border-white/[0.06] bg-[#242427] hover:bg-[#28282c] transition-all flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-[#2e2e33] flex items-center justify-center text-primary shrink-0">
                    <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-white mb-1">
                      فريق دعم في ضهرك
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      دعم مباشر بالواتساب والتليفون لمساعدتك خطوة بخطوة، بدون رد آلي.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-right">
                <div className="max-w-xl flex flex-col items-center lg:items-start gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md shadow-sm mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span>قريباً على الموبايل</span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-[1.65] sm:leading-[1.6]">
                    تطبيق باصيلي على موبايلك..
                    <span className="block text-primary mt-3 sm:mt-4">
                      حجزك أسرع وإشعاراتك حية.
                    </span>
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                    تابع حجوزاتك وماتشاتك واطلب لعيبة بلمسة واحدة من موبايلك.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-3.5 rounded-[18px] border border-white/[0.08] bg-[#242427] hover:bg-[#28282c] px-6 py-3.5 text-right transition-all">
                    <svg className="h-6 w-6 text-white fill-current shrink-0" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.74-11.64-14.1-6.19-9.77-10.9-20.91-14.15-33.43-3.24-12.51-4.87-24.13-4.87-34.86 0-15.01 3.86-27.42 11.58-37.22 7.72-9.8 17.37-14.86 28.94-15.18 4.79 0 10.15 1.25 16.08 3.75 5.93 2.5 9.77 3.86 11.52 4.08 2.06-.33 5.98-1.74 11.76-4.23 5.77-2.5 10.81-3.69 15.12-3.59 13.06.76 23.47 5.49 31.23 14.18-11.53 6.96-17.18 16.52-16.96 28.69.22 10.11 4.13 18.59 11.74 25.43 7.61 6.85 16.63 10.76 27.06 11.74-2.39 7.4-5.22 14.9-8.49 22.51zm-32.99-106.6c0-6.19 2.28-12.17 6.85-17.93 4.56-5.76 10.22-9.46 16.96-11.1 1.09 5.87.65 11.74-1.3 17.61-1.96 5.87-5.11 11.09-9.46 15.65-4.24 4.35-8.91 7.28-14.02 8.8-1.52-4.13-2.03-8.48-2.03-13.03z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground leading-tight">قريباً على</span>
                      <span className="font-latin text-sm font-bold text-white tracking-wide">App Store</span>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-3.5 rounded-[18px] border border-white/[0.08] bg-[#242427] hover:bg-[#28282c] px-6 py-3.5 text-right transition-all">
                    <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M3.609 1.814L13.793 12 3.61 22.186c-.309-.327-.492-.796-.492-1.346V3.16c0-.55.183-1.019.491-1.346z" fill="#00D2FF" />
                      <path d="M17.419 8.406L5.522 2.204 13.793 12l3.626-3.594z" fill="#FFD400" />
                      <path d="M3.61 22.186l13.809-7.947-3.626-3.594L3.61 22.186z" fill="#FF3333" />
                      <path d="M21.822 10.893l-4.403-2.487-3.626 3.594 3.626 3.594 4.403-2.487c1.196-.675 1.196-1.539 0-2.214z" fill="#00E676" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground leading-tight">قريباً على</span>
                      <span className="font-latin text-sm font-bold text-white tracking-wide">Google Play</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
