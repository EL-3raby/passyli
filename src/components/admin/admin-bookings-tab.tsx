"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  CalendarClock,
  CheckCircle2,
  Unlock,
  XCircle,
  Loader2,
  ZoomIn,
  X,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import {
  getAdminBookingsFeed,
  resolveBookingDispute,
  type AdminBookingItem,
} from "@/lib/api/admin";

interface AdminBookingsTabProps {
  onRefreshOverview: () => Promise<void>;
  onFeedback: (msg: string, isError?: boolean) => void;
}

type StatusFilter =
  | "all"
  | "pending_receipt"
  | "locked"
  | "confirmed"
  | "cancelled";

const BOOKING_STATUS_META: Record<
  AdminBookingItem["status"],
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending_payment: {
    label: "بانتظار الدفع / المراجعة",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    dotClass: "bg-amber-400",
  },
  confirmed: {
    label: "مؤكد",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    dotClass: "bg-emerald-400",
  },
  completed: {
    label: "مكتمل",
    badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/25",
    dotClass: "bg-sky-400",
  },
  cancelled: {
    label: "ملغى",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    dotClass: "bg-rose-400",
  },
  expired: {
    label: "منتهي القفل",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
    dotClass: "bg-zinc-400",
  },
};

function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("20")
    ? digits
    : digits.startsWith("0")
    ? `2${digits}`
    : `20${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export default function AdminBookingsTab({
  onRefreshOverview,
  onFeedback,
}: AdminBookingsTabProps) {
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewBooking, setPreviewBooking] = useState<AdminBookingItem | null>(
    null
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getAdminBookingsFeed({
        search: search.trim() || undefined,
        status: statusFilter,
        limit: 80,
      });
      setBookings(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر تحميل سجل الحجوزات"
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBookings();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [loadBookings]);

  const handleAction = async (
    item: AdminBookingItem,
    action: "release_lock" | "force_confirm" | "admin_cancel"
  ) => {
    const reason = (reasons[item.id] || "").trim();
    if (action === "admin_cancel" && !reason) {
      onFeedback("يرجى كتابة سبب الإلغاء الإداري في خانة الملاحظة أولاً.", true);
      return;
    }

    setBusyId(item.id);
    const res = await resolveBookingDispute({
      bookingId: item.id,
      action,
      reason: reason || undefined,
    });
    setBusyId(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر تنفيذ التدخل الإداري", true);
      return;
    }

    const msgMap = {
      release_lock: `تم تحرير القفل المؤقت للحجز ${item.booking_reference}.`,
      force_confirm: `تم التأكيد الإداري للحجز ${item.booking_reference} وخصم العمولة من محفظة الملعب.`,
      admin_cancel: `تم إلغاء الحجز ${item.booking_reference} إدارياً.`,
    };
    onFeedback(msgMap[action]);
    await Promise.all([loadBookings(), onRefreshOverview()]);
  };

  const filterButtons: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "الكل" },
    { id: "pending_receipt", label: "إيصال بانتظار المراجعة" },
    { id: "locked", label: "قفل جارٍ (8 د)" },
    { id: "confirmed", label: "مؤكد" },
    { id: "cancelled", label: "ملغى" },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Search & Filter Controls */}
        <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بكود التذكرة (PASS-)، رقم موبايل اللاعب، اسم الملعب، أو رقم مرجع التحويل..."
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] pr-10 pl-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadBookings()}
              className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-bold text-zinc-200 inline-flex items-center justify-center gap-2 shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 text-primary ${loading ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
              <span>تحديث السجل</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterButtons.map((btn) => {
              const active = statusFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setStatusFilter(btn.id)}
                  className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold transition-all ${
                    active
                      ? "bg-primary text-black border-primary font-black"
                      : "bg-[#0e0e11] text-zinc-300 border-white/[0.08] hover:bg-white/[0.05]"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 States Handling */}
        {loading && bookings.length === 0 ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 rounded-2xl bg-[#141418] border border-white/[0.06]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-[#141418] border border-rose-500/25 p-8 text-center space-y-3">
            <AlertTriangle
              className="h-8 w-8 text-rose-400 mx-auto"
              strokeWidth={1.5}
            />
            <p className="text-sm font-bold text-white">{error}</p>
            <button
              type="button"
              onClick={() => void loadBookings()}
              className="min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-2.5">
            <CalendarClock
              className="h-7 w-7 text-zinc-500 mx-auto"
              strokeWidth={1.5}
            />
            <h3 className="font-display text-base font-bold text-white">
              لا توجد حجوزات مطابقة للبحث
            </h3>
            <p className="text-xs text-zinc-400">
              جرّب تغيير الفلتر أو البحث بكود حجز أو رقم موبايل آخر.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {bookings.map((item) => {
              const statusMeta = BOOKING_STATUS_META[item.status];
              const isBusy = busyId === item.id;
              const isPendingReceipt =
                item.status === "pending_payment" &&
                item.receipt_status === "submitted";
              const isActiveLock =
                item.status === "pending_payment" &&
                item.locked_until !== null &&
                new Date(item.locked_until).getTime() > Date.now();
              const canIntervene =
                item.status === "pending_payment" ||
                item.status === "expired" ||
                item.status === "confirmed";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-[#141418] border p-4 sm:p-5 space-y-3.5 ${
                    isPendingReceipt
                      ? "border-sky-500/35"
                      : "border-white/[0.08]"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          dir="ltr"
                          className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-primary tabular-nums"
                        >
                          {item.booking_reference}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusMeta.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                          />
                          <span>{statusMeta.label}</span>
                        </span>
                        {isPendingReceipt && (
                          <span className="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px] font-bold">
                            إيصال مرفوع ينتظر المراجعة
                          </span>
                        )}
                        {isActiveLock && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                            قفل مؤقت نشط
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-300">
                        <span className="font-bold text-white">
                          {item.venue_name} — {item.court_name}
                        </span>
                        <span className="tabular-nums text-zinc-400">
                          {item.booking_date} • {item.start_time.slice(0, 5)}–
                          {item.end_time.slice(0, 5)}
                        </span>
                        <span className="tabular-nums font-bold text-emerald-400">
                          الإجمالي {item.total_price} ج.م (عربون{" "}
                          {item.deposit_required} ج.م)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                        <span>
                          اللاعب:{" "}
                          <strong className="text-zinc-200">
                            {item.booker_name}
                          </strong>
                        </span>
                        <span dir="ltr" className="tabular-nums text-zinc-300">
                          {item.booker_phone}
                        </span>
                        {item.receipt_reference && (
                          <span className="tabular-nums">
                            مرجع التحويل:{" "}
                            <strong className="text-white">
                              {item.receipt_reference}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={buildWhatsAppUrl(
                          item.booker_phone,
                          `مرحباً كابتن ${item.booker_name}، نتواصل معك من إدارة منصة باصيلي بخصوص حجزك رقم ${item.booking_reference} في ملعب ${item.venue_name}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                        <span>واتساب اللاعب</span>
                      </a>

                      {item.receipt_image_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewBooking(item)}
                          className="min-h-[44px] px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <ZoomIn
                            className="h-4 w-4 text-primary"
                            strokeWidth={1.5}
                          />
                          <span>عرض الإيصال</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {canIntervene && (
                    <div className="pt-3 border-t border-white/[0.06] flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
                      <input
                        type="text"
                        value={reasons[item.id] ?? ""}
                        onChange={(e) =>
                          setReasons((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="سبب التدخل الإداري (إلزامي عند الإلغاء)..."
                        className="flex-1 min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60"
                      />

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {(item.status === "pending_payment" ||
                          item.status === "expired") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAction(item, "force_confirm")}
                            className="min-h-[44px] px-4 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center gap-1.5 transition-all"
                          >
                            {isBusy ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                strokeWidth={2}
                              />
                            ) : (
                              <CheckCircle2
                                className="h-4 w-4"
                                strokeWidth={2}
                              />
                            )}
                            <span>تأكيد الحجز إدارياً</span>
                          </button>
                        )}

                        {item.status === "pending_payment" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAction(item, "release_lock")}
                            className="min-h-[44px] px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/30 text-amber-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
                          >
                            <Unlock className="h-4 w-4" strokeWidth={1.5} />
                            <span>تحرير القفل</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAction(item, "admin_cancel")}
                          className="min-h-[44px] px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 border border-rose-500/30 text-rose-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
                        >
                          <XCircle className="h-4 w-4" strokeWidth={1.5} />
                          <span>إلغاء إداري</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {item.cancellation_reason && item.status === "cancelled" && (
                    <p className="text-xs text-rose-300/90 pt-2 border-t border-white/[0.06]">
                      <span className="font-bold">سبب الإلغاء: </span>
                      {item.cancellation_reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Image Zoom Modal */}
      {previewBooking?.receipt_image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewBooking(null)}
        >
          <div
            className="max-w-2xl w-full rounded-3xl bg-[#141418] border border-white/[0.12] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08]">
              <div>
                <h4 className="font-display text-sm font-black text-white">
                  إيصال حجز {previewBooking.booking_reference} —{" "}
                  {previewBooking.venue_name}
                </h4>
                <p className="text-xs text-emerald-400 font-bold tabular-nums mt-0.5">
                  اللاعب: {previewBooking.booker_name} | المبلغ:{" "}
                  {previewBooking.receipt_amount_paid ??
                    previewBooking.deposit_required}{" "}
                  ج.م
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewBooking.receipt_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                  <span>فتح الأصل</span>
                </a>
                <button
                  type="button"
                  aria-label="إغلاق"
                  onClick={() => setPreviewBooking(null)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 inline-flex items-center justify-center"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#09090b] flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewBooking.receipt_image_url}
                alt={`إيصال حجز ${previewBooking.booking_reference}`}
                className="max-w-full max-h-[68vh] object-contain rounded-xl border border-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
