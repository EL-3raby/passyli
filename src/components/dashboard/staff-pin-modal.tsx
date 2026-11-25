"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  KeyRound,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  getVenueWalletDetails,
  setVenueStaffPin,
  type DashboardVenue,
} from "@/lib/api/dashboard";

interface StaffPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: DashboardVenue | null;
}

export default function StaffPinModal({
  isOpen,
  onClose,
  venue,
}: StaffPinModalProps) {
  const [hasPin, setHasPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !venue?.id) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setPinInput("");
    setLoading(true);
    getVenueWalletDetails(venue.id).then((res) => {
      if (res.success) {
        setHasPin(res.has_staff_pin);
      }
      setLoading(false);
    });
  }, [isOpen, venue?.id]);

  if (!isOpen || !venue) return null;

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = pinInput.trim();
    if (!/^[0-9]{4,6}$/.test(clean)) {
      setErrorMsg("يجب أن يتكون رمز الدخول من 4 إلى 6 أرقام إنجليزية فقط.");
      return;
    }

    setSaving(true);
    const res = await setVenueStaffPin(venue.id, clean);
    setSaving(false);

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
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    const res = await setVenueStaffPin(venue.id, null);
    setSaving(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر تعطيل رمز الموظف");
      return;
    }

    setHasPin(false);
    setSuccessMsg("تم إيقاف دخول موظفي الاستقبال لهذا الملعب وإنهاء الجلسات النشطة.");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display text-base font-black text-white">
                رمز دخول موظف الدكة (PIN)
              </h3>
              <p className="text-xs text-zinc-400">{venue.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 flex items-center justify-center"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="rounded-xl bg-[#0e0e11] border border-white/[0.06] p-3.5 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck
            className="h-4 w-4 text-primary shrink-0 mt-0.5"
            strokeWidth={1.5}
          />
          <span>
            بوابة الموظف <strong>(/staff)</strong> معزولة تماماً: تعرض للموظف جدول الساعات، اسم اللاعب، والمبلغ المتبقي تحصيله كاش فقط دون أي أرباح أو عمولات.
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#09090b] border border-white/[0.08] px-3.5 py-2.5 text-xs">
          <span className="text-zinc-400 font-bold">الحالة الحالية:</span>
          {loading ? (
            <span className="text-zinc-500">جاري الفحص...</span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 font-black ${
                hasPin ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  hasPin ? "bg-emerald-400" : "bg-zinc-500"
                }`}
              />
              {hasPin ? "رمز PIN مفعّل" : "غير مفعّل بعد"}
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSavePin} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              {hasPin ? "تعيين رمز PIN جديد (4 إلى 6 أرقام)" : "إنشاء رمز PIN للموظف (4 إلى 6 أرقام)"}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              dir="ltr"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="مثال: 4829"
              className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.12] px-4 text-center text-lg font-black tracking-[0.35em] text-white placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-xs tabular-nums focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <KeyRound className="h-4 w-4" strokeWidth={2} />
            )}
            <span>{hasPin ? "تحديث الرمز وإنهاء الجلسات القديمة" : "تفعيل رمز الموظف"}</span>
          </button>
        </form>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
          <Link
            href="/staff"
            target="_blank"
            className="min-h-[44px] px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
            <span>فتح بوابة الموظف</span>
          </Link>

          {hasPin && (
            <button
              type="button"
              disabled={saving}
              onClick={handleRevokePin}
              className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>إيقاف الدخول</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
