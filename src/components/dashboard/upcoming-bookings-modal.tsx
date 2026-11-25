"use client";

import { useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Phone,
  User,
  ArrowRight,
  ExternalLink,
  Banknote,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { DashboardBooking } from "@/lib/api/dashboard";

interface UpcomingBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueName?: string;
  bookings: DashboardBooking[];
  onSelectBookingDate: (date: string) => void;
}

export default function UpcomingBookingsModal({
  isOpen,
  onClose,
  venueName,
  bookings,
  onSelectBookingDate,
}: UpcomingBookingsModalProps) {
  if (!isOpen) return null;

  const today = new Date().toISOString().split("T")[0];

  // Filter only future bookings (date > today) that are active
  const futureBookings = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.booking_date > today &&
          (b.status === "confirmed" || b.status === "completed" || b.status === "pending_payment")
      )
      .sort((a, b) => {
        const dateCmp = a.booking_date.localeCompare(b.booking_date);
        if (dateCmp !== 0) return dateCmp;
        return a.start_time.localeCompare(b.start_time);
      });
  }, [bookings, today]);

  // Group by date
  const groupedBookings = useMemo(() => {
    const groups: { [date: string]: DashboardBooking[] } = {};
    futureBookings.forEach((b) => {
      if (!groups[b.booking_date]) groups[b.booking_date] = [];
      groups[b.booking_date].push(b);
    });
    return groups;
  }, [futureBookings]);

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const arabicMonths = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];
      const dayName = arabicDays[d.getDay()];
      const dayNum = d.getDate();
      const monthName = arabicMonths[d.getMonth()];

      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);
      const diffDays = Math.round((d.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

      let relativeLabel = `بعد ${diffDays} يوم`;
      if (diffDays === 1) relativeLabel = "بكرة";
      if (diffDays === 2) relativeLabel = "بعد بكرة";

      return {
        fullDate: `${dayName} ${dayNum} ${monthName}`,
        relativeLabel,
      };
    } catch {
      return { fullDate: dateStr, relativeLabel: "" };
    }
  };

  const formatTimeArabic = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const period = h >= 12 ? "م" : "ص";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${period}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 mb-1.5">
              <Calendar className="h-3 w-3" strokeWidth={1.5} />
              <span>جدول الحجوزات المستقبلية</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              الحجوزات القادمة في {venueName || "المنشأة"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              إجمالي <strong className="text-white tabular-nums">{futureBookings.length}</strong> ماتش محجوز للأيام القادمة أونلاين.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-all shrink-0"
            aria-label="إغلاق النافذة"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto space-y-5 flex-1 pr-1 pl-1">
          {futureBookings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 flex items-center justify-center mx-auto">
                <Calendar className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-bold text-white">لا توجد حجوزات مستقبلية حالياً</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                كل الحجوزات القادمة في الأيام أو الأسابيع المقبلة ستظهر هنا مرتبة حسب اليوم مع تفاصيل الكباتن والمبالغ المتبقية.
              </p>
            </div>
          ) : (
            Object.entries(groupedBookings).map(([dateStr, dayBookings]) => {
              const { fullDate, relativeLabel } = formatDateHeader(dateStr);

              return (
                <div key={dateStr} className="space-y-2.5">
                  {/* Date Header Strip */}
                  <div className="flex items-center justify-between sticky top-0 bg-[#141418] z-10 py-1.5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white tabular-nums">
                        {fullDate}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black">
                        {relativeLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectBookingDate(dateStr);
                        onClose();
                      }}
                      className="text-xs font-bold text-zinc-400 hover:text-primary transition-all flex items-center gap-1"
                    >
                      <span>فتح هذا اليوم في الجدول</span>
                      <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Matches List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {dayBookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl bg-[#1c1c1f] border border-white/[0.06] p-3.5 flex flex-col justify-between gap-3 hover:border-white/15 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-white tabular-nums">
                              <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                              <span>{formatTimeArabic(b.start_time)} — {formatTimeArabic(b.end_time)}</span>
                            </span>

                            <span className="text-[11px] font-bold text-zinc-300 bg-white/[0.06] px-2 py-0.5 rounded-md">
                              {b.court?.name || "ملعب"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                              <span>{b.booker_name}</span>
                            </span>

                            <a
                              href={`tel:${b.booker_phone}`}
                              className="text-primary hover:underline font-bold tabular-nums flex items-center gap-1"
                              dir="ltr"
                            >
                              <span>{b.booker_phone}</span>
                              <Phone className="h-3 w-3" strokeWidth={1.5} />
                            </a>
                          </div>
                        </div>

                        {/* Financial and Quick Jump Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                          <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                            <span>الإجمالي: <strong className="text-white tabular-nums">{b.total_price} ج.م</strong></span>
                            {b.cash_remaining > 0 ? (
                              <span className="text-amber-300 font-bold">
                                باقي: {b.cash_remaining} ج.م
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-bold inline-flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                                <span>مسدد بالكامل</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectBookingDate(b.booking_date);
                              onClose();
                            }}
                            className="min-h-[32px] px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                          >
                            <span>عرض بالجدول</span>
                            <ArrowRight className="h-3 w-3 rotate-180" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-xs text-zinc-400">
          <span>يتم تحديث هذه القائمة لحظياً مع أي حجز أونلاين جديد.</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
