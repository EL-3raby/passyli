"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Building2,
  Copy,
  Check,
} from "lucide-react";
import { getVenueWalletDetails, setVenueStaffPin } from "@/lib/api/dashboard";
import { useDashboard } from "@/components/dashboard/dashboard-provider";

export default function DashboardSettingsPage() {
  const {
    venues,
    selectedVenue,
    isLoadingVenues,
    isStaffMode,
    toggleStaffMode,
    soundEnabled,
    toggleSound,
  } = useDashboard();

  const [hasPin, setHasPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [loadingPin, setLoadingPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedStaffLink, setCopiedStaffLink] = useState(false);

  useEffect(() => {
    if (!selectedVenue?.id) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setPinInput("");
    setLoadingPin(true);
    getVenueWalletDetails(selectedVenue.id).then((res) => {
      if (res.success) {
        setHasPin(res.has_staff_pin);
      }
      setLoadingPin(false);
    });
  }, [selectedVenue?.id]);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = pinInput.trim();
    if (!/^[0-9]{4,6}$/.test(clean)) {
      setErrorMsg("يجب أن يتكون رمز الدخول من 4 إلى 6 أرقام إنجليزية فقط.");
      return;
    }

    setSavingPin(true);
    const res = await setVenueStaffPin(selectedVenue.id, clean);
    setSavingPin(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر حفظ رمز الموظف");
      return;
    }

    setHasPin(true);
    setPinInput("");
    setSuccessMsg(
      "تم حفظ رمز الدخول بنجاح وتجديد جلسات الأمان. يمكن لموظف الاستقبال الدخول الآن عبر بوابة /staff."
    );
  };

  const handleRevokePin = async () => {
    if (!selectedVenue) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingPin(true);
    const res = await setVenueStaffPin(selectedVenue.id, null);
    setSavingPin(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر تعطيل رمز الموظف");
      return;
    }

    setHasPin(false);
    setSuccessMsg("تم تعطيل رمز دخول الموظفين وإغلاق الجلسات النشطة.");
  };

  const handleCopyStaffUrl = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/staff`;
    void navigator.clipboard.writeText(url);
    setCopiedStaffLink(true);
    window.setTimeout(() => setCopiedStaffLink(false), 2000);
  };

  if (isLoadingVenues) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-2xl bg-[#141418]/70 animate-pulse border border-white/[0.06]" />
        <div className="h-72 rounded-2xl bg-[#141418]/70 animate-pulse border border-white/[0.06]" />
      </div>
    );
  }

  if (venues.length === 0 || !selectedVenue) {
    return (
      <div className="text-center py-16 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4">
        <Building2
          className="h-10 w-10 text-primary mx-auto"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-black text-white">
          لا توجد منشآت مربوطة بحسابك حالياً
        </h2>
        <Link
          href="/partner"
          className="inline-flex min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs items-center"
        >
          تقديم طلب شراكة
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Staff Portal PIN Workspace */}
      <section className="lg:col-span-7 rounded-2xl bg-[#141418] border border-white/[0.08] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                بوابة موظف الاستقبال (PIN) — {selectedVenue.name}
              </h2>
              <p className="text-xs text-zinc-400">
                يفتح الموظف جدول اليوم ويقفل الحجوزات كاش فقط دون رؤية الأرباح أو المحفظة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyStaffUrl}
              className="min-h-[40px] px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5"
            >
              {copiedStaffLink ? (
                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
              ) : (
                <Copy className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              )}
              <span>{copiedStaffLink ? "تم نسخ الرابط" : "نسخ رابط الموظف"}</span>
            </button>

            <Link
              href="/staff"
              target="_blank"
              className="min-h-[40px] px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <span>فتح /staff</span>
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <div className="rounded-xl bg-[#0e0e11] border border-white/[0.07] p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
            <span>حالة رمز الدخول السري للموظف:</span>
          </div>
          {loadingPin ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <span
              className={`px-2.5 py-0.5 rounded-full font-black text-[11px] border ${
                hasPin
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-zinc-500/10 text-zinc-400 border-white/10"
              }`}
            >
              {hasPin ? "مفعّل ويعمل" : "غير مضبوط"}
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSavePin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              {hasPin
                ? "تعيين رمز PIN جديد (4 إلى 6 أرقام)"
                : "أدخل رمز PIN للموظف (4 إلى 6 أرقام)"}
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              maxLength={6}
              required
              dir="ltr"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full min-h-[48px] rounded-xl bg-[#09090b] border border-white/[0.1] px-4 text-center text-lg font-black tracking-[0.4em] text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={savingPin}
              className="flex-1 min-h-[44px] px-5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
            >
              {savingPin ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <KeyRound className="h-4 w-4" strokeWidth={2} />
              )}
              <span>{hasPin ? "تحديث رمز الموظف" : "حفظ وتفعيل الرمز"}</span>
            </button>

            {hasPin && (
              <button
                type="button"
                disabled={savingPin}
                onClick={() => void handleRevokePin()}
                className="min-h-[44px] px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>تعطيل الرمز</span>
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Operational & Privacy Preferences */}
      <section className="lg:col-span-5 rounded-2xl bg-[#141418] border border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="border-b border-white/[0.06] pb-3.5">
          <h2 className="text-sm sm:text-base font-black text-white">
            تفضيلات التشغيل والخصوصية
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            إعدادات الجلسة الحالية على هذا الجهاز
          </p>
        </div>

        {/* Privacy Mode Card */}
        <div className="rounded-xl bg-[#0e0e11] border border-white/[0.07] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isStaffMode ? (
                  <EyeOff className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                ) : (
                  <Eye className="h-4 w-4 text-primary" strokeWidth={1.5} />
                )}
                <span className="text-xs font-black text-white">
                  وضع الخصوصية وإخفاء الأرباح
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                عند التفعيل، يتم إخفاء إجمالي الإيرادات ورصيد المحفظة وتعديل الأسعار عند ترك الجهاز مفتوحاً مع موظف الدكة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleStaffMode}
            className={`w-full min-h-[44px] rounded-xl text-xs font-black transition-all border ${
              isStaffMode
                ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                : "bg-white/[0.05] hover:bg-white/10 border-white/[0.08] text-white"
            }`}
          >
            {isStaffMode
              ? "وضع الخصوصية نشط (اضغط لإظهار الأرباح)"
              : "تفعيل وضع الخصوصية الآن"}
          </button>
        </div>

        {/* Sound Alert Card */}
        <div className="rounded-xl bg-[#0e0e11] border border-white/[0.07] p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              ) : (
                <VolumeX className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
              )}
              <span className="text-xs font-black text-white">
                تنبيه الصوت الفوري للإيصالات
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              يصدر تنبيهاً صوتياً لحظياً فور رفع أي لاعب لإيصال تحويل جديد دون الحاجة لتحديث الصفحة.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className={`w-full min-h-[44px] rounded-xl text-xs font-black transition-all border ${
              soundEnabled
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-white/[0.05] hover:bg-white/10 border-white/[0.08] text-zinc-300"
            }`}
          >
            {soundEnabled ? "الصوت مفعّل (اضغط للكتم)" : "تشغيل تنبيه الصوت"}
          </button>
        </div>
      </section>
    </div>
  );
}
