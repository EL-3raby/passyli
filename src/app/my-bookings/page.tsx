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
  Clock3,
  AlertCircle,
  RefreshCw,
  Search,
  User,
  ArrowRight,
  Users,
  Mail,
  Check,
  LogIn,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { updateUserProfile, isValidEgyptianPhone } from "@/lib/api/auth";
import { updateMatchmakingStatus, formatDateArabic, formatTimeArabic } from "@/lib/api/matchmaking";
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
  payment_type?: string;
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
    label: "قيد مراجعة التحويل",
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

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, openAuthModal, refreshProfile } = useAuth();

  const [bookings, setBookings] = useState<PlayerBooking[]>([]);
  const [matchPosts, setMatchPosts] = useState<PlayerMatchPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "matchmaking">("upcoming");

  // Guest reference quick lookup
  const [refInput, setRefInput] = useState("");
  const [refError, setRefError] = useState("");

  // Phone linking for Google OAuth players
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSavedMsg, setPhoneSavedMsg] = useState<string | null>(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.phone) {
      setPhoneInput(profile.phone);
    }
  }, [profile?.phone]);

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

  // Realtime sync on bookings and matchmaking_posts when logged in
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

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPhoneError(null);
    setPhoneSavedMsg(null);

    const clean = phoneInput.trim().replace(/\s+/g, "");
    if (!isValidEgyptianPhone(clean)) {
      setPhoneError("يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقم (مثل 010xxxxxxxx)");
      return;
    }

    setIsSavingPhone(true);
    const res = await updateUserProfile(user.id, { phone: clean });
    setIsSavingPhone(false);

    if (!res.success) {
      setPhoneError(res.error || "تعذر حفظ رقم الهاتف");
      return;
    }

    await refreshProfile();
    setIsEditingPhone(false);
    setPhoneSavedMsg("تم ربط رقم موبايلك بنجاح! أي حجز سابق بنفس الرقم سيظهر الآن.");
    setTimeout(() => setPhoneSavedMsg(null), 5000);
    loadPlayerData(true);
  };

  const handleQuickRefLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = refInput.trim().toUpperCase();
    if (cleaned.length < 6) {
      setRefError("أدخل كود التذكرة المرجعي بشكل صحيح (مثال: PAS-20261124-A1B2)");
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
  const upcomingBookings = bookings.filter(
    (b) => b.booking_date >= todayStr && b.status !== "cancelled" && b.status !== "expired"
  );
  const pastBookings = bookings.filter(
    (b) => b.booking_date < todayStr || b.status === "cancelled" || b.status === "expired"
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground pb-28" dir="rtl">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#141418] to-[#09090b] py-8 sm:py-12">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>محفظة التذاكر والحساب الشخصي</span>
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
        {/* Loading State (Auth or Initial Fetch) */}
        {(authLoading || isLoading) && (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-[#141418] border border-white/[0.06] animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-52 rounded-2xl bg-[#141418] border border-white/[0.06] animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {/* Unauthenticated State */}
        {!authLoading && !user && (
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
                  ادخل بنقرة واحدة بحساب Google (Gmail) أو البريد الإلكتروني لحفظ تذاكرك في مكان واحد، واستلام نسخة رسمية من كل فاتورة مباشرة على الـ Gmail.
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
            {/* Player Profile & Linked Phone Card */}
            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black text-lg overflow-hidden shrink-0">
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
                <div>
                  <h2 className="font-display text-base font-black text-white">
                    {profile?.full_name || "كابتن"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                    {user.email && (
                      <span className="inline-flex items-center gap-1.5" dir="ltr">
                        <Mail className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        {user.email}
                      </span>
                    )}
                    {profile?.phone && !isEditingPhone && (
                      <span className="inline-flex items-center gap-1.5 tabular-nums" dir="ltr">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                        {profile.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone linking / edit area */}
              <div className="w-full lg:w-auto">
                {!profile?.phone || isEditingPhone ? (
                  <form
                    onSubmit={handleSavePhone}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                  >
                    <input
                      type="tel"
                      dir="ltr"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="01012345678 (ربط رقم الواتساب)"
                      className="h-11 sm:w-56 rounded-xl bg-[#0e0e11] border border-primary/40 px-3 text-xs font-bold text-white text-left placeholder:text-zinc-500 focus:outline-none focus:border-primary tabular-nums"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSavingPhone}
                        className="min-h-[44px] px-4 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                      >
                        {isSavingPhone ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                        <span>حفظ الرقم</span>
                      </button>
                      {profile?.phone && (
                        <button
                          type="button"
                          onClick={() => setIsEditingPhone(false)}
                          className="min-h-[44px] px-3 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-bold hover:text-white"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="min-h-[44px] px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all"
                  >
                    تعديل رقم الموبايل المرتبط
                  </button>
                )}

                {phoneError && (
                  <p className="text-[11px] text-rose-400 font-bold mt-1.5">{phoneError}</p>
                )}
              </div>
            </div>

            {phoneSavedMsg && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{phoneSavedMsg}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "upcoming"
                    ? "bg-primary text-black font-black"
                    : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <span>الماتشات القادمة</span>
                <span className="px-2 py-0.5 rounded-full bg-black/20 text-[11px] tabular-nums">
                  {upcomingBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("past")}
                className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "past"
                    ? "bg-primary text-black font-black"
                    : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <span>السجل السابق والملغاة</span>
                <span className="px-2 py-0.5 rounded-full bg-black/20 text-[11px] tabular-nums">
                  {pastBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("matchmaking")}
                className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "matchmaking"
                    ? "bg-primary text-black font-black"
                    : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>تقسيماتي المفتوحة</span>
                <span className="px-2 py-0.5 rounded-full bg-black/20 text-[11px] tabular-nums">
                  {matchPosts.length}
                </span>
              </button>
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

            {/* Bookings Grid (Upcoming or Past) */}
            {!errorMsg && activeTab !== "matchmaking" && (
              <>
                {(activeTab === "upcoming" ? upcomingBookings : pastBookings).length === 0 ? (
                  <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto">
                      <Ticket className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        {activeTab === "upcoming"
                          ? "لا توجد ماتشات قادمة حالياً"
                          : "لا يوجد سجل حجوزات سابق"}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                        {!profile?.phone
                          ? "إذا حجزت سابقاً برقم موبايلك قبل تسجيل الدخول، أضف رقمك بالأعلى لربط تذاكرك تلقائياً، أو تصفح الملاعب الآن."
                          : "تصفح أقرب ملاعب الخماسي والبادل في دمنهور واحجز ساعتك القادمة في ثواني."}
                      </p>
                    </div>
                    <Link
                      href="/courts"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-6 transition-all"
                    >
                      <span>استعراض الملاعب المتاحة</span>
                      <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(activeTab === "upcoming" ? upcomingBookings : pastBookings).map(
                      (booking) => {
                        const statusInfo =
                          BOOKING_STATUS_CONFIG[booking.status] ||
                          BOOKING_STATUS_CONFIG.pending_payment;

                        return (
                          <div
                            key={booking.id}
                            className="rounded-2xl bg-[#141418] border border-white/[0.08] hover:border-white/15 p-5 flex flex-col justify-between gap-4 transition-all"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusInfo.badge}" >
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusInfo.badge}`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
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

                              <div>
                                <h3 className="font-display text-base font-black text-white">
                                  {booking.court?.venue?.name || "ملعب معتمد"} —{" "}
                                  {booking.court?.name}
                                </h3>
                                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                                  <span>
                                    {booking.court?.venue?.district} • {booking.court?.venue?.address}
                                  </span>
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                                <div className="flex items-center gap-1.5 text-zinc-300">
                                  <Calendar className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                                  <span className="tabular-nums">
                                    {formatDateArabic(booking.booking_date)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-zinc-300">
                                  <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
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
                                    {booking.deposit_paid || booking.deposit_required} ج.م
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

                            <div className="flex items-center gap-2 pt-1">
                              <Link
                                href={`/ticket/${booking.booking_reference}`}
                                className="flex-1 min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                              >
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                                <span>فتح التذكرة والفاتورة</span>
                              </Link>

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
                                <Share2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                              </a>
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
                                  post.status === "open" ? "bg-emerald-400" : "bg-zinc-400"
                                }`}
                              />
                              {post.status === "open" ? "مفتوحة للانضمام" : "اكتمل العدد"}
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
                                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
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
    </div>
  );
}
