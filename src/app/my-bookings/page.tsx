"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Share2,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  User,
  ArrowRight,
  Users,
  Mail,
  LogIn,
  Loader2,
  Unlock,
  RotateCcw,
  Star,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { cancelBookingLock, submitVenueReview } from "@/lib/api/bookings";
import {
  updateMatchmakingStatus,
  formatDateArabic,
  formatTimeArabic,
} from "@/lib/api/matchmaking";
import { createClient } from "@/lib/supabase/client";

interface PlayerBooking {
  id: string;
  booking_reference: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  deposit_required: number;
  deposit_paid: number;
  cash_remaining: number;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "expired";
  locked_until: string | null;
  payment_type?: string;
  has_review?: boolean;
  booker_name: string;
  booker_phone: string;
  created_at: string;
  court: {
    id: string;
    name: string;
    sport: "football" | "padel";
    slot_duration_minutes: number;
    venue: {
      id: string;
      name: string;
      slug?: string;
      city: string;
      district: string;
      address: string;
      phone: string;
      whatsapp_number: string;
    };
  };
}

interface PlayerMatchPost {
  id: string;
  sport: "football" | "padel";
  match_date: string;
  start_time: string;
  players_needed: number;
  cost_per_player: number;
  required_position: string;
  skill_level: string;
  status: "open" | "filled" | "cancelled";
  court_name: string;
  venue_name: string;
  venue_district: string;
}

