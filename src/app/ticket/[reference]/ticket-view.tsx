"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Copy,
  Check,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Users,
  Download,
  AlertCircle,
  ExternalLink,
  Phone,
} from "lucide-react";
import type { BookingDetails } from "@/lib/api/bookings";
import { generateMatchBillBlob, downloadBillImage } from "@/lib/match-bill";

interface TicketViewProps {
  initialBooking: BookingDetails | null;
  bookingReference: string;
}

export default function TicketView({ initialBooking, bookingReference }: TicketViewProps) {
  const [booking] = useState<BookingDetails | null>(initialBooking);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Format 24h time string (e.g. "18:00:00") to Arabic display (e.g. "06:00 م")
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

  // Format YYYY-MM-DD to Arabic display
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

  // Download Bill Image directly from Ticket page
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
            <h1 className="font-display font-black text-xl text-white">لم يتم العثور على التذكرة</h1>
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

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/20 selection:text-primary">
      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5 pb-28 md:pb-12">
        {/* Header Badge & Reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#141416] border border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                booking.status === "confirmed" ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                booking.status === "confirmed" ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </span>
            <div>
              <span className="text-xs font-bold text-white block">
                {booking.status === "confirmed" ? "تذكرة حجز مؤكدة ومعتمدة" : "حجز قيد التحقق من العربون"}
              </span>
              <span className="text-[11px] text-zinc-400 font-latin">
                Passyli Official Match Ticket
              </span>
            </div>
          </div>

          {/* Booking Reference Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 tabular-nums tracking-wider select-all" dir="ltr">
              {booking.booking_reference}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="نسخ رابط الفاتورة"
              className="inline-flex h-9 items-center gap-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 hover:text-white transition-colors"
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

        {/* SQUAD FINANCIAL HERO BOX (حسبة الفلوس ونصيب كل لاعب) */}
        <div className="rounded-3xl bg-gradient-to-b from-[#18231c] via-[#141416] to-[#141416] border-2 border-primary/30 p-5 sm:p-6 space-y-5 shadow-2xl shadow-primary/5 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 mb-2">
                <Users className="h-3 w-3" strokeWidth={2} />
                <span>حسبة الفرقة • تقسيم {playersCount} لاعبين ({isPadel ? "بادل 2 ضد 2" : "خماسي 5 ضد 5"})</span>
              </span>
              <h2 className="font-display font-black text-lg text-white">
                المطلوب كاش من كل لاعب يجهزه للملعب
              </h2>
            </div>
          </div>

          {/* Cash per player spotlight */}
          <div className="flex items-baseline gap-2 bg-black/40 rounded-2xl p-4 border border-primary/20">
            <span className="font-display font-black text-4xl sm:text-5xl text-primary tabular-nums tracking-tight">
              {cashPerPlayer}
            </span>
            <span className="text-sm font-bold text-zinc-300">
              ج.م كاش في الملعب
            </span>
            <span className="text-xs text-zinc-400 mr-auto">
              (إجمالي نصيب اللاعب: <strong className="text-white tabular-nums">{totalPerPlayer} ج.م</strong>)
            </span>
          </div>

          {/* Financial Settlement Breakdown */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 block mb-0.5">إجمالي إيجار الملعب</span>
              <span className="font-bold text-sm sm:text-base text-white tabular-nums">
                {booking.total_price} <span className="text-[10px] font-normal text-zinc-400">ج.م</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-zinc-400 block mb-0.5">العربون المدفوع</span>
              <span className="font-bold text-sm sm:text-base text-emerald-400 tabular-nums">
                {booking.deposit_paid || booking.deposit_required} <span className="text-[10px] font-normal text-zinc-400">ج.م</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30">
              <span className="text-[11px] text-primary block mb-0.5 font-bold">المتبقي كاش للملعب</span>
              <span className="font-black text-sm sm:text-base text-primary tabular-nums">
                {booking.cash_remaining} <span className="text-[10px] font-normal text-primary/80">ج.م</span>
              </span>
            </div>
          </div>
        </div>

        {/* Match Information Card */}
        <div className="rounded-3xl bg-[#141416] border border-white/[0.08] p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <span className="inline-block text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-1.5 border border-emerald-500/20">
                {booking.court.sport === "padel" ? "ملعب بادل معتمد" : "ملعب كرة قدم خماسي معتمد"}
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

          {/* Date & Time Highlights */}
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
                  {formatTimeArabic(booking.start_time)} — {formatTimeArabic(booking.end_time)}
                  <span className="text-[11px] font-normal text-zinc-400 mr-1.5">
                    ({booking.court.slot_duration_minutes || 60} دقيقة)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Venue Address & Google Maps Navigation */}
          <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.06] space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <span className="text-[11px] text-zinc-400 block">عنوان وموقع الملعب</span>
                <p className="text-xs font-bold text-zinc-200 leading-relaxed">
                  {booking.venue.address}
                </p>
              </div>
            </div>

            {/* Google Maps Action Button */}
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

        {/* Utility Actions (Download Picture / Call Venue) */}
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

        {/* Platform Guarantee Footer Note */}
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
    </div>
  );
}
