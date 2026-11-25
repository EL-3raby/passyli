"use client";

import { useEffect, useState } from "react";
import {
  X,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  createRecurringWalkin,
  type DashboardCourt,
  type RecurringBookingResult,
} from "@/lib/api/dashboard";

interface RecurringBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: DashboardCourt[];
  initialDate: string;
  onSuccess: () => void;
}

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const h = (9 + i) % 24;
  return `${String(h).padStart(2, "0")}:00`;
});

export default function RecurringBookingModal({
  isOpen,
  onClose,
  courts,
  initialDate,
  onSuccess,
}: RecurringBookingModalProps) {
  const [courtId, setCourtId] = useState("");
  const [startDate, setStartDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("20:00");
  const [weeksCount, setWeeksCount] = useState(4);
  const [bookerName, setBookerName] = useState("");
  const [bookerPhone, setBookerPhone] = useState("");
  const [totalPrice, setTotalPrice] = useState(260);
  const [amountPaidPerSlot, setAmountPaidPerSlot] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<RecurringBookingResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(initialDate);
      setErrorMsg(null);
      setResult(null);
      if (courts.length > 0 && !courtId) {
        setCourtId(courts[0].id);
      }
    }
  }, [isOpen, initialDate, courts, courtId]);

  useEffect(() => {
    const selectedCourt = courts.find((c) => c.id === courtId);
    if (!selectedCourt) return;
    const hourNum = parseInt(startTime.split(":")[0] || "18", 10);
    const peakHour = parseInt(
      (selectedCourt.peak_hour_start || "17:00").split(":")[0] || "17",
      10
    );
    const isEvening = hourNum >= peakHour || hourNum < 5;
    setTotalPrice(
      isEvening ? selectedCourt.price_evening : selectedCourt.price_morning
    );
  }, [courtId, startTime, courts]);

  if (!isOpen) return null;

  const computeEndTime = (start: string, durationMinutes: number) => {
    const [hStr, mStr] = start.split(":");
    const startMins =
      parseInt(hStr || "0", 10) * 60 + parseInt(mStr || "0", 10);
    const endMins = startMins + durationMinutes;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    if (!courtId) {
      setErrorMsg("اختر الملعب الفرعي أولاً.");
      return;
    }
    if (!bookerName.trim()) {
      setErrorMsg("أدخل اسم الأكاديمية أو الكابتن.");
      return;
    }
    if (!/^01[0125][0-9]{8}$/.test(bookerPhone.trim())) {
      setErrorMsg("يرجى إدخال رقم موبايل مصري صحيح (11 رقماً).");
      return;
    }

    const court = courts.find((c) => c.id === courtId);
    const endTime = computeEndTime(
      startTime,
      court?.slot_duration_minutes || 60
    );

    setSubmitting(true);
    const res = await createRecurringWalkin({
      courtId,
      startDate,
      weeksCount,
      startTime,
      endTime,
      bookerName,
      bookerPhone,
      totalPrice,
      amountPaidPerSlot,
    });
    setSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر إنشاء الحجز المتكرر");
      return;
    }

    setResult(res);
    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
              <Repeat className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-black text-white">
                حجز أسبوعي متكرر (ساعات ثابتة)
              </h3>
              <p className="text-xs text-zinc-400">
                قفل نفس الساعة أسبوعياً لأكاديمية أو مجموعة منتظمة بضغطة واحدة (بدون عمولة)
              </p>
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

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {result && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-black text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>
                تم تأكيد {result.created_count ?? 0} أسبوع بنجاح!
              </span>
            </div>
            {result.skipped_dates && result.skipped_dates.length > 0 && (
              <p className="text-amber-300 font-bold">
                مواعيد تم تخطيها لأنها محجوزة مسبقاً:{" "}
                <span dir="ltr" className="tabular-nums">
                  {result.skipped_dates.join(" , ")}
                </span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                الملعب الفرعي
              </label>
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white"
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                تاريخ البداية (أول أسبوع)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                الساعة الثابتة
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                عدد الأسابيع المتتالية
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[2, 4, 6, 8].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeeksCount(w)}
                    className={`min-h-[44px] rounded-xl border text-xs font-black tabular-nums transition-all ${
                      weeksCount === w
                        ? "bg-primary text-black border-primary"
                        : "bg-[#09090b] text-zinc-300 border-white/[0.1]"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                اسم الأكاديمية / الكابتن
              </label>
              <input
                type="text"
                required
                value={bookerName}
                onChange={(e) => setBookerName(e.target.value)}
                placeholder="مثال: أكاديمية دمنهور"
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                رقم الموبايل
              </label>
              <input
                type="tel"
                required
                dir="ltr"
                value={bookerPhone}
                onChange={(e) => setBookerPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white text-right tabular-nums focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                سعر الساعة الواحدة (ج.م)
              </label>
              <input
                type="number"
                min={50}
                value={totalPrice}
                onChange={(e) => setTotalPrice(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                المدفوع مقدماً لكل أسبوع (ج.م)
              </label>
              <input
                type="number"
                min={0}
                value={amountPaidPerSlot}
                onChange={(e) => setAmountPaidPerSlot(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[46px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <Calendar className="h-4 w-4" strokeWidth={2} />
            )}
            <span>
              {submitting
                ? "جاري تسجيل الحجوزات..."
                : `تثبيت الميعاد لـ ${weeksCount} أسابيع`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
