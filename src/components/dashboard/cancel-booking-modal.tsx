"use client";

import { useState } from "react";
import { X, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DashboardBooking } from "@/lib/api/dashboard";
import { cancelVenueBooking } from "@/lib/api/dashboard";

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: DashboardBooking | null;
  onCancelSuccess: () => void;
}

export default function CancelBookingModal({
  isOpen,
  onClose,
  booking,
  onCancelSuccess,
}: CancelBookingModalProps) {
  const [reason, setReason] = useState("اعتذار من كابتن الفرقة هاتفياً");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalReason = reason === "أخرى" ? customReason.trim() : reason;
    if (!finalReason) {
      setErrorMsg("يرجى تحديد أو كتابة سبب الإلغاء");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await cancelVenueBooking(booking.id, finalReason);
      if (!res.success) {
        setErrorMsg(res.error || "تعذر إلغاء الحجز، يرجى المحاولة مرة أخرى");
        return;
      }

      onCancelSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                إلغاء الحجز وتحرير الميعاد
              </h3>
              <p className="text-xs text-zinc-400">
                سيتم إتاحة الساعة فورياً لفرق أخرى على المنصة
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
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Booking Details Pill */}
        <div className="p-3 rounded-xl bg-[#1c1c1f] border border-white/[0.06] text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-zinc-400">كابتن الفرقة:</span>
            <span className="font-bold text-white">{booking.booker_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">رقم الهاتف:</span>
            <span className="font-mono text-zinc-300" dir="ltr">{booking.booker_phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">الميعاد:</span>
            <span className="font-bold text-primary tabular-nums">
              {booking.booking_date} • {booking.start_time.substring(0, 5)}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-1">
            <span className="text-zinc-400">العربون المسدد:</span>
            <span className="text-white font-bold tabular-nums">{booking.deposit_paid} ج.م</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              سبب الإلغاء
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all cursor-pointer mb-2"
            >
              <option value="اعتذار من كابتن الفرقة هاتفياً">اعتذار من كابتن الفرقة هاتفياً</option>
              <option value="عدم حضور الفرقة في موعد الماتش">عدم حضور الفرقة في موعد الماتش</option>
              <option value="ظروف طارئة أو صيانة في الملعب">ظروف طارئة أو صيانة في الملعب</option>
              <option value="خطأ غير مقصود في توقيت الحجز">خطأ غير مقصود في توقيت الحجز</option>
              <option value="أخرى">سبب آخر...</option>
            </select>

            {reason === "أخرى" && (
              <input
                type="text"
                placeholder="اكتب سبب الإلغاء..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all"
                required
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-destructive text-xs font-black text-white hover:bg-destructive/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "جاري الإلغاء..." : "تأكيد الإلغاء وتحرير الساعة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/[0.06] text-xs font-bold text-zinc-300 hover:text-white transition-all"
            >
              تراجع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
