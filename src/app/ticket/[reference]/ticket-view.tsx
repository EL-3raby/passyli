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
  Share2,
  QrCode,
  Info,
  Footprints,
  Smartphone,
  Layers,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [passOrientation, setPassOrientation] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [ticketUrl, setTicketUrl] = useState<string>(
    initialBooking
      ? `https://passyli.com/ticket/${initialBooking.booking_reference}`
      : ""
  );

  // Sync ticketUrl safely on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTicketUrl(window.location.href);
    }
  }, []);

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

  // Realtime subscription for live booking & receipt verification updates
  useEffect(() => {
    if (!booking?.id) return;

    const supabase = createClient();
    const bookingId = booking.id;

    const channel = supabase
      .channel(`ticket-live-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receipts",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newRec = payload.new as
            | { status?: string; rejection_reason?: string }
            | undefined;
          if (!newRec) return;
          setBooking((prev) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              receipt_status:
                (newRec.status as "submitted" | "verified" | "rejected") ||
                prev.receipt_status,
              rejection_reason:
                newRec.rejection_reason || prev.rejection_reason,
            };
            if (
              newRec.status === "verified" &&
              prev.receipt_status !== "verified"
            ) {
              playReceiptChime();
            }
            return updated;
          });
        }
      )
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
            return {
              ...prev,
              status: newBooking.status || prev.status,
              deposit_paid: newBooking.deposit_paid ?? prev.deposit_paid,
              cash_remaining: newBooking.cash_remaining ?? prev.cash_remaining,
              cancellation_reason:
                newBooking.cancellation_reason ?? prev.cancellation_reason,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking?.id]);

  const handleCopyCode = () => {
    if (!booking?.booking_reference) return;
    void navigator.clipboard.writeText(booking.booking_reference);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2500);
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

  const handleShareSquadWhatsApp = () => {
    if (!booking) return;
    const isPadel = booking.court.sport === "padel";
    const playersCount = isPadel ? 4 : 10;
    const cashPerPlayer = Math.ceil(booking.cash_remaining / playersCount);
    const duration = booking.court.slot_duration_minutes || 60;

    const message = [
      "*تذكرة ماتش رسمية معتمدة على باصيلي (Passyli)*",
      "",
      `*الملعب:* ${booking.venue.name} — ${booking.court.name}`,
      `*اليوم:* ${formatDateArabic(booking.booking_date)}`,
      `*الميعاد:* ${formatTimeArabic(booking.start_time)} إلى ${formatTimeArabic(booking.end_time)} (${duration} دقيقة)`,
      `*كابتن الفرقة:* ${booking.booker_name}`,
      "",
      `*المطلوب كاش من كل لاعب بالملعب:* ${cashPerPlayer} ج.م`,
      `*(حسبة تقسيم ${playersCount} لاعبين)*`,
      "",
      `*رابط التذكرة واللوكيشن ورمز الدخول:*`,
      ticketUrl,
    ].join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/20 selection:text-primary">
        <main className="max-w-xl mx-auto px-4 py-16 space-y-5 pb-28 md:pb-12" dir="rtl">
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

      const candidateMs = new Date(`${newDate}T${startTime}`).getTime();
      if (mins >= 24 * 60) {
        // next morning slot
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

  const isVerified =
    booking.receipt_status === "verified" || booking.status === "completed";
  const isRejected =
    booking.receipt_status === "rejected" || booking.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/20 selection:text-primary">
      <main
        className="max-w-4xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-5 pb-28 md:pb-12"
        dir="rtl"
      >
        {/* Dynamic Alerts */}
        {rescheduleSuccess && (
          <div
            role="status"
            className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span>{rescheduleSuccess}</span>
          </div>
        )}

        {isRejected && (
          <div
            role="alert"
            className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" strokeWidth={1.5} />
            <span>
              سبب عدم التأكيد: {booking.rejection_reason || "تم رفض إيصال التحويل لعدم مطابقة بيانات الدفع من إدارة المنشأة."}
            </span>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ORIENTATION TOGGLE & PRESENTATION MODE BAR           */}
        {/* ---------------------------------------------------- */}
        <div className="flex items-center justify-between gap-3 bg-[#141417] border border-white/[0.08] p-2 sm:p-2.5 rounded-2xl">
          <div className="flex items-center gap-2 pr-1">
            <span className="text-[11px] font-bold text-zinc-300 hidden sm:inline">
              نمط عرض التذكرة:
            </span>
            <span className="text-[11px] font-bold text-zinc-400 sm:hidden">
              النمط:
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#09090b] p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setPassOrientation("horizontal")}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                passOrientation === "horizontal"
                  ? "bg-primary text-black shadow-sm font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>تذكرتي بالعرض (الأصلي)</span>
            </button>

            <button
              type="button"
              onClick={() => setPassOrientation("vertical")}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                passOrientation === "vertical"
                  ? "bg-primary text-black shadow-sm font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>رأسي للموبايل</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Scroll Helper Notice */}
        {passOrientation === "horizontal" && (
          <div className="md:hidden flex items-center justify-between text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl">
            <span>تذكرة أفقية رسمية كاملة (اسحب يميناً ويساراً لمشاهدة كعب التذكرة)</span>
            <span className="text-primary font-mono text-[10px]">SCROLL ↔</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* THE TAZKARTI HORIZONTAL STADIUM MATCH PASS CONTAINER     */}
        {/* ======================================================== */}
        <div
          className={`${
            passOrientation === "horizontal"
              ? "overflow-x-auto pb-2 scrollbar-none"
              : ""
          }`}
        >
          <div
            className={`relative rounded-[28px] bg-[#121316] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden transition-all ${
              passOrientation === "horizontal"
                ? "min-w-[720px] md:min-w-0 flex flex-row items-stretch"
                : "flex flex-col"
            }`}
          >
            {/* Ambient Top Glow */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />

            {/* ---------------------------------------------------- */}
            {/* RIGHT WING: MAIN MATCH EVENT SLIP (قسيمة المباراة)   */}
            {/* ---------------------------------------------------- */}
            <div
              className={`flex-1 p-5 sm:p-7 flex flex-col justify-between space-y-5 relative z-10 ${
                passOrientation === "horizontal" ? "w-full md:w-[62%]" : ""
              }`}
            >
              {/* Slip Header: Brand Mark + Status Badge */}
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center font-display font-black text-black text-lg shadow-[0_2px_12px_rgba(16,185,129,0.35)]">
                    P
                  </div>
                  <div>
                    <span className="font-display font-black text-lg text-white block leading-tight">
                      باصي<span className="text-primary">لي</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-latin tracking-wide block">
                      OFFICIAL STADIUM PASS
                    </span>
                  </div>
                </div>

                <div>
                  {isVerified ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                      <span>تذكرة معتمدة ورسمية</span>
                    </div>
                  ) : isRejected ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-400">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span>تعذر اعتماد الإيصال</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      <span>قيد التأكيد والمراجعة</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Venue & Title */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 mb-1">
                  <Footprints className="h-3 w-3" strokeWidth={1.5} />
                  <span>
                    {booking.court.sport === "padel"
                      ? "ملعب بادل بانوراما معتمد"
                      : "ملعب كرة قدم خماسي معتمد"}
                  </span>
                </div>

                <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                  {booking.venue.name}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                  {booking.court.name}
                </p>
              </div>

              {/* Stadium Billboard (Kickoff Time & Date) */}
              <div className="rounded-2xl bg-[#18191d] border border-white/[0.08] p-4 space-y-3 shadow-inner">
                <div className="grid grid-cols-2 gap-3 items-center border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">
                        موعد ضربة البداية
                      </span>
                      <span className="font-display font-black text-base sm:text-lg text-primary tabular-nums block">
                        {formatTimeArabic(booking.start_time)} — {formatTimeArabic(booking.end_time)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">
                        يوم وتاريخ الماتش
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white block">
                        {formatDateArabic(booking.booking_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Captain & Address Strip */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">كابتن الفرقة</span>
                    <span className="font-bold text-white block text-xs truncate">
                      {booking.booker_name || "كابتن الفرقة"}
                    </span>
                    <span className="font-mono text-zinc-400 text-[11px] block tabular-nums" dir="ltr">
                      {booking.booker_phone}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block">عنوان الاستاد</span>
                    <span className="font-bold text-zinc-200 block text-xs truncate">
                      {booking.venue.address}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      المدة {booking.court.slot_duration_minutes || 60} دقيقة
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Capsule & Squad Split */}
              <div className="rounded-2xl bg-[#151619] border border-white/[0.06] p-3.5 space-y-2.5">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[10px] text-zinc-400 block">إجمالي الإيجار</span>
                    <span className="font-bold text-xs sm:text-sm text-white tabular-nums">
                      {booking.total_price} ج.م
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[10px] text-zinc-400 block">
                      {isFullPayment ? "مسدد بالكامل" : "العربون المسدد"}
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-emerald-400 tabular-nums">
                      {booking.deposit_paid || booking.deposit_required} ج.م
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/25">
                    <span className="text-[10px] text-primary block font-bold">المتبقي بالملعب</span>
                    <span className="font-black text-xs sm:text-sm text-primary tabular-nums">
                      {booking.cash_remaining} ج.م
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Users className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    <span className="font-bold text-[11px]">
                      المطلوب كاش من كل لاعب بالملعب:
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      (تقسيم {playersCount} لاعبين)
                    </span>
                  </div>
                  <span className="font-display font-black text-lg text-primary tabular-nums">
                    {cashPerPlayer} <span className="text-xs font-normal">ج.م</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* PHYSICAL PERFORATION DIVIDER (VERTICAL ON DESKTOP)   */}
            {/* ---------------------------------------------------- */}
            {passOrientation === "horizontal" ? (
              <div className="relative flex flex-col justify-between items-center shrink-0 w-0 md:w-auto my-0">
                {/* Top Cutout Notch */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#09090b] border-b border-white/10 z-20 shadow-inner" />
                {/* Vertical Dashed Perforation Stitch */}
                <div className="h-full border-r-2 border-dashed border-white/15 mx-0" />
                {/* Bottom Cutout Notch */}
                <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#09090b] border-t border-white/10 z-20 shadow-inner" />
              </div>
            ) : (
              <div className="relative py-1 flex items-center justify-center">
                <div className="absolute -left-4 w-8 h-8 rounded-full bg-[#09090b] border-r border-white/10 shadow-inner z-10" />
                <div className="absolute -right-4 w-8 h-8 rounded-full bg-[#09090b] border-l border-white/10 shadow-inner z-10" />
                <div className="w-full border-t-2 border-dashed border-white/15 mx-5" />
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* LEFT WING: GATE VERIFICATION STUB (كعب التذكرة والبوابة) */}
            {/* ---------------------------------------------------- */}
            <div
              className={`bg-gradient-to-b md:bg-gradient-to-l from-[#16171b] to-[#101114] p-5 sm:p-6 flex flex-col items-center justify-between text-center space-y-4 relative z-10 ${
                passOrientation === "horizontal"
                  ? "w-full md:w-[320px] shrink-0"
                  : ""
              }`}
            >
              {/* Gate Pass Header */}
              <div className="w-full flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  <span>كعب تذكرة الدخول</span>
                </span>
                <span className="text-[9px] text-zinc-500 font-mono tracking-wider">
                  GATE PASS STUB
                </span>
              </div>

              {/* Scannable SVG QR Code */}
              <div className="p-3 rounded-2xl bg-white border border-white/20 shadow-[0_0_30px_rgba(16,185,129,0.22)]">
                <QRCodeSVG
                  value={ticketUrl || `https://passyli.com/ticket/${booking.booking_reference}`}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#09090b"
                  level="Q"
                  includeMargin={false}
                />
              </div>

              {/* Booking Reference Code & Copy Button */}
              <div className="w-full space-y-1.5">
                <span className="text-[10px] text-zinc-400 block">
                  كود الحجز المعتمد للمباراة
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="font-mono font-black text-base text-primary tracking-wider select-all"
                    dir="ltr"
                  >
                    {booking.booking_reference}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label="نسخ كود الحجز"
                    className="inline-flex min-h-[32px] items-center gap-1 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                  >
                    {isCopiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        <span>تم</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Gatekeeper Scan Instructions */}
              <p className="text-[10px] sm:text-[11px] text-zinc-400 max-w-[240px] leading-relaxed">
                امسح الرمز ضوئياً عند بوابة الدخول أو مع مسؤول الكنترول لتسجيل الحضور فوراً واستلام الكرة.
              </p>

              {/* Security Hash Barcode */}
              <div className="w-full pt-2 border-t border-white/[0.06]">
                <div className="h-3 w-full bg-white/10 rounded flex items-center justify-around px-2 opacity-40">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 ${
                        i % 3 === 0
                          ? "w-1 bg-white"
                          : i % 2 === 0
                          ? "w-0.5 bg-white"
                          : "w-1.5 bg-white"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[8px] text-zinc-500 font-mono block mt-1">
                  TAZKARTI PROTOCOL • SECURE GATE VERIFICATION
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stadium Guidelines Banner */}
        <div className="rounded-2xl bg-[#121316] border border-white/[0.06] p-4 text-xs text-zinc-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-zinc-300 font-bold mb-1">
            <Info className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span>إرشادات وتعليمات دخول الاستاد:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            • التواجد بالملعب قبل الموعد بـ 15 دقيقة للتسخين واستلام الكرة وغرف الملابس.
          </p>
          <p className="text-[11px] leading-relaxed">
            • الالتزام بالأحذية المخصصة للترتان (Turf / TF) للحفاظ على جودة أرضية الملعب وسلامة اللاعبين.
          </p>
          <p className="text-[11px] leading-relaxed">
            • الحجز مؤكد ومحمي بالكامل ضد التضارب أو الحجز المزدوج عبر منظومة باصيلي.
          </p>
        </div>

        {/* ======================================================== */}
        {/* TACTICAL ACTION BAR (Mobile-First, 44px+ Touch Targets) */}
        {/* ======================================================== */}
        <div className="space-y-2.5 pt-1">
          {/* Primary: Share with Football Squad on WhatsApp */}
          <button
            type="button"
            onClick={handleShareSquadWhatsApp}
            className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_2px_15px_rgba(16,185,129,0.3)] active:scale-[0.99] transition-all"
          >
            <Share2 className="h-4 w-4" strokeWidth={2} />
            <span>مشاركة تفاصيل الماتش وحسبة الفرقة على واتساب</span>
          </button>

          {/* Secondary: Open Stadium GPS on Google Maps */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${booking.venue.latitude},${booking.venue.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] rounded-xl bg-[#1c1c1f] hover:bg-[#242427] border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Navigation className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span>فتح موقع الملعب على Google Maps (اللوكيشن)</span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </a>

          {/* Tertiary Row: Save Image & Call Venue & Reschedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="min-h-[44px] rounded-xl bg-[#141416] hover:bg-[#1c1c1f] border border-white/[0.08] text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <span>{isDownloading ? "جاري التحميل..." : "حفظ التذكرة كصورة (PNG)"}</span>
            </button>

            <a
              href={`tel:${booking.venue.phone}`}
              className="min-h-[44px] rounded-xl bg-[#141416] hover:bg-[#1c1c1f] border border-white/[0.08] text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <span>اتصال بإدارة الملعب</span>
            </a>
          </div>

          {/* Reschedule Button if allowed */}
          {canReschedule && (
            <button
              type="button"
              onClick={() => setIsRescheduleOpen(true)}
              className="w-full min-h-[44px] rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-black text-xs flex items-center justify-center gap-2 transition-all"
            >
              <CalendarClock className="h-4 w-4" strokeWidth={1.5} />
              <span>تعديل ميعاد الماتش فوراً (متاح قبل الماتش بـ 12 ساعة)</span>
            </button>
          )}

          {/* Copy Ticket Link Utility */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full min-h-[40px] rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            {isCopiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                <span className="text-primary font-bold">تم نسخ رابط التذكرة</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>نسخ رابط صفحة التذكرة للمشاركة</span>
              </>
            )}
          </button>
        </div>

        {/* Platform Trust & Safety */}
        <div className="text-center py-3 space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span>حجز موثق بنظام تذاكر الاستادات — منصة باصيلي (Passyli)</span>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* INSTANT RESCHEDULE MODAL                                 */}
      {/* ======================================================== */}
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
