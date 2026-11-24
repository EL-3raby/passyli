"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  User,
  Phone,
  Mail,
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Trophy,
  Ticket,
  Heart,
  LogIn,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  updateUserProfile,
  uploadPlayerAvatar,
  isValidEgyptianPhone,
  sendPasswordResetEmail,
  PLAYER_POSITIONS,
} from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const {
    user,
    profile,
    role,
    favoriteVenueIds,
    isLoading: authLoading,
    openAuthModal,
    refreshProfile,
  } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredPosition, setPreferredPosition] = useState("أي مركز");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [stats, setStats] = useState({ bookingsCount: 0, postsCount: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setPreferredPosition(profile.preferred_position || "أي مركز");
    }
  }, [profile]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [bookingsRes, postsRes] = await Promise.all([
      supabase.rpc("get_player_bookings", {
        p_phone: profile?.phone || null,
        p_user_id: user.id,
      }),
      supabase.rpc("get_player_matchmaking_posts"),
    ]);

    const bList = Array.isArray(bookingsRes.data)
      ? (bookingsRes.data as Array<{ status?: string }>)
      : [];
    const pList = Array.isArray(postsRes.data) ? postsRes.data : [];

    const confirmed = bList.filter(
      (b) => b.status === "confirmed" || b.status === "completed"
    ).length;

    setStats({ bookingsCount: confirmed, postsCount: pList.length });
  }, [user, profile?.phone]);

  useEffect(() => {
    if (!authLoading && user) {
      loadStats();
    }
  }, [authLoading, user, loadStats]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("يرجى إدخال الاسم بالكامل");
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (cleanPhone && !isValidEgyptianPhone(cleanPhone)) {
      setErrorMsg(
        "يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقم (مثل 010xxxxxxxx)"
      );
      return;
    }

    setIsSaving(true);
    const res = await updateUserProfile(user.id, {
      full_name: fullName.trim(),
      phone: cleanPhone || null,
      preferred_position: preferredPosition,
    });
    setIsSaving(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر حفظ بيانات الملف الشخصي");
      return;
    }

    await refreshProfile();
    setSuccessMsg("تم حفظ بيانات ملفك الشخصي بنجاح!");
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploadingAvatar(true);
    const res = await uploadPlayerAvatar(user.id, file);
    setIsUploadingAvatar(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر رفع الصورة الشخصية");
      return;
    }

    await refreshProfile();
    setSuccessMsg("تم تحديث صورتك الشخصية بنجاح!");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSendingReset(true);
    const res = await sendPasswordResetEmail(user.email);
    setIsSendingReset(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر إرسال رابط تغيير كلمة المرور");
      return;
    }

    setSuccessMsg(`تم إرسال رابط تغيير كلمة المرور إلى بريدك (${user.email})`);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const roleLabel =
    role === "super_admin"
      ? "المشرف العام"
      : role === "venue_owner"
      ? "صاحب منشأة"
      : role === "receptionist"
      ? "موظف استقبال"
      : "لاعب";

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground pb-28" dir="rtl">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#141418] to-[#09090b] py-8 sm:py-12">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>إعدادات الحساب والبيانات الرياضية</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            ملفي الشخصي
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            تحكم في صورتك، اسمك، رقم الموبايل المرتبط بحجوزاتك، ومركزك المفضل في اللعب.
          </p>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 sm:px-6 pt-8 space-y-6">
        {authLoading && (
          <div className="space-y-4">
            <div className="h-36 rounded-2xl bg-[#141418] border border-white/[0.06] animate-pulse" />
            <div className="h-64 rounded-2xl bg-[#141418] border border-white/[0.06] animate-pulse" />
          </div>
        )}

        {!authLoading && !user && (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-8 text-center max-w-lg mx-auto space-y-5">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <User className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-white">
                سجّل دخولك للوصول إلى ملفك الشخصي
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                ادخل بحساب Google أو البريد الإلكتروني لتخصيص صورتك، ربط رقم هاتفك، ومتابعة إحصائيات لعبك.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal("signin", "/profile")}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm px-6 transition-all"
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              <span>تسجيل الدخول الآن</span>
            </button>
          </div>
        )}

        {!authLoading && user && (
          <>
            {/* Top Summary & Avatar Card */}
            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="h-20 w-20 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black text-2xl overflow-hidden">
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
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="تغيير الصورة الشخصية"
                      className="absolute -bottom-1.5 -left-1.5 h-9 w-9 rounded-xl bg-[#242427] hover:bg-primary hover:text-black border border-white/15 text-white flex items-center justify-center shadow-lg transition-all"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Camera className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-black text-white">
                        {profile?.full_name || "كابتن"}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-400">
                        <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                        <span>{roleLabel} موثق</span>
                      </span>
                    </div>

                    {user.email && (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 mt-1.5"
                        dir="ltr"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
                >
                  <Camera className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span>{isUploadingAvatar ? "جاري رفع الصورة..." : "تغيير الصورة"}</span>
                </button>
              </div>

              {/* Quick Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.06]">
                <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3">
                  <span className="text-[10px] text-zinc-500 block">ماتشات مؤكدة</span>
                  <span className="font-display text-lg font-black text-white tabular-nums mt-0.5 block">
                    {stats.bookingsCount}
                  </span>
                </div>
                <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3">
                  <span className="text-[10px] text-zinc-500 block">تقسيمات منشورة</span>
                  <span className="font-display text-lg font-black text-primary tabular-nums mt-0.5 block">
                    {stats.postsCount}
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
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-bold text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Edit Form */}
            <form
              onSubmit={handleSave}
              className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 sm:p-6 space-y-5"
            >
              <h3 className="font-display text-base font-black text-white border-b border-white/[0.06] pb-3">
                تعديل البيانات الأساسية
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    الاسم بالكامل *
                  </label>
                  <div className="relative">
                    <User
                      className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                      strokeWidth={1.5}
                    />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="أحمد محمد"
                      className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 pr-10 pl-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    رقم الموبايل والواتساب (11 رقم)
                  </label>
                  <div className="relative">
                    <Phone
                      className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                      strokeWidth={1.5}
                    />
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 pr-10 pl-3 text-xs font-bold text-white text-left placeholder:text-zinc-600 focus:outline-none focus:border-primary tabular-nums"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    يستخدم لربط حجوزاتك السابقة وإرسال تذاكرك على الواتساب.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    المركز المفضل في اللعب
                  </label>
                  <select
                    value={preferredPosition}
                    onChange={(e) => setPreferredPosition(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#0e0e11] border border-white/10 px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                  >
                    {PLAYER_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    البريد الإلكتروني (لإشعارات التذاكر)
                  </label>
                  <input
                    type="email"
                    disabled
                    dir="ltr"
                    value={user.email || ""}
                    className="w-full h-11 rounded-xl bg-[#0e0e11]/50 border border-white/[0.06] px-3 text-xs font-bold text-zinc-400 text-left cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                {user.email ? (
                  <button
                    type="button"
                    disabled={isSendingReset}
                    onClick={handlePasswordReset}
                    className="min-h-[44px] px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2 transition-all"
                  >
                    {isSendingReset ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                    )}
                    <span>إرسال رابط تعيين / تغيير كلمة المرور</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[46px] px-7 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-[0_2px_14px_rgba(16,185,129,0.28)]"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Check className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>

            {/* Quick Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/my-bookings"
                className="rounded-2xl bg-[#141418] hover:bg-[#1a1a20] border border-white/[0.08] p-5 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Ticket className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="font-display text-sm font-black text-white block">
                      تذاكري وماتشاتي
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      استعراض حجوزاتك وتقسيماتك
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 rotate-180" strokeWidth={1.5} />
              </Link>

              <Link
                href="/favorites"
                className="rounded-2xl bg-[#141418] hover:bg-[#1a1a20] border border-white/[0.08] p-5 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <Heart className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="font-display text-sm font-black text-white block">
                      ملاعبي المفضلة
                    </span>
                    <span className="text-[11px] text-zinc-400 block tabular-nums">
                      {favoriteVenueIds.length} ملاعب محفوظة
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
