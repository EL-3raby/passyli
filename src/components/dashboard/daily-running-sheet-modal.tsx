"use client";

import { X, Printer, Calendar, Building2, Phone, CheckCircle2, Clock } from "lucide-react";
import type { DashboardBooking, DashboardCourt } from "@/lib/api/dashboard";

interface DailyRunningSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueName: string;
  date: string;
  bookings: DashboardBooking[];
  courts: DashboardCourt[];
}

export default function DailyRunningSheetModal({
  isOpen,
  onClose,
  venueName,
  date,
  bookings,
  courts,
}: DailyRunningSheetModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const formatDateArabic = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatTimeArabic = (timeStr: string) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const period = h >= 12 ? "م" : "ص";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${period}`;
  };

  // Filter only active bookings for the running sheet
  const activeBookings = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed" || b.status === "pending_payment")
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const totalCashToCollect = activeBookings.reduce(
    (sum, b) => sum + (b.status === "completed" ? 0 : b.cash_remaining),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col print:bg-white print:text-black print:border-none print:shadow-none print:max-h-none print:w-full print:p-0"
        dir="rtl"
      >
        {/* Header (Screen only) */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Printer className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                كشف تشغيل اليوم (Daily Running Sheet)
              </h3>
              <p className="text-xs text-zinc-400">
                جدول موجز لموظف الاستقبال بماتشات اليوم والمتبقي كاش لكل فرقة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[40px] items-center gap-2 px-4 rounded-xl bg-primary text-xs font-black text-black hover:bg-primary-hover active:scale-95 transition-all shadow-sm"
            >
              <Printer className="h-4 w-4" strokeWidth={2} />
              <span>طباعة الكشف</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="flex-1 overflow-y-auto space-y-4 print:overflow-visible">
          {/* Printable Header Info */}
          <div className="p-4 rounded-xl bg-[#1c1c1f] border border-white/[0.06] flex items-center justify-between print:bg-white print:border-b-2 print:border-black print:text-black print:p-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg text-white print:text-black">
                  باصي&zwj;<span className="text-primary print:text-black">&zwj;لي</span>
                </span>
                <span className="text-xs text-zinc-400 print:text-gray-600 font-bold">
                  • كشف التشغيل الميداني
                </span>
              </div>
              <h4 className="text-sm font-bold text-zinc-200 print:text-black mt-1">
                {venueName}
              </h4>
            </div>

            <div className="text-left">
              <span className="text-xs font-bold text-white print:text-black block tabular-nums">
                {formatDateArabic(date)}
              </span>
              <span className="text-[11px] text-zinc-400 print:text-gray-600">
                إجمالي الماتشات: {activeBookings.length} • المتبقي كاش: {totalCashToCollect} ج.م
              </span>
            </div>
          </div>

          {/* Running Sheet Table */}
          {activeBookings.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400">
              لا توجد حجوزات مسجلة لهذا اليوم.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 print:border-black print:text-black">
                    <th className="py-2.5 px-3 font-bold">الساعة</th>
                    <th className="py-2.5 px-3 font-bold">الملعب</th>
                    <th className="py-2.5 px-3 font-bold">كابتن الفرقة</th>
                    <th className="py-2.5 px-3 font-bold">رقم الهاتف</th>
                    <th className="py-2.5 px-3 font-bold text-center">الحالة</th>
                    <th className="py-2.5 px-3 font-bold text-left">المدفوع</th>
                    <th className="py-2.5 px-3 font-bold text-left">المتبقي كاش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] print:divide-gray-300">
                  {activeBookings.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-white/[0.02] transition-colors print:text-black"
                    >
                      <td className="py-3 px-3 font-black text-white print:text-black tabular-nums whitespace-nowrap">
                        {formatTimeArabic(b.start_time)}
                      </td>
                      <td className="py-3 px-3 font-bold text-zinc-300 print:text-black">
                        {b.court?.name}
                      </td>
                      <td className="py-3 px-3 font-bold text-white print:text-black">
                        {b.booker_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-300 print:text-black tabular-nums" dir="ltr">
                        {b.booker_phone}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 print:border print:border-black"
                              : b.status === "confirmed"
                              ? "bg-primary/10 text-primary print:border print:border-black"
                              : "bg-amber-500/10 text-amber-300 print:border print:border-black"
                          }`}
                        >
                          {b.status === "completed"
                            ? "حضر وسدد"
                            : b.status === "confirmed"
                            ? b.is_walkin
                              ? "كاش محلي"
                              : "مؤكد"
                            : "قيد المراجعة"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-left font-bold text-zinc-300 print:text-black tabular-nums">
                        {b.deposit_paid} ج.م
                      </td>
                      <td className="py-3 px-3 text-left font-black tabular-nums">
                        <span
                          className={
                            b.cash_remaining === 0
                              ? "text-zinc-500 print:text-gray-500"
                              : "text-amber-400 print:text-black"
                          }
                        >
                          {b.cash_remaining} ج.م
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Running Sheet Summary Box */}
          <div className="p-3.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] flex items-center justify-between text-xs print:bg-white print:border-t-2 print:border-black print:text-black">
            <span className="font-bold text-zinc-300 print:text-black">
              إجمالي الكاش المطلوب استلامه على أرض الملعب اليوم:
            </span>
            <span className="text-sm font-black text-amber-400 print:text-black tabular-nums">
              {totalCashToCollect} ج.م
            </span>
          </div>
        </div>

        {/* Footer info (Screen only) */}
        <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-xs text-zinc-500 print:hidden">
          <span>يتم تحديث هذا الكشف لحظياً مع كل حجز جديد أو تأكيد كاش.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
