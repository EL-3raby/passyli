"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Check,
  LogIn,
  Loader2,
  Heart,
  Camera,
  ShieldCheck,
  Edit3,
  Unlock,
  Trophy,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  updateUserProfile,
  uploadPlayerAvatar,
  isValidEgyptianPhone,
  PLAYER_POSITIONS,
} from "@/lib/api/auth";
import { cancelBookingLock } from "@/lib/api/bookings";
import { getVenues, type VenueWithCourts } from "@/lib/api/venues";
import {
  updateMatchmakingStatus,
  formatDateArabic,
  formatTimeArabic,
} from "@/lib/api/matchmaking";
import { createClient } from "@/lib/supabase/client";
import FavoriteVenueButton from "@/components/favorite-venue-button";

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
  const {
    user,
    profile,
    favoriteVenueIds,
    isLoading: authLoading,
    openAuthModal,
    refreshProfile,
  } = useAuth();

  const [bookings, setBookings] = useState<PlayerBooking[]>([]);
  const [matchPosts, setMatchPosts] = useState<PlayerMatchPost[]>([]);
  const [allVenues, setAllVenues] = useState<VenueWithCourts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "past" | "matchmaking" | "favorites"
  >("upcoming");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Guest reference quick lookup
  const [refInput, setRefInput] = useState("");
  const [refError, setRefError] = useState("");

  // Profile editor state (name, phone, preferred_position, avatar)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [positionInput, setPositionInput] = useState<string>("أي مركز");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileToast, setProfileToast] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Per-card actions
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [releasingLockId, setReleasingLockId] = useState<string | null>(null);
  const [emailingRef, setEmailingRef] = useState<string | null>(null);

  // Live 1-second tick for active 8-minute hold countdowns
  useEffect(() => {
    const hasPendingLock = bookings.some(
      (b) => b.status === "pending_payment" && b.locked_until
    );
    if (!hasPendingLock) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [bookings]);

  useEffect(() => {
    if (profile) {
      setNameInput(profile.full_name || "");
      setPhoneInput(profile.phone || "");
      setPositionInput(profile.preferred_position || "أي مركز");
    }
  }, [profile]);

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
        const [bookingsRes, postsRes, venuesData] = await Promise.all([
          supabase.rpc("get_player_bookings", {
            p_phone: profile?.phone || null,
            p_user_id: user.id,
          }),
          supabase.rpc("get_player_matchmaking_posts"),
          getVenues(),
        ]);

        if (bookingsRes.error) {
          throw new Error(bookingsRes.error.message);
        }

        setBookings((bookingsRes.data as unknown as PlayerBooking[]) || []);
        if (!postsRes.error) {
          setMatchPosts((postsRes.data as unknown as PlayerMatchPost[]) || []);
        }
        setAllVenues(venuesData);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileError(null);
    setProfileToast(null);

    if (!nameInput.trim()) {
      setProfileError("يرجى إدخال الاسم بالكامل");
      return;
    }

    const cleanPhone = phoneInput.trim().replace(/\s+/g, "");
    if (cleanPhone && !isValidEgyptianPhone(cleanPhone)) {
      setProfileError(
        "يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقم (مثل 010xxxxxxxx)"
      );
      return;
    }

    setIsSavingProfile(true);
    const res = await updateUserProfile(user.id, {
      full_name: nameInput.trim(),
      phone: cleanPhone || null,
      preferred_position: positionInput,
    });
    setIsSavingProfile(false);

    if (!res.success) {
      setProfileError(res.error || "تعذر حفظ بيانات الحساب");
      return;
    }

    await refreshProfile();
    setIsEditingProfile(false);
    setProfileToast(
      cleanPhone
        ? "تم تحديث ملفك الشخصي وربط رقم الموبايل بنجاح!"
        : "تم تحديث بيانات ملفك الشخصي بنجاح!"
    );
    setTimeout(() => setProfileToast(null), 5000);
    loadPlayerData(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setProfileError(null);
    setProfileToast(null);
    setIsUploadingAvatar(true);

    const res = await uploadPlayerAvatar(user.id, file);
    setIsUploadingAvatar(false);

    if (!res.success) {
      setProfileError(res.error || "تعذر رفع الصورة الشخصية");
      return;
    }

    await refreshProfile();
    setProfileToast("تم تحديث صورتك الشخصية بنجاح!");
    setTimeout(() => setProfileToast(null), 4000);
  };

  const handleReleasePendingLock = async (bookingId: string) => {
    setReleasingLockId(bookingId);
    const res = await cancelBookingLock(bookingId);
    setReleasingLockId(null);

    if (res.success) {
      setProfileToast("تم إلغاء القفل المؤقت وإتاحة الميعاد للجميع.");
      setTimeout(() => setProfileToast(null), 4000);
      loadPlayerData(true);
    } else {
      setProfileError(res.error || "تعذر إلغاء القفل المؤقت");
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
        error?: string;
      };

      if (data.success && !data.skipped) {
        setProfileToast(`تم إرسال نسخة التذكرة إلى بريدك (${data.sentTo})`);
        setTimeout(() => setProfileToast(null), 5000);
      } else {
        setProfileError("تعذر إرسال البريد في الوقت الحالي.");
      }
    } catch {
      setProfileError("حدث خطأ أثناء الاتصال بخدمة البريد.");
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
  const upcomingBookings = bookings.filter(
    (b) =>
      b.booking_date >= todayStr &&
      b.status !== "cancelled" &&
      b.status !== "expired"
  );
  const pastBookings = bookings.filter(
    (b) =>
      b.booking_date < todayStr ||
      b.status === "cancelled" ||
      b.status === "expired"
  );
  const confirmedMatchesCount = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  ).length;
  const favoriteVenues = allVenues.filter((v) =>
    favoriteVenueIds.includes(v.id)
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
                <span>محفظة التذاكر والملف الرياضي</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
                تذاكري وماتشاتي
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                أدر ملفك الشخصي، تابع تذاكرك لحظياً، واحجز ملاعبك المفضلة بضغطة زر.
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
                <span>تحديث البيانات</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-6">
        {/* Loading State */}
        {(authLoading || isLoading) && (
          <div className="space-y-4">
            <div className="h-32 rounded-2xl bg-[#141418] border border-white/[0.06] animate-pulse" />
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
                  سجّل دخولك لمتابعة كل حجوزاتك وملاعبك المفضلة
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  ادخل بنقرة واحدة بحساب Google (Gmail) أو البريد الإلكتروني لحفظ تذاكرك، تعديل رقمك وصورتك، واستلام نسخة رسمية من كل فاتورة على بريدك.
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
            {/* Player Profile Card & Avatar Upload */}
            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar + Upload Trigger */}
                  <div className="relative group shrink-0">
                    <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black text-xl overflow-hidden">
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

                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => avatarFileInputRef.current?.click()}
                      title="تغيير الصورة الشخصية"
                      aria-label="تغيير الصورة الشخصية"
                      className="absolute -bottom-1.5 -left-1.5 h-8 w-8 rounded-xl bg-[#242427] hover:bg-primary hover:text-black border border-white/15 text-white flex items-center justify-center shadow-lg transition-all"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </button>

                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-black text-white">
                        {profile?.full_name || "كابتن"}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400">
                        <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                        <span>حساب موثق</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1.5">
                      {user.email && (
                        <span className="inline-flex items-center gap-1.5" dir="ltr">
                          <Mail className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                          {user.email}
                        </span>
                      )}
                      {profile?.phone ? (
                        <span className="inline-flex items-center gap-1.5 tabular-nums" dir="ltr">
                          <Phone className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                          {profile.phone}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
                          <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                          لم يتم ربط رقم الموبايل بعد
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile((prev) => !prev);
                    setProfileError(null);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 px-4 text-xs font-bold text-white transition-all self-start md:self-auto"
                >
                  {isEditingProfile ? (
                    <>
                      <X className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                      <span>إغلاق التعديل</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                      <span>تعديل الحساب والرقم والمركز</span>
                    </>
                  )}
                </button>
              </div>

              {/* Player Quick Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.06]">
                <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3">
                  <span className="text-[10px] text-zinc-500 block">ماتشات مؤكدة</span>
                  <span className="font-display text-lg font-black text-white tabular-nums mt-0.5 block">
                    {confirmedMatchesCount}
                  </span>
                </div>
                <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3">
                  <span className="text-[10px] text-zinc-500 block">تقسيمات منشورة</span>
                  <span className="font-display text-lg font-black text-primary tabular-nums mt-0.5 block">
                    {matchPosts.length}
                  </span>
                </div>
                <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3">
                  <span className="text-[10px] text-zinc-500 block">الملاعب المفضلة</span>
                  <span className="font-display text-lg font-black text-white tabular-nums mt-0.5 block">
                    {favoriteVenueIds.length}
                  </span>
                </div>
                <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3">
                  <span className="text-[10px] text-zinc-500 block">المركز المفضل</span>
                  <span className="font-display text-sm font-black text-emerald-400 truncate mt-1 flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    <span>{profile?.preferred_position || "أي مركز"}</span>
                  </span>
                </div>
              </div>

              {/* Prompt to link phone if missing */}
              {!profile?.phone && !isEditingProfile && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-amber-200">
                      أضف رقم موبايلك المصري لربط أي حجوزات سابقة وتسهيل الحجز القادم.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="min-h-[40px] px-4 rounded-xl bg-amber-400 text-black text-xs font-black shrink-0 hover:bg-amber-300 transition-colors"
                  >
                    إضافة رقم الموبايل
                  </button>
                </div>
              )}

              {/* Expandable Full Profile Editor */}
              {isEditingProfile && (
                <form
                  onSubmit={handleSaveProfile}
                  className="rounded-2xl bg-[#0e0e11] border border-primary/25 p-4 sm:p-5 space-y-4 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                        الاسم بالكامل *
                      </label>
                      <input
                        type="text"
                        required
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="أحمد محمد"
                        className="w-full h-11 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                        رقم الموبايل والواتساب (11 رقم)
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="01012345678"
                        className="w-full h-11 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white text-center placeholder:text-zinc-600 focus:outline-none focus:border-primary tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                        المركز المفضل في اللعب
                      </label>
                      <select
                        value={positionInput}
                        onChange={(e) => setPositionInput(e.target.value)}
                        className="w-full h-11 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                      >
                        {PLAYER_POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-2 transition-colors"
                    >
                      <Camera className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      <span>رفع أو تغيير الصورة الشخصية</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] text-zinc-300 text-xs font-bold hover:text-white"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="min-h-[44px] px-6 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-black flex items-center gap-1.5 transition-all"
                      >
                        {isSavingProfile ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                        <span>حفظ التغييرات</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {profileError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-bold text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{profileError}</span>
              </div>
            )}

            {profileToast && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{profileToast}</span>
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
                onClick={() => setActiveTab("favorites")}
                className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "favorites"
                    ? "bg-primary text-black font-black"
                    : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>الملاعب المفضلة</span>
                <span className="px-2 py-0.5 rounded-full bg-black/20 text-[11px] tabular-nums">
                  {favoriteVenues.length}
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
            {!errorMsg &&
              (activeTab === "upcoming" || activeTab === "past") && (
                <>
                  {(activeTab === "upcoming" ? upcomingBookings : pastBookings)
                    .length === 0 ? (
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
                      {(activeTab === "upcoming"
                        ? upcomingBookings
                        : pastBookings
                      ).map((booking) => {
                        const statusInfo =
                          BOOKING_STATUS_CONFIG[booking.status] ||
                          BOOKING_STATUS_CONFIG.pending_payment;
                        const countdown =
                          booking.status === "pending_payment"
                            ? formatCountdown(booking.locked_until, nowMs)
                            : null;

                        return (
                          <div
                            key={booking.id}
                            className="rounded-2xl bg-[#141418] border border-white/[0.08] hover:border-white/15 p-5 flex flex-col justify-between gap-4 transition-all"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusInfo.badge}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`}
                                  />
                                  {statusInfo.label}
                                </span>

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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

            {/* Favorites Tab */}
            {!errorMsg && activeTab === "favorites" && (
              <>
                {favoriteVenues.length === 0 ? (
                  <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-rose-400 mx-auto">
                      <Heart className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        قائمة ملاعبك المفضلة فارغة
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                        اضغط على أيقونة القلب بجانب أي ملعب بتحب تلعب فيه عشان يظهر هنا وتحجزه في ثانية.
                      </p>
                    </div>
                    <Link
                      href="/courts"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-6 transition-all"
                    >
                      <span>استكشف ملاعب دمنهور</span>
                      <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favoriteVenues.map((venue) => {
                      const primaryCourt = venue.courts[0];
                      return (
                        <div
                          key={venue.id}
                          className="rounded-2xl bg-[#141418] border border-white/[0.08] overflow-hidden flex flex-col justify-between"
                        >
                          <div className="relative h-36 bg-[#1c1c1f]">
                            <Image
                              src={venue.images[0] || "/images/hero-court.jpg"}
                              alt={venue.name}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-transparent to-transparent" />
                            <div className="absolute top-3 left-3 z-10">
                              <FavoriteVenueButton venueId={venue.id} />
                            </div>
                          </div>

                          <div className="p-5 space-y-3">
                            <div>
                              <h3 className="font-display text-base font-black text-white">
                                {venue.name}
                              </h3>
                              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                                <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                                <span>
                                  {venue.district} • {venue.address}
                                </span>
                              </p>
                            </div>

                            {primaryCourt && (
                              <div className="flex items-center justify-between text-xs bg-[#0e0e11] rounded-xl px-3 py-2.5 border border-white/[0.05]">
                                <span className="text-zinc-400">
                                  سعر الساعة المسائية
                                </span>
                                <span className="font-black text-primary tabular-nums">
                                  {primaryCourt.price_evening} ج.م
                                </span>
                              </div>
                            )}

                            <Link
                              href="/courts"
                              className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs flex items-center justify-center gap-2 transition-all"
                            >
                              <span>حجز موعد في هذا الملعب</span>
                              <ArrowRight className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
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
    </div>
  );
}