const BOOKING_STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  confirmed: {
    label: "مؤكد وجاهز للعب",
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  completed: {
    label: "ماتش مكتمل",
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  pending_payment: {
    label: "حجز معلق — في انتظار التحويل",
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  cancelled: {
    label: "ملغي",
    dot: "bg-rose-400",
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
  expired: {
    label: "انتهت مهلة القفل",
    dot: "bg-zinc-400",
    badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

function formatCountdown(lockedUntil: string | null, nowMs: number): string | null {
  if (!lockedUntil) return null;
  const diffSec = Math.floor((new Date(lockedUntil).getTime() - nowMs) / 1000);
  if (diffSec <= 0) return null;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, openAuthModal } = useAuth();

  const [bookings, setBookings] = useState<PlayerBooking[]>([]);
  const [matchPosts, setMatchPosts] = useState<PlayerMatchPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  type BookingTab = "upcoming" | "completed" | "cancelled" | "matchmaking";
  const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Guest reference quick lookup
  const [refInput, setRefInput] = useState("");
  const [refError, setRefError] = useState("");

  // Per-card actions
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [releasingLockId, setReleasingLockId] = useState<string | null>(null);
  const [emailingRef, setEmailingRef] = useState<string | null>(null);

  // Verified Review Modal state
  const [reviewBooking, setReviewBooking] = useState<PlayerBooking | null>(null);
  const [turfRating, setTurfRating] = useState(5);
  const [lightingRating, setLightingRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleOpenReview = (booking: PlayerBooking) => {
    setTurfRating(5);
    setLightingRating(5);
    setServiceRating(5);
    setReviewComment("");
    setReviewError(null);
    setReviewBooking(booking);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmittingReview(true);
    setReviewError(null);

    const res = await submitVenueReview({
      bookingId: reviewBooking.id,
      turfRating,
      lightingRating,
      serviceRating,
      comment: reviewComment,
    });

    setSubmittingReview(false);
    if (!res.success) {
      setReviewError(res.error || "تعذر إرسال التقييم");
      return;
    }

    setReviewBooking(null);
    setActionToast("شكراً لك! تم نشر تقييمك الموثق للملعب بنجاح.");
    setTimeout(() => setActionToast(null), 5000);
    void loadPlayerData(true);
  };

  // Live 1-second tick for active 8-minute hold countdowns
  useEffect(() => {
    const hasPendingLock = bookings.some(
      (b) => b.status === "pending_payment" && b.locked_until
    );
    if (!hasPendingLock) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [bookings]);

  const loadPlayerData = useCallback(
    async (showSpinner = false) => {
      if (!user) {
        setBookings([]);
        setMatchPosts([]);
        setIsLoading(false);
        return;
      }

      if (showSpinner) setIsRefreshing(true);
      setErrorMsg(null);
      const supabase = createClient();

      try {
        const [bookingsRes, postsRes] = await Promise.all([
          supabase.rpc("get_player_bookings", {
            p_phone: profile?.phone || null,
            p_user_id: user.id,
          }),
          supabase.rpc("get_player_matchmaking_posts"),
        ]);

        if (bookingsRes.error) {
          throw new Error(bookingsRes.error.message);
        }

        setBookings((bookingsRes.data as unknown as PlayerBooking[]) || []);
        if (!postsRes.error) {
          setMatchPosts((postsRes.data as unknown as PlayerMatchPost[]) || []);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "تعذر تحميل تذاكرك حالياً";
        setErrorMsg(msg);
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [user, profile?.phone]
  );

  useEffect(() => {
    if (!authLoading) {
      loadPlayerData();
    }
  }, [authLoading, loadPlayerData]);

  // Realtime sync on bookings and matchmaking_posts
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel("my_bookings_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadPlayerData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matchmaking_posts" },
        () => {
          loadPlayerData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadPlayerData]);

  const handleReleasePendingLock = async (bookingId: string) => {
    setReleasingLockId(bookingId);
    const res = await cancelBookingLock(bookingId);
    setReleasingLockId(null);

    if (res.success) {
      setActionToast("تم إلغاء القفل المؤقت وإتاحة الميعاد للجميع.");
      setTimeout(() => setActionToast(null), 4000);
      loadPlayerData(true);
    } else {
      setErrorMsg(res.error || "تعذر إلغاء القفل المؤقت");
    }
  };

  const handleResendEmail = async (bookingRef: string) => {
    setEmailingRef(bookingRef);
    try {
      const res = await fetch("/api/send-booking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference: bookingRef }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        skipped?: boolean;
        sentTo?: string;
      };

      if (data.success && !data.skipped) {
        setActionToast(`تم إرسال نسخة التذكرة إلى بريدك (${data.sentTo})`);
        setTimeout(() => setActionToast(null), 5000);
      } else {
        setErrorMsg("تعذر إرسال البريد في الوقت الحالي.");
      }
    } catch {
      setErrorMsg("حدث خطأ أثناء الاتصال بخدمة البريد.");
    } finally {
      setEmailingRef(null);
    }
  };

  const handleQuickRefLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = refInput.trim().toUpperCase();
    if (cleaned.length < 6) {
      setRefError(
        "أدخل كود التذكرة المرجعي بشكل صحيح (مثال: PAS-20261124-A1B2)"
      );
      return;
    }
    setRefError("");
    router.push(`/ticket/${encodeURIComponent(cleaned)}`);
  };

  const handleCloseMatchPost = async (postId: string) => {
    setUpdatingPostId(postId);
    const res = await updateMatchmakingStatus(postId, "filled");
    setUpdatingPostId(null);
    if (res.success) {
      loadPlayerData();
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Upcoming matches (future or today, not cancelled/expired/completed)
  const upcomingBookings = bookings.filter(
    (b) =>
      b.booking_date >= todayStr &&
      b.status !== "cancelled" &&
      b.status !== "expired" &&
      b.status !== "completed"
  );

  // 2. Completed matches (completed status, or past date and not cancelled/expired)
  const completedBookings = bookings.filter(
    (b) =>
      b.status === "completed" ||
      (b.booking_date < todayStr &&
        b.status !== "cancelled" &&
        b.status !== "expired")
  );

  // 3. Cancelled / Expired matches
  const cancelledBookings = bookings.filter(
    (b) => b.status === "cancelled" || b.status === "expired"
  );

  // Match happening today (if any)
  const todayMatch = upcomingBookings.find((b) => b.booking_date === todayStr);

  const currentList =
    activeTab === "upcoming"
      ? upcomingBookings
      : activeTab === "completed"
      ? completedBookings
      : cancelledBookings;

  const filteredList = currentList.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const ref = b.booking_reference.toLowerCase();
    const venue = (b.court?.venue?.name || "").toLowerCase();
    const court = (b.court?.name || "").toLowerCase();
    const district = (b.court?.venue?.district || "").toLowerCase();
    return (
      ref.includes(q) ||
      venue.includes(q) ||
      court.includes(q) ||
      district.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground pb-28" dir="rtl">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#141418] to-[#09090b] py-8 sm:py-12">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>محفظة التذاكر والمباريات</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
                تذاكري وماتشاتي
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                تابع حالة حجوزاتك لحظياً، افتح تذكرتك المعتمدة، وأدر تقسيماتك المفتوحة.
              </p>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => loadPlayerData(true)}
                disabled={isRefreshing}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 px-4 text-xs font-bold text-white transition-all"
              >
                <RefreshCw
                  className={`h-4 w-4 text-primary ${isRefreshing ? "animate-spin" : ""}`}
                  strokeWidth={1.5}
                />
                <span>تحديث التذاكر</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-6">
        {/* Loading State */}
        {(authLoading || isLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-52 rounded-2xl bg-[#141418] border border-white/[0.06] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Unauthenticated State */}
        {!authLoading && !isLoading && !user && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 rounded-2xl bg-[#141418] border border-white/[0.08] p-6 sm:p-8 space-y-5">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <User className="h-6 w-6" strokeWidth={1.5} />
              </div>

              <div>
                <h2 className="font-display text-xl sm:text-2xl font-black text-white">
                  سجّل دخولك لمتابعة كل حجوزاتك
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  ادخل بنقرة واحدة بحساب Google (Gmail) أو البريد الإلكتروني لحفظ تذاكرك في مكان واحد واستلام نسخة رسمية من كل فاتورة.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openAuthModal("signin", "/my-bookings")}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm px-6 transition-all shadow-[0_2px_14px_rgba(16,185,129,0.28)]"
                >
                  <LogIn className="h-4 w-4" strokeWidth={2} />
                  <span>تسجيل الدخول بـ Google أو الإيميل</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAuthModal("signup", "/my-bookings")}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white font-bold text-xs sm:text-sm px-5 transition-all"
                >
                  <span>إنشاء حساب جديد</span>
                </button>
              </div>
            </div>

            {/* Guest Ticket Code Lookup */}
            <div className="lg:col-span-5 rounded-2xl bg-[#141418] border border-white/[0.08] p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#242427] flex items-center justify-center text-primary">
                  <Search className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-black text-white">
                    فتح تذكرة بالكود المرجعي
                  </h3>
                  <span className="text-[11px] text-zinc-400 block">
                    حجزت كزائر؟ افتح تذكرتك مباشرة بالكود
                  </span>
                </div>
              </div>

              <form onSubmit={handleQuickRefLookup} className="space-y-3">
                <input
                  type="text"
                  dir="ltr"
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  placeholder="PAS-20261124-XXXX"
                  className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 px-4 text-xs font-mono font-bold text-white text-center placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
                {refError && (
                  <p className="text-[11px] text-rose-400 font-bold">{refError}</p>
                )}
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-[#242427] hover:bg-[#2e2e33] border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>عرض التذكرة الآن</span>
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Authenticated State */}
        {!authLoading && !isLoading && user && (
          <>
            {/* Helpful nudge if phone is not linked yet (links to /profile) */}
            {!profile?.phone && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />
                  <span className="text-xs font-bold text-amber-200">
                    حجزت سابقاً برقم موبايلك قبل تسجيل الدخول؟ أضف رقمك في ملفك الشخصي لتظهر كل تذاكرك تلقائياً.
                  </span>
                </div>
                <Link
                  href="/profile"
                  className="min-h-[40px] px-4 rounded-xl bg-amber-400 text-black text-xs font-black inline-flex items-center justify-center shrink-0 hover:bg-amber-300 transition-colors"
                >
                  إضافة الرقم من ملفي
                </Link>
              </div>
            )}

            {actionToast && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{actionToast}</span>
              </div>
            )}

            {/* Today's Match Hero Card (if player has a match today) */}
            {todayMatch && (
              <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#141418] to-[#141418] border border-primary/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                        <span>ماتش النهاردة!</span>
                      </span>
                      <span className="text-xs font-bold text-zinc-400 tabular-nums" dir="ltr">
                        {todayMatch.booking_reference}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-black text-white mt-1">
                      {todayMatch.court?.venue?.name} — {todayMatch.court?.name}
                    </h2>
                    <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-white font-bold tabular-nums">
                        <Clock className="h-3 w-3 text-primary" strokeWidth={1.5} />
                        {formatTimeArabic(todayMatch.start_time)}
                      </span>
                      <span>•</span>
                      <span>{todayMatch.court?.venue?.district}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href={`/ticket/${todayMatch.booking_reference}`}
                    className="flex-1 sm:flex-initial inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs transition-all shadow-[0_2px_12px_rgba(16,185,129,0.25)]"
                  >
                    <Ticket className="h-4 w-4" strokeWidth={2} />
                    <span>تذكرة الدخول للدكة</span>
                  </Link>
                  {todayMatch.court?.venue?.phone && (
                    <a
                      href={`tel:${todayMatch.court.venue.phone}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white transition-all"
                      title="الاتصال بالملعب"
                      aria-label="الاتصال بالملعب"
                    >
                      <Phone className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Refined Tabs + Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("upcoming")}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === "upcoming"
                      ? "bg-primary text-black font-black shadow-sm"
                      : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>الماتشات القادمة</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                      activeTab === "upcoming"
                        ? "bg-black/20 text-black"
                        : "bg-white/[0.08] text-zinc-300"
                    }`}
                  >
                    {upcomingBookings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("completed")}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === "completed"
                      ? "bg-primary text-black font-black shadow-sm"
                      : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>الماتشات اللي انتهت</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                      activeTab === "completed"
                        ? "bg-black/20 text-black"
                        : "bg-white/[0.08] text-zinc-300"
                    }`}
                  >
                    {completedBookings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cancelled")}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === "cancelled"
                      ? "bg-primary text-black font-black shadow-sm"
                      : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>الماتشات الملغاة</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                      activeTab === "cancelled"
                        ? "bg-black/20 text-black"
                        : "bg-white/[0.08] text-zinc-300"
                    }`}
                  >
                    {cancelledBookings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("matchmaking")}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === "matchmaking"
                      ? "bg-primary text-black font-black shadow-sm"
                      : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>تقسيماتي المفتوحة</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                      activeTab === "matchmaking"
                        ? "bg-black/20 text-black"
                        : "bg-white/[0.08] text-zinc-300"
                    }`}
                  >
                    {matchPosts.length}
                  </span>
                </button>
              </div>

              {/* Quick Search */}
              {bookings.length > 0 && activeTab !== "matchmaking" && (
                <div className="relative min-w-[200px] sm:w-64">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400">
                    <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث برقم التذكرة أو الملعب..."
                    className="w-full min-h-[40px] rounded-xl bg-white/[0.04] border border-white/[0.08] pr-9 pl-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 left-2.5 flex items-center text-zinc-400 hover:text-white"
                      aria-label="مسح البحث"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error State */}
            {errorMsg && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-6 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" strokeWidth={1.5} />
                <p className="text-sm font-bold text-rose-300">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => loadPlayerData(true)}
                  className="min-h-[44px] px-5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-all"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Bookings Grid */}
            {!errorMsg && activeTab !== "matchmaking" && (
              <>
                {filteredList.length === 0 ? (
                  <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto">
                      <Ticket className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        {searchQuery.trim()
                          ? `لا توجد نتائج تطابق بحثك («${searchQuery}»)`
                          : activeTab === "upcoming"
                          ? "مفيش ماتشات قادمة محجوزة حالياً"
                          : activeTab === "completed"
                          ? "لسه مفيش ماتشات مكتملة في سجلك"
                          : "سجلك نظيف! مفيش أي ماتشات ملغاة"}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                        {searchQuery.trim()
                          ? "تأكد من كود التذكرة أو اسم الملعب، أو امسح كلمة البحث لعرض كل التذاكر."
                          : activeTab === "upcoming"
                          ? "تصفح أقرب ملاعب الخماسي والبادل في دمنهور واحجز ساعتك القادمة في ثواني."
                          : activeTab === "completed"
                          ? "بعد ما تحضر ماتشك وتلعب، هيظهر هنا وتقدر تقيّم الملعب وتحجز نفس الساعة بضغطة واحدة."
                          : "كل حجوزاتك مؤكدة أو مكتملة بنجاح، لا توجد أي حجوزات ملغاة أو منتهية."}
                      </p>
                    </div>
                    {searchQuery.trim() ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold text-xs px-6 transition-all"
                      >
                        <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                        <span>مسح كلمة البحث</span>
                      </button>
                    ) : (
                      activeTab !== "cancelled" && (
                        <Link
                          href="/courts"
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-6 transition-all"
                        >
                          <span>استعراض الملاعب المتاحة</span>
                          <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
                        </Link>
                      )
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredList.map((booking) => {
                      const statusInfo =
                        BOOKING_STATUS_CONFIG[booking.status] ||
                        BOOKING_STATUS_CONFIG.pending_payment;
                      const countdown =
                        booking.status === "pending_payment"
                          ? formatCountdown(booking.locked_until, nowMs)
                          : null;
                      const isToday =
                        booking.booking_date === todayStr &&
                        booking.status !== "cancelled" &&
                        booking.status !== "expired";

                        return (
                          <div
                            key={booking.id}
                            className="rounded-2xl bg-[#141418] border border-white/[0.08] hover:border-white/15 p-5 flex flex-col justify-between gap-4 transition-all"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isToday && (
                                    <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                      <span>النهاردة!</span>
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusInfo.badge}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`}
                                    />
                                    {statusInfo.label}
                                  </span>
                                </div>

                                <span
                                  className="font-mono text-xs font-bold text-primary tabular-nums"
                                  dir="ltr"
                                >
                                  {booking.booking_reference}
                                </span>
                              </div>

                              {countdown && (
                                <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 flex items-center justify-between text-xs">
                                  <span className="text-amber-300 font-bold">
                                    متبقي من مهلة القفل:
                                  </span>
                                  <span className="font-mono font-black text-amber-400 tabular-nums">
                                    {countdown}
                                  </span>
                                </div>
                              )}

                              <div>
                                <h3 className="font-display text-base font-black text-white">
                                  {booking.court?.venue?.name || "ملعب معتمد"} —{" "}
                                  {booking.court?.name}
                                </h3>
                                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                                  <MapPin
                                    className="h-3.5 w-3.5 text-primary shrink-0"
                                    strokeWidth={1.5}
                                  />
                                  <span>
                                    {booking.court?.venue?.district} •{" "}
                                    {booking.court?.venue?.address}
                                  </span>
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                                <div className="flex items-center gap-1.5 text-zinc-300">
                                  <Calendar
                                    className="h-3.5 w-3.5 text-primary"
                                    strokeWidth={1.5}
                                  />
                                  <span className="tabular-nums">
                                    {formatDateArabic(booking.booking_date)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-zinc-300">
                                  <Clock
                                    className="h-3.5 w-3.5 text-primary"
                                    strokeWidth={1.5}
                                  />
                                  <span className="font-bold text-white tabular-nums">
                                    {formatTimeArabic(booking.start_time)}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-zinc-500 block">
                                    المدفوع إلكترونياً
                                  </span>
                                  <span className="font-bold text-emerald-400 tabular-nums">
                                    {booking.deposit_paid ||
                                      booking.deposit_required}{" "}
                                    ج.م
                                  </span>
                                </div>
                                <div className="text-left">
                                  <span className="text-[10px] text-zinc-500 block">
                                    المتبقي كاش بالملعب
                                  </span>
                                  <span className="font-black text-white tabular-nums">
                                    {booking.cash_remaining} ج.م
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 pt-1">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/ticket/${booking.booking_reference}`}
                                  className="flex-1 min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                                  <span>فتح التذكرة والفاتورة</span>
                                </Link>

                                {user.email && booking.status === "confirmed" && (
                                  <button
                                    type="button"
                                    disabled={emailingRef === booking.booking_reference}
                                    onClick={() =>
                                      handleResendEmail(booking.booking_reference)
                                    }
                                    title="إرسال نسخة لبريدي Gmail"
                                    aria-label="إرسال نسخة لبريدي Gmail"
                                    className="min-h-[44px] min-w-[44px] rounded-xl bg-[#242427] hover:bg-[#2c2c30] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
                                  >
                                    {emailingRef === booking.booking_reference ? (
                                      <Loader2
                                        className="h-4 w-4 animate-spin text-primary"
                                        strokeWidth={1.5}
                                      />
                                    ) : (
                                      <Mail
                                        className="h-4 w-4 text-primary"
                                        strokeWidth={1.5}
                                      />
                                    )}
                                  </button>
                                )}

                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(
                                    typeof window !== "undefined"
                                      ? `${window.location.origin}/ticket/${booking.booking_reference}`
                                      : `/ticket/${booking.booking_reference}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="مشاركة التذكرة على واتساب"
                                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[#242427] hover:bg-[#2c2c30] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
                                >
                                  <Share2
                                    className="h-4 w-4 text-primary"
                                    strokeWidth={1.5}
                                  />
                                </a>
                              </div>

                              {booking.status === "pending_payment" && (
                                <button
                                  type="button"
                                  disabled={releasingLockId === booking.id}
                                  onClick={() => handleReleasePendingLock(booking.id)}
                                  className="w-full min-h-[42px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                >
                                  {releasingLockId === booking.id ? (
                                    <Loader2
                                      className="h-3.5 w-3.5 animate-spin"
                                      strokeWidth={1.5}
                                    />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  )}
                                  <span>إلغاء القفل وإتاحة الميعاد فوراً</span>
                                </button>
                              )}

                              {(booking.status === "confirmed" || booking.status === "completed") && (
                                <div className="flex flex-wrap items-center gap-2">
                                  {booking.court?.venue?.slug && (
                                    <Link
                                      href={`/courts#book?venue=${encodeURIComponent(
                                        booking.court.venue.slug
                                      )}&slot=${encodeURIComponent(
                                        formatTimeArabic(booking.start_time)
                                      )}`}
                                      className="flex-1 min-h-[42px] rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                                      <span>احجز نفس الملعب تاني</span>
                                    </Link>
                                  )}

                                  {booking.status === "completed" && !booking.has_review && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReview(booking)}
                                      className="flex-1 min-h-[42px] rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                                      <span>قيّم تجربتك بالملعب</span>
                                    </button>
                                  )}

                                  {booking.status === "completed" && booking.has_review && (
                                    <span className="min-h-[42px] px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                      <span>تم تقييم الماتش</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {(booking.status === "cancelled" || booking.status === "expired") && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={
                                      booking.court?.venue?.slug
                                        ? `/courts#book?venue=${encodeURIComponent(
                                            booking.court.venue.slug
                                          )}`
                                        : "/courts"
                                    }
                                    className="flex-1 min-h-[42px] rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                                    <span>احجز ميعاد بديل في الملعب</span>
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </>
            )}

            {/* Matchmaking Posts Tab */}
            {!errorMsg && activeTab === "matchmaking" && (
              <>
                {matchPosts.length === 0 ? (
                  <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto">
                      <Users className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        لم تنشر أي تقسيمة مفتوحة بعد
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                        لو فرقتك ناقصة لعيبة أو حارس مرمى، تقدر تنشر إعلانك في التقسيمات المفتوحة.
                      </p>
                    </div>
                    <Link
                      href="/matchmaking"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-6 transition-all"
                    >
                      <span>استكشف التقسيمات المفتوحة</span>
                      <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matchPosts.map((post) => (
                      <div
                        key={post.id}
                        className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                                post.status === "open"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  post.status === "open"
                                    ? "bg-emerald-400"
                                    : "bg-zinc-400"
                                }`}
                              />
                              {post.status === "open"
                                ? "مفتوحة للانضمام"
                                : "اكتمل العدد"}
                            </span>

                            <span className="text-xs font-bold text-primary tabular-nums">
                              مطلوب {post.players_needed} لاعب
                            </span>
                          </div>

                          <h3 className="font-display text-base font-black text-white">
                            {post.venue_name} — {post.court_name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                            <span className="tabular-nums">
                              {formatDateArabic(post.match_date)} •{" "}
                              {formatTimeArabic(post.start_time)}
                            </span>
                            <span className="tabular-nums font-bold text-white">
                              {post.cost_per_player} ج.م / فرد
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                          <Link
                            href="/matchmaking"
                            className="flex-1 min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span>عرض في التقسيمات</span>
                          </Link>

                          {post.status === "open" && (
                            <button
                              type="button"
                              disabled={updatingPostId === post.id}
                              onClick={() => handleCloseMatchPost(post.id)}
                              className="min-h-[44px] px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            >
                              {updatingPostId === post.id ? (
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin"
                                  strokeWidth={1.5}
                                />
                              ) : (
                                <CheckCircle2
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                              )}
                              <span>اكتمل العدد</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Verified Post-Match Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <h3 className="font-display text-base font-black text-white">
                  تقييم تجربتك الموثقة
                </h3>
                <p className="text-xs text-zinc-400">
                  {reviewBooking.court?.venue?.name} — {reviewBooking.court?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                aria-label="إغلاق"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] text-zinc-400 flex items-center justify-center"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {[
                { label: "جودة الأرضية / النجيل", value: turfRating, setter: setTurfRating },
                { label: "كفاءة الإضاءة والكشافات", value: lightingRating, setter: setLightingRating },
                { label: "الالتزام بالمواعيد والتعامل", value: serviceRating, setter: setServiceRating },
              ].map((criterion) => (
                <div
                  key={criterion.label}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#0e0e11] border border-white/[0.06] px-3.5 py-2.5"
                >
                  <span className="text-xs font-bold text-zinc-200">
                    {criterion.label}
                  </span>
                  <div className="flex items-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => criterion.setter(score)}
                        aria-label={`${criterion.label}: ${score}`}
                        className="min-h-[36px] min-w-[32px] flex items-center justify-center"
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            score <= criterion.value
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-600"
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  ملاحظة أو رأي مختصر (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="شارك اللاعبين رأيك في الملعب..."
                  className="w-full rounded-xl bg-[#09090b] border border-white/10 p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
              >
                {submittingReview ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                )}
                <span>{submittingReview ? "جاري النشر..." : "نشر التقييم الموثق"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
