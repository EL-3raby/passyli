"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Copy,
  Check,
  Navigation,
  ShieldCheck,
  Users,
  Download,
  AlertCircle,
  ExternalLink,
  Phone,
  CalendarClock,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  getActiveBookingsForDate,
  rescheduleBooking,
  type ActiveSlotLock,
  type BookingDetails,
} from "@/lib/api/bookings";
import { useAuth } from "@/components/auth/auth-provider";
import { generateMatchBillBlob, downloadBillImage } from "@/lib/match-bill";
import { createClient } from "@/lib/supabase/client";
import { playReceiptChime } from "@/lib/sound";

interface TicketViewProps {
  initialBooking: BookingDetails | null;
  bookingReference: string;
}

export default function TicketView({
  initialBooking,
  bookingReference,
}: TicketViewProps) {
  const { openAuthModal } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(initialBooking);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Instant Reschedule Modal state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState<string>(
    initialBooking?.booking_date || new Date().toISOString().split("T")[0]
  );
  const [activeLocks, setActiveLocks] = useState<ActiveSlotLock[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: string;
    endTime: string;
    price: number;
  } | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!isRescheduleOpen || !booking) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setRescheduleError(null);
    getActiveBookingsForDate(newDate)
      .then((locks) => setActiveLocks(locks))
      .finally(() => setLoadingSlots(false));
  }, [isRescheduleOpen, newDate, booking]);

  // Realtime subscription for live booking updates on the ticket page
  useEffect(() => {
    if (!booking?.id) return;

    const supabase = createClient();
    const bookingId = booking.id;

    const channel = supabase
      .channel(`ticket-live-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const newBooking = payload.new as any;
          if (!newBooking) return;
          setBooking((prev) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              status: newBooking.status || prev.status,
              deposit_paid: newBooking.deposit_paid ?? prev.deposit_paid,
              cash_remaining: newBooking.cash_remaining ?? prev.cash_remaining,
              cancellation_reason: newBooking.cancellation_reason ?? prev.cancellation_reason,
            };
            if (newBooking.status === "confirmed" && prev.status !== "confirmed") {
              playReceiptChime();
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking?.id]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
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

  const formatDateArabic = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr + "T00:00:00");
      return new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const handleDownloadImage = async () => {
    if (!booking) return;
    try {
      setIsDownloading(true);
      const isPadel = booking.court.sport === "padel";
      const playersCount = isPadel ? 4 : 10;
      const cashPerPlayer = Math.ceil(booking.cash_remaining / playersCount);
      const totalPerPlayer = Math.ceil(booking.total_price / playersCount);

      const billData = {
        venueName: booking.venue.name,
        courtName: booking.court.name,
        sport: booking.court.sport,
        bookerName: booking.booker_name || "كابتن الفرقة",
        bookerPhone: booking.booker_phone,
        displayDate: formatDateArabic(booking.booking_date),
        dayLabel: "ميعاد الماتش",
        slotTime: formatTimeArabic(booking.start_time),
        durationMinutes: booking.court.slot_duration_minutes || 60,
        totalPrice: booking.total_price,
        depositPaid: booking.deposit_paid || booking.deposit_required,
        cashRemaining: booking.cash_remaining,
        playersCount,
        cashPerPlayer,
        totalPerPlayer,
        bookingRef: booking.booking_reference,
      };

      const result = await generateMatchBillBlob(billData);
      downloadBillImage(result.blob, booking.booking_reference);
    } catch (err) {
      console.error("Failed to download image:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/20 selection:text-primary">
        <main className="max-w-2xl mx-auto px-4 py-16 space-y-5 pb-28 md:pb-12">
          <div className="text-center py-16 px-4 rounded-3xl bg-[#141416] border border-white/[0.08] space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h1 className="font-display font-black text-xl text-white">
              لم يتم العثور على التذكرة
            </h1>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              تأكد من صحة كود الحجز المكتوب في الرابط ({bookingReference})، أو قد يكون الحجز انتهت صلاحيته أو تم إلغاؤه.
            </p>
            <div className="pt-2">
              <Link
                href="/courts"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-black text-black hover:bg-primary-hover transition-all"
              >
                <span>تصفح وحجز الملاعب المتاحة</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isPadel = booking.court.sport === "padel";
  const playersCount = isPadel ? 4 : 10;
  const cashPerPlayer = Math.ceil(booking.cash_remaining / playersCount);
  const totalPerPlayer = Math.ceil(booking.total_price / playersCount);
  const isFullPayment =
    booking.payment_type === "full" || booking.cash_remaining === 0;

  const matchStartMs = new Date(
    `${booking.booking_date}T${booking.start_time.slice(0, 8)}`
  ).getTime();
  const hoursUntilMatch = (matchStartMs - Date.now()) / (1000 * 60 * 60);
  const canReschedule =
    booking.status === "confirmed" &&
    !booking.reschedule_requested_at &&
    hoursUntilMatch >= 12;

  const generateRescheduleSlots = () => {
    const duration = booking.court.slot_duration_minutes || 60;
    const peakHour = parseInt(
      (booking.court.peak_hour_start || "17:00").split(":")[0],
      10
    );
    const morningPrice = booking.court.price_morning ?? booking.total_price;
    const eveningPrice = booking.court.price_evening ?? booking.total_price;
    const slots: Array<{
      startTime: string;
      endTime: string;
      price: number;
      isTaken: boolean;
      isCurrent: boolean;
    }> = [];

    for (let mins = 9 * 60; mins < 26 * 60; mins += duration) {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      const endMins = mins + duration;
      const eh = Math.floor(endMins / 60) % 24;
      const em = endMins % 60;
      const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}:00`;
      const endTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(
        2,
        "0"
      )}:00`;

      const isCurrent =
        newDate === booking.booking_date &&
        startTime.slice(0, 5) === booking.start_time.slice(0, 5);

      const isTaken = activeLocks.some(
        (l) =>
          l.courtId === booking.court.id &&
          l.startTime.slice(0, 5) === startTime.slice(0, 5)
      );

      // Skip past times on today
      const candidateMs = new Date(`${newDate}T${startTime}`).getTime();
      if (mins >= 24 * 60) {
        // early morning belongs to the chosen booking_date logic if needed, keep selectable if > now
      } else if (candidateMs <= Date.now() + 30 * 60 * 1000) {
        continue;
      }

      const isPeak = h >= peakHour || h < 6;
      const price = isPeak ? eveningPrice : morningPrice;

      slots.push({ startTime, endTime, price, isTaken, isCurrent });
    }
    return slots;
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;
    setRescheduleBusy(true);
    setRescheduleError(null);

    const res = await rescheduleBooking({
      bookingReference: booking.booking_reference,
      newDate,
      newStartTime: selectedSlot.startTime,
      newEndTime: selectedSlot.endTime,
    });

    setRescheduleBusy(false);
    if (!res.success) {
      setRescheduleError(res.error || "تعذر نقل الميعاد.");
      return;
    }

    setBooking((prev) =>
      prev
        ? {
            ...prev,
            booking_date: res.booking_date || newDate,
            start_time: res.start_time || selectedSlot.startTime,
            end_time: res.end_time || selectedSlot.endTime,
            total_price: res.total_price ?? prev.total_price,
            cash_remaining: res.cash_remaining ?? prev.cash_remaining,
            reschedule_requested_at: new Date().toISOString(),
          }
        : prev
    );
    setIsRescheduleOpen(false);
    setRescheduleSuccess(
      `تم نقل موعد ماتشك بنجاح إلى ${formatDateArabic(
        res.booking_date || newDate
      )} الساعة ${formatTimeArabic(res.start_time || selectedSlot.startTime)}.`
    );
  };

  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/20 selection:text-primary">
      <main
        className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5 pb-28 md:pb-12"
        dir="rtl"
      >
        {rescheduleSuccess && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span>{rescheduleSuccess}</span>
          </div>
        )}

        {/* Header Badge & Reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#141416] border border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  booking.status === "confirmed" || booking.status === "completed"
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  booking.status === "confirmed" || booking.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
            </span>
            <div>
              <span className="text-xs font-bold text-white block">
                {booking.status === "confirmed" || booking.status === "completed"
                  ? "تذكرة حجز مؤكدة ومعتمدة"
                  : "حجز قيد التحقق من الدفع"}
              </span>
              <span className="text-[11px] text-zinc-400 font-latin">
                Passyli Official Match Ticket
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div
              className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 tabular-nums tracking-wider select-all"
              dir="ltr"
            >
              {booking.booking_reference}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="نسخ رابط الفاتورة"
              className="inline-flex min-h-[44px] items-center gap-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 hover:text-white transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                  <span className="text-primary font-bold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>نسخ الرابط</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Squad Financial Hero Box */}
        <div className="rounded-3xl bg-gradient-to-b from-[#18231c] via-[#141416] to-[#141416] border-2 border-primary/30 p-5 sm:p-6 space-y-5 shadow-2xl shadow-primary/5 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 mb-2">
                <Users className="h-3 w-3" strokeWidth={2} />
                <span>
                  حسبة الفرقة • تقسيم {playersCount} لاعبين (
                  {isPadel ? "بادل 2 ضد 2" : "خماسي 5 ضد 5"})
                </span>
              </span>
              <h2 className="font-display font-black text-lg text-white">
                {isFullPayment
                  ? "تم سداد قيمة الماتش بالكامل إلكترونياً"
                  : "المطلوب كاش من كل لاعب يجهزه للملعب"}
              </h2>
            </div>
          </div>

          <div className="flex items-baseline gap-2 bg-black/40 rounded-2xl p-4 border border-primary/20">
            <span className="font-display font-black text-4xl sm:text-5xl text-primary tabular-nums tracking-tight">
              {cashPerPlayer}
            </span>
            <span className="text-sm font-bold text-zinc-300">
              {isFullPayment
                ? "ج.م كاش بالملعب (مسدد بالكامل)"
                : "ج.م كاش في الملعب"}
            </span>
            <span className="text-xs text-zinc-400 mr-auto">
              (إجمالي نصيب اللاعب:{" "}
              <strong className="text-white tabular-nums">
                {totalPerPlayer} ج.م
              </strong>
              )
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 block mb-0.5">
                إجمالي إيجار الملعب
              </span>
              <span className="font-bold text-sm sm:text-base text-white tabular-nums">
                {booking.total_price}{" "}
                <span className="text-[10px] font-normal text-zinc-400">ج.م</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 block mb-0.5">
                {isFullPayment ? "المسدّد إلكترونياً" : "العربون المدفوع"}
              </span>
              <span className="font-bold text-sm sm:text-base text-emerald-400 tabular-nums">
                {booking.deposit_paid || booking.deposit_required}{" "}
                <span className="text-[10px] font-normal text-zinc-400">ج.م</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30">
              <span className="text-[11px] text-primary block mb-0.5 font-bold">
                المتبقي كاش للملعب
              </span>
              <span className="font-black text-sm sm:text-base text-primary tabular-nums">
                {booking.cash_remaining}{" "}
                <span className="text-[10px] font-normal text-primary/80">ج.م</span>
              </span>
            </div>
          </div>
        </div>

        {/* Match Information Card */}
        <div className="rounded-3xl bg-[#141416] border border-white/[0.08] p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <span className="inline-block text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-1.5 border border-emerald-500/20">
                {booking.court.sport === "padel"
                  ? "ملعب بادل معتمد"
                  : "ملعب كرة قدم خماسي معتمد"}
              </span>
              <h1 className="font-display font-black text-xl text-white">
                {booking.venue.name}
              </h1>
              <span className="text-xs text-zinc-400 block mt-0.5">
                {booking.court.name}
              </span>
            </div>

            <div className="text-left shrink-0">
              <span className="text-[10px] text-zinc-400 block">حاجز الماتش</span>
              <span className="text-xs font-bold text-white block">
                كابتن {booking.booker_name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#1c1c1f] border border-white/[0.06]">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">تاريخ الماتش</span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  {formatDateArabic(booking.booking_date)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#1c1c1f] border border-white/[0.06]">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">ساعة الماتش</span>
                <span className="text-xs sm:text-sm font-bold text-white tabular-nums block">
                  {formatTimeArabic(booking.start_time)} —{" "}
                  {formatTimeArabic(booking.end_time)}
                  <span className="text-[11px] font-normal text-zinc-400 mr-1.5">
                    ({booking.court.slot_duration_minutes || 60} دقيقة)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Reschedule Section inside Match Card */}
          {booking.status === "confirmed" && (
            <div className="rounded-2xl bg-[#1c1c1f] border border-white/[0.06] p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <CalendarClock
                  className="h-4 w-4 text-primary shrink-0"
                  strokeWidth={1.5}
                />
                {booking.reschedule_requested_at ? (
                  <span className="text-zinc-400">
                    تم تعديل موعد هذا الحجز مسبقاً (الموعد السابق:{" "}
                    <strong dir="ltr" className="text-zinc-300 tabular-nums">
                      {booking.reschedule_requested_slot}
                    </strong>
                    )
                  </span>
                ) : canReschedule ? (
                  <span className="text-zinc-300 font-bold">
                    هل طرأ ظرف طارئ؟ يمكنك تغيير الساعة مجاناً لمرة واحدة فوراً.
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    التعديل الفوري متاح قبل موعد الماتش بـ 12 ساعة على الأقل.
                  </span>
                )}
              </div>

              {canReschedule && (
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(true)}
                  className="min-h-[44px] px-4 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-black text-xs inline-flex items-center gap-1.5 transition-all"
                >
                  <CalendarClock className="h-4 w-4" strokeWidth={1.5} />
                  <span>تعديل الميعاد فوراً</span>
                </button>
              )}
            </div>
          )}

          {/* Venue Address & Google Maps */}
          <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.06] space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin
                className="h-4 w-4 text-primary shrink-0 mt-0.5"
                strokeWidth={1.5}
              />
              <div>
                <span className="text-[11px] text-zinc-400 block">
                  عنوان وموقع الملعب
                </span>
                <p className="text-xs font-bold text-zinc-200 leading-relaxed">
                  {booking.venue.address}
                </p>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${booking.venue.latitude},${booking.venue.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 px-4 text-xs font-bold text-white transition-all active:scale-[0.99]"
            >
              <Navigation className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span>فتح موقع الملعب على Google Maps (اللوكيشن)</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          </div>
        </div>

        {/* Utility Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1c1c1f] hover:bg-[#242427] border border-white/[0.08] px-4 text-xs font-bold text-zinc-200 hover:text-white transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <span>{isDownloading ? "جاري التحميل..." : "حفظ الفاتورة كصورة"}</span>
          </button>

          <a
            href={`tel:${booking.venue.phone}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1c1c1f] hover:bg-[#242427] border border-white/[0.08] px-4 text-xs font-bold text-zinc-200 hover:text-white transition-all"
          >
            <Phone className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <span>اتصال بإدارة الملعب</span>
          </a>
        </div>

        {/* Platform Guarantee Footer */}
        <div className="text-center py-4 space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span>حجز موثق ومؤكد عبر منصة باصيلي (Passyli)</span>
          </div>
          <p className="text-[10px] text-zinc-600">
            يضمن هذا الحجز عدم التضارب أو الحجز المزدوج. يرجى التواجد بالملعب قبل الميعاد بـ 15 دقيقة.
          </p>
        </div>
      </main>

      {/* Instant Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-lg rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] flex flex-col"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarClock className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-black text-white">
                    تعديل ميعاد الماتش فوراً
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {booking.venue.name} — {booking.court.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                aria-label="إغلاق"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-400 flex items-center justify-center"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  اختر اليوم الجديد:
                </label>
                <input
                  type="date"
                  min={todayIso}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/10 px-3.5 text-sm font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <span className="text-xs font-bold text-zinc-300 block mb-2">
                  الساعات المتاحة في {formatDateArabic(newDate)}:
                </span>
                {loadingSlots ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="h-12 rounded-xl bg-white/[0.05] animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {generateRescheduleSlots().map((slot) => {
                      const isSelected =
                        selectedSlot?.startTime === slot.startTime;
                      const disabled = slot.isTaken || slot.isCurrent;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            setSelectedSlot({
                              startTime: slot.startTime,
                              endTime: slot.endTime,
                              price: slot.price,
                            })
                          }
                          className={`min-h-[52px] rounded-xl border p-2 text-center transition-all ${
                            disabled
                              ? "bg-white/[0.02] border-white/[0.04] text-zinc-600 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-primary text-black border-primary font-black"
                              : "bg-[#1c1c1f] border-white/[0.08] text-white hover:border-primary/50"
                          }`}
                        >
                          <span className="text-xs font-bold tabular-nums block">
                            {formatTimeArabic(slot.startTime)}
                          </span>
                          <span
                            className={`text-[10px] tabular-nums block ${
                              isSelected ? "text-black/80" : "text-zinc-400"
                            }`}
                          >
                            {slot.isCurrent
                              ? "الموعد الحالي"
                              : slot.isTaken
                              ? "محجوز"
                              : `${slot.price} ج.م`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-300">سعر الساعة الجديدة:</span>
                    <strong className="text-white tabular-nums">
                      {selectedSlot.price} ج.م
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-300">
                      المتبقي كاش بالملعب بعد التعديل:
                    </span>
                    <strong className="text-primary tabular-nums">
                      {Math.max(
                        0,
                        selectedSlot.price -
                          (booking.deposit_paid || booking.deposit_required)
                      )}{" "}
                      ج.م
                    </strong>
                  </div>
                </div>
              )}

              {rescheduleError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 space-y-2">
                  <p>{rescheduleError}</p>
                  {rescheduleError.includes("تسجيل الدخول") && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRescheduleOpen(false);
                        openAuthModal(
                          "signin",
                          typeof window !== "undefined"
                            ? window.location.pathname
                            : undefined
                        );
                      }}
                      className="underline text-primary font-black"
                    >
                      تسجيل الدخول بحسابك الآن
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08] shrink-0">
              <button
                type="button"
                disabled={!selectedSlot || rescheduleBusy}
                onClick={() => void handleConfirmReschedule()}
                className="flex-1 min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
              >
                {rescheduleBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                )}
                <span>
                  {rescheduleBusy ? "جاري النقل..." : "تأكيد نقل الميعاد فوراً"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
