"use client";

import { useState } from "react";
import { X, Banknote, User, Phone, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import type { DashboardCourt } from "@/lib/api/dashboard";
import { createWalkinBooking } from "@/lib/api/dashboard";

interface WalkinModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: DashboardCourt[];
  initialCourtId?: string;
  initialDate?: string;
  initialStartTime?: string;
  onBookingSuccess: () => void;
}

export default function WalkinModal({
  isOpen,
  onClose,
  courts,
  initialCourtId,
  initialDate,
  initialStartTime,
  onBookingSuccess,
}: WalkinModalProps) {
  const [selectedCourtId, setSelectedCourtId] = useState(initialCourtId || courts[0]?.id || "");
  const [bookingDate, setBookingDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState(initialStartTime || "18:00");
  const [bookerName, setBookerName] = useState("");
  const [bookerPhone, setBookerPhone] = useState("");
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCourt = courts.find((c) => c.id === selectedCourtId) || courts[0];
  const slotDuration = currentCourt?.slot_duration_minutes || 60;

  // Calculate default price based on morning / evening peak
  const calculatePrice = () => {
    if (!currentCourt) return 300;
    const hour = parseInt(startTime.split(":")[0], 10);
    const peakHour = parseInt(currentCourt.peak_hour_start.split(":")[0], 10);
    return hour >= peakHour ? currentCourt.price_evening : currentCourt.price_morning;
  };

  const totalPrice = calculatePrice();

  // Calculate End Time
  const calculateEndTime = () => {
    const [h, m] = startTime.split(":").map((v) => parseInt(v, 10));
    const totalMinutes = h * 60 + m + slotDuration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCourtId) {
      setErrorMsg("يرجى اختيار الملعب");
      return;
    }
    if (!bookerName.trim()) {
      setErrorMsg("يرجى إدخال اسم كابتن الفرقة أو العميل");
      return;
    }
    if (!bookerPhone.trim() || bookerPhone.length < 10) {
      setErrorMsg("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    try {
      setIsSubmitting(true);
      const endTime = calculateEndTime();
      const res = await createWalkinBooking({
        courtId: selectedCourtId,
        bookingDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        bookerName: bookerName.trim(),
        bookerPhone: bookerPhone.trim(),
        totalPrice,
        amountPaid: typeof amountPaid === "number" ? amountPaid : 0,
      });

      if (!res.success) {
        setErrorMsg(res.error || "تعذر قفل الحجز الكاش، تأكد من أن الميعاد غير محجوز");
        return;
      }

      onBookingSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء الحجز");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Banknote className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                حجز كاش سريع (Walk-in)
              </h3>
              <p className="text-xs text-zinc-400">
                قفل الموعد فورياً لموظف الاستقبال لمنع الحجز المزدوج
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Court Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              الملعب
            </label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all"
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name} ({court.sport === "football" ? "خماسي" : "بادل"} — {court.slot_duration_minutes} دقيقة)
                </option>
              ))}
            </select>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                تاريخ الماتش
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all tabular-nums"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                ساعة البداية
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all tabular-nums"
                required
              />
            </div>
          </div>

          {/* Booker Info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                اسم كابتن الفرقة / الحاجز
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: أحمد العربي"
                  value={bookerName}
                  onChange={(e) => setBookerName(e.target.value)}
                  className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all"
                  required
                />
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                رقم هاتف الكابتن
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="010XXXXXXXX"
                  value={bookerPhone}
                  onChange={(e) => setBookerPhone(e.target.value)}
                  className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                  dir="ltr"
                  required
                />
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className="p-3.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">إجمالي سعر الساعة:</span>
              <span className="font-bold text-white tabular-nums">{totalPrice} ج.م</span>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                المبلغ المدفوع كاش الآن (اختياري):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={totalPrice}
                  placeholder="0"
                  value={amountPaid}
                  onChange={(e) =>
                    setAmountPaid(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                  }
                  className="w-full rounded-xl bg-[#242427] border border-white/10 px-3.5 py-2 text-xs sm:text-sm font-bold text-primary focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                />
                <button
                  type="button"
                  onClick={() => setAmountPaid(totalPrice)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-[11px] font-bold text-zinc-200 transition-all"
                >
                  سداد كامل
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
              <span className="text-zinc-400">المتبقي كاش في الملعب:</span>
              <span className="font-bold text-amber-400 tabular-nums">
                {Math.max(0, totalPrice - (typeof amountPaid === "number" ? amountPaid : 0))} ج.م
              </span>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs sm:text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
              <span>{isSubmitting ? "جاري القفل والتأكيد..." : "تأكيد وقفل الحجز الكاش"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
