"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Phone,
  User,
  ShieldCheck,
  Building2,
  Wrench,
  Check,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Printer,
  Repeat,
  Search,
  SunMedium,
  Moon,
  Zap,
  Banknote,
  RotateCcw,
  X,
} from "lucide-react";
import {
  getVenueDateBookings,
  completeBookingAttendance,
  type DashboardCourt,
  type DashboardBooking,
} from "@/lib/api/dashboard";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import CancelBookingModal from "@/components/dashboard/cancel-booking-modal";

export default function DashboardPage() {
  const {
    venues,
    selectedVenue,
    allCourts,
    pendingCount,
    isLoadingVenues,
    venuesError,
    isStaffMode,
    setStaffMode,
    selectedDate,
    setSelectedDate,
    realtimeTick,
    refreshVenues,
    triggerRealtimeRefresh,
    openWalkinModal,
    openRecurringModal,
    openRunningSheetModal,
  } = useDashboard();

  const [selectedCourtId, setSelectedCourtId] = useState<string>("all");
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] =
    useState<DashboardBooking | null>(null);

  useEffect(() => {
    setSelectedCourtId("all");
  }, [selectedVenue?.id]);

  const loadBookings = useCallback(
    async (showRefreshIndicator = false) => {
      if (!selectedVenue?.id) {
        setBookings([]);
        setIsLoadingBookings(false);
        return;
      }
      try {
        setBookingsError(null);
        if (showRefreshIndicator) setIsRefreshing(true);
        const data = await getVenueDateBookings(selectedVenue.id, selectedDate);
        setBookings(data);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "تعذر تحميل جدول الحجوزات";
        setBookingsError(msg);
      } finally {
        setIsLoadingBookings(false);
        if (showRefreshIndicator) setIsRefreshing(false);
      }
    },
    [selectedVenue?.id, selectedDate]
  );

  useEffect(() => {
    void loadBookings();
  }, [loadBookings, realtimeTick]);

  const visibleCourts =
    selectedCourtId === "all"
      ? allCourts
      : allCourts.filter((c) => c.id === selectedCourtId);

  const generateVenueSlots = (court: DashboardCourt) => {
    const slots: { startTime: string; endTime: string; hour: number }[] = [];
    const duration = court.slot_duration_minutes || 60;
    const startHour = 9;
    const endHour = 26;

    for (
      let currentMinute = startHour * 60;
      currentMinute < endHour * 60;
      currentMinute += duration
    ) {
      const h = Math.floor(currentMinute / 60) % 24;
      const m = currentMinute % 60;
      const endTotal = currentMinute + duration;
      const endH = Math.floor(endTotal / 60) % 24;
      const endM = endTotal % 60;

      slots.push({
        startTime: `${String(h).padStart(2, "0")}:${String(m).padStart(
          2,
          "0"
        )}:00`,
        endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(
          2,
          "0"
        )}:00`,
        hour: h,
      });
    }
    return slots;
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

  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  type SlotStatusFilter =
    | "all"
    | "available"
    | "booked"
    | "pending_cash"
    | "completed";
  type SlotPeriodFilter = "all" | "morning" | "evening";

  const [statusFilter, setStatusFilter] = useState<SlotStatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<SlotPeriodFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStartHour, setSelectedStartHour] = useState<string>("all");

  const hasActiveFilters =
    statusFilter !== "all" ||
    periodFilter !== "all" ||
    searchQuery.trim().length > 0 ||
    selectedStartHour !== "all";

  const handleResetFilters = () => {
    setStatusFilter("all");
    setPeriodFilter("all");
    setSearchQuery("");
    setSelectedStartHour("all");
  };

  const availableStartHours = useMemo(() => {
    const hoursMap = new Map<string, string>();
    visibleCourts.forEach((court) => {
      const slots = generateVenueSlots(court);
      slots.forEach((s) => {
        const key = s.startTime.substring(0, 5);
        if (!hoursMap.has(key)) {
          hoursMap.set(key, formatTimeArabic(s.startTime));
        }
      });
    });
    return Array.from(hoursMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [visibleCourts]);

  const currentEgyptHour = useMemo(() => {
    return new Date().getHours();
  }, [realtimeTick]);

  const handleJumpToNow = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate !== todayStr) {
      setSelectedDate(todayStr);
    }
    const targetKey = `${String(currentEgyptHour).padStart(2, "0")}:00`;
    if (selectedStartHour === targetKey) {
      setSelectedStartHour("all");
    } else {
      setSelectedStartHour(targetKey);
      setStatusFilter("all");
      setPeriodFilter("all");
      setSearchQuery("");
    }
  };

  const timetableStats = useMemo(() => {
    let totalSlots = 0;
    let availableSlots = 0;
    let bookedSlots = 0;
    let pendingCashSlots = 0;
    let completedSlots = 0;
    let totalCashRemaining = 0;

    visibleCourts.forEach((court) => {
      const slots = generateVenueSlots(court);
      totalSlots += slots.length;

      slots.forEach((slot) => {
        const booking = bookings.find(
          (b) =>
            b.court_id === court.id &&
            b.start_time.substring(0, 5) === slot.startTime.substring(0, 5)
        );
        if (!booking) {
          availableSlots += 1;
        } else {
          bookedSlots += 1;
          if (booking.status === "completed") {
            completedSlots += 1;
          }
          if ((booking.cash_remaining ?? 0) > 0) {
            pendingCashSlots += 1;
            totalCashRemaining += booking.cash_remaining ?? 0;
          }
        }
      });
    });

    const occupancyRate =
      totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

    return {
      totalSlots,
      availableSlots,
      bookedSlots,
      pendingCashSlots,
      completedSlots,
      totalCashRemaining,
      occupancyRate,
    };
  }, [visibleCourts, bookings]);

  const handleCompleteAttendance = async (bookingId: string) => {
    try {
      setActionError(null);
      setCompletingBookingId(bookingId);
      const res = await completeBookingAttendance(bookingId);
      if (res.success) {
        await loadBookings();
      } else {
        setActionError(res.error || "تعذر تسجيل الحضور");
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setCompletingBookingId(null);
    }
  };

  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  );
  const totalRevenue = activeBookings.reduce((sum, b) => sum + b.total_price, 0);
  const totalCollected = activeBookings.reduce(
    (sum, b) => sum + (b.status === "completed" ? b.total_price : b.deposit_paid),
    0
  );
  const totalCashRemaining = activeBookings.reduce(
    (sum, b) => sum + (b.status === "completed" ? 0 : b.cash_remaining),
    0
  );

  if (venuesError || bookingsError) {
    return (
      <div className="rounded-2xl bg-[#141418] border border-rose-500/30 p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" strokeWidth={1.5} />
        <h2 className="text-base font-black text-white">
          تعذر تحميل جدول التشغيل
        </h2>
        <p className="text-xs text-zinc-400">
          {venuesError || bookingsError}
        </p>
        <button
          type="button"
          onClick={() => {
            void refreshVenues();
            void loadBookings(true);
          }}
          className="inline-flex min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Low Prepaid Balance or Inactive Venue Alerts (Owner Mode Only) */}
      {!isStaffMode && selectedVenue && (
        <>
          {!selectedVenue.is_active && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs sm:text-sm text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 font-bold">
                <AlertCircle
                  className="h-4 w-4 text-rose-400 shrink-0"
                  strokeWidth={1.5}
                />
                <span>
                  تنبيه: هذه المنشأة متوقفة مؤقتاً عن الظهور للجمهور. تأكد من شحن رصيدك أو تواصل مع الإدارة لإعادة التفعيل.
                </span>
              </div>
              <Link
                href="/dashboard/wallet"
                className="min-h-[44px] px-4 rounded-xl bg-rose-500 text-white font-black text-xs inline-flex items-center justify-center shrink-0"
              >
                فتح المحفظة
              </Link>
            </div>
          )}

          {selectedVenue.prepaid_balance <=
            Math.max(30, (selectedVenue.commission_per_slot || 15) * 2) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 font-bold">
                <AlertCircle
                  className="h-4 w-4 text-amber-400 shrink-0"
                  strokeWidth={1.5}
                />
                <span>
                  رصيد محفظتك في باصيلي نزل لـ{" "}
                  <strong className="tabular-nums text-amber-300">
                    {selectedVenue.prepaid_balance} ج.م
                  </strong>
                  . اشحن المحفظة عشان الملاعب تفضل شغالة واستقبال الحجوزات أونلاين ميوقفش.
                </span>
              </div>
              <Link
                href="/dashboard/wallet"
                className="min-h-[44px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs inline-flex items-center justify-center shrink-0 transition-all"
              >
                شحن المحفظة دلوقتي
              </Link>
            </div>
          )}
        </>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-200 underline text-xs"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Operations Toolbar: Date Picker + Quick Ops Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#141418] border border-white/[0.08]">
        {/* Interactive Date Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDateShift(-1)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
            title="اليوم السابق"
            aria-label="اليوم السابق"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedDate(new Date().toISOString().split("T")[0])
            }
            className={`min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all ${
              isToday
                ? "bg-primary text-black font-black"
                : "bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white"
            }`}
          >
            اليوم
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="اختيار التاريخ"
            className="min-h-[44px] px-3.5 rounded-xl bg-[#1c1c1f] border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all tabular-nums"
          />

          <button
            type="button"
            onClick={() => handleDateShift(1)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
            title="اليوم التالي"
            aria-label="اليوم التالي"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() => void loadBookings(true)}
            disabled={isRefreshing}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
            title="تحديث الجدول"
            aria-label="تحديث الجدول"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing ? "animate-spin text-primary" : ""
              }`}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Clear Labelled Operations Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              openRunningSheetModal({ date: selectedDate, bookings })
            }
            className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-xs font-bold text-zinc-200 inline-flex items-center gap-2 transition-all"
          >
            <Printer className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <span>كشف ماتشات النهاردة</span>
          </button>

          {!isStaffMode && (
            <button
              type="button"
              onClick={openRecurringModal}
              className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-xs font-bold text-zinc-200 inline-flex items-center gap-2 transition-all"
            >
              <Repeat className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span>حجز أسبوعي متكرر</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Date Header & Pending Receipts Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span className="font-bold text-white text-sm sm:text-base">
            {formatDateArabic(selectedDate)}
          </span>
        </div>

        {pendingCount > 0 && (
          <Link
            href="/dashboard/receipts"
            className="inline-flex min-h-[36px] items-center gap-2 px-3.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-bold"
          >
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              فيه {pendingCount} إيصالات عربون مستنية مراجعتك
            </span>
          </Link>
        )}
      </div>

      {/* KPI Metrics Strip (Hidden cleanly in Staff Privacy Mode) */}
      {!isStaffMode ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
            <span className="text-[11px] text-zinc-400 font-bold block">
              ماتشات النهاردة المؤكدة
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {activeBookings.length}
              </span>
              <span className="text-xs text-zinc-500">ماتش</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
            <span className="text-[11px] text-zinc-400 font-bold block">
              إجمالي فلوس الحجوزات
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-primary tabular-nums">
                {totalRevenue}
              </span>
              <span className="text-xs text-zinc-500">ج.م</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
            <span className="text-[11px] text-zinc-400 font-bold block">
              الفلوس اللي دخلت الخزنة (عربون + كاش)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
                {totalCollected}
              </span>
              <span className="text-xs text-zinc-500">ج.م</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
            <span className="text-[11px] text-zinc-400 font-bold block">
              باقي الحساب كاش مع الفرق بالملعب
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {totalCashRemaining}
              </span>
              <span className="text-xs text-zinc-500">ج.م</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-4 w-4 text-amber-400 shrink-0"
              strokeWidth={1.5}
            />
            <span className="font-bold">
              وضع خصوصية الموظف شغال — الأرباح والفلوس مخفية عن موظف الدكة.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStaffMode(false)}
            className="text-xs text-amber-400 underline font-bold hover:text-white min-h-[36px]"
          >
            إظهار الأرباح (وضع صاحب الملعب)
          </button>
        </div>
      )}

      {/* Court Filter Pills */}
      {allCourts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCourtId("all")}
            className={`inline-flex min-h-[44px] items-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              selectedCourtId === "all"
                ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
            }`}
          >
            <span>كل الملاعب ({allCourts.length})</span>
          </button>

          {allCourts.map((court) => (
            <button
              key={court.id}
              type="button"
              onClick={() => setSelectedCourtId(court.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                selectedCourtId === court.id
                  ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                  : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
              }`}
            >
              <span>{court.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
                {court.sport === "football" ? "خماسي" : "بادل"}
              </span>
              {!court.is_active && (
                <span
                  className="h-2 w-2 rounded-full bg-amber-500"
                  title="تحت الصيانة"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Schedule Grid States */}
      {isLoadingVenues || isLoadingBookings ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-[#141418]/70 animate-pulse border border-white/[0.06]"
            />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4">
          <Building2
            className="h-10 w-10 text-primary mx-auto"
            strokeWidth={1.5}
          />
          <h2 className="text-base font-black text-white">
            لا توجد منشآت رياضية مربوطة بحسابك حالياً
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            إذا كنت قد قدمت طلب شراكة بالفعل، انتظر اعتماد الإدارة وربط حسابك بالملعب، أو قدّم طلب انضمام جديد.
          </p>
          <Link
            href="/partner"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-5 transition-all"
          >
            تقديم طلب تسجيل ملعب جديد
          </Link>
        </div>
      ) : visibleCourts.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4">
          <Building2
            className="h-10 w-10 text-zinc-500 mx-auto"
            strokeWidth={1.5}
          />
          <h2 className="text-base font-bold text-white">
            لا توجد ملاعب مسجلة في هذه المنشأة
          </h2>
          <p className="text-xs text-zinc-400">
            أضف أول ملعب فرعي من صفحة «الملاعب والأسعار» لبدء استقبال الحجوزات.
          </p>
          <Link
            href="/dashboard/courts"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary text-black font-black text-xs px-5"
          >
            إضافة ملعب فرعي الآن
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timetable Operations & Filters Strip */}
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-sm">
            {/* Top Operations Bar: Search + Start Hour Picker + Jump to Now + Periods */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search by Hour / Player / Phone */}
              <div className="relative flex-1 min-w-[240px]">
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Search className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم الساعة (مثل 9، 10، 08:00) أو اسم اللاعب / الهاتف..."
                  className="w-full min-h-[44px] rounded-xl bg-white/[0.04] border border-white/[0.08] pr-10 pl-10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="مسح البحث"
                    className="absolute inset-y-0 left-3 flex items-center text-zinc-400 hover:text-white"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>

              {/* Start Hour Selector & Quick Jump & Periods */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Select Dropdown for Start Hour */}
                <div className="relative min-w-[170px]">
                  <select
                    value={selectedStartHour}
                    onChange={(e) => setSelectedStartHour(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-white/[0.04] border border-white/[0.08] pr-3.5 pl-9 text-xs font-bold text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                  >
                    <option value="all" className="bg-[#141418] text-white">
                      بداية الساعة: كل الساعات
                    </option>
                    {availableStartHours.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-[#141418] text-white"
                      >
                        يبدأ الساعة {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Jump to 'Now' Button */}
                <button
                  type="button"
                  onClick={handleJumpToNow}
                  title="عرض الماتش الشغال في الساعة الحالية مباشرة"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStartHour ===
                    `${String(currentEgyptHour).padStart(2, "0")}:00`
                      ? "bg-primary text-black shadow-sm font-black"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08]"
                  }`}
                >
                  <Zap
                    className={`h-4 w-4 ${
                      selectedStartHour ===
                      `${String(currentEgyptHour).padStart(2, "0")}:00`
                        ? "text-black fill-black"
                        : "text-primary"
                    }`}
                    strokeWidth={1.5}
                  />
                  <span>
                    دلوقتي (
                    {formatTimeArabic(
                      `${String(currentEgyptHour).padStart(2, "0")}:00:00`
                    )}
                    )
                  </span>
                </button>

                {/* Day Period Toggles (Morning / Evening / All) */}
                <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setPeriodFilter("all")}
                    className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold transition-all ${
                      periodFilter === "all"
                        ? "bg-white/[0.1] text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    كل اليوم
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodFilter("morning")}
                    className={`min-h-[36px] inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      periodFilter === "morning"
                        ? "bg-white/[0.1] text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    title="من 09:00 ص حتى 04:00 م"
                  >
                    <SunMedium
                      className="h-3.5 w-3.5 text-amber-400"
                      strokeWidth={1.5}
                    />
                    <span>الصبح</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodFilter("evening")}
                    className={`min-h-[36px] inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      periodFilter === "evening"
                        ? "bg-white/[0.1] text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    title="من 05:00 م حتى 02:00 ص"
                  >
                    <Moon
                      className="h-3.5 w-3.5 text-indigo-400"
                      strokeWidth={1.5}
                    />
                    <span>بالليل</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Status Filter Tabs with Live Counters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`inline-flex min-h-[40px] items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "all"
                      ? "bg-white/[0.12] text-white border border-white/20 shadow-sm"
                      : "bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.05]"
                  }`}
                >
                  <span>كل المواعيد</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 font-black tabular-nums">
                    {timetableStats.totalSlots}
                  </span>
                </button>

                {/* Available Slots */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("available")}
                  className={`inline-flex min-h-[40px] items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "available"
                      ? "bg-primary/20 text-primary border border-primary/40 shadow-sm"
                      : "bg-white/[0.02] text-zinc-400 hover:text-primary border border-white/[0.05]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span>المواعيد الفاضية</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-black tabular-nums">
                    {timetableStats.availableSlots}
                  </span>
                </button>

                {/* Booked Slots */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("booked")}
                  className={`inline-flex min-h-[40px] items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "booked"
                      ? "bg-white/[0.12] text-white border border-white/20 shadow-sm"
                      : "bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.05]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  <span>المحجوزة</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 font-black tabular-nums">
                    {timetableStats.bookedSlots}
                  </span>
                </button>

                {/* Pending Cash */}
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending_cash")}
                  className={`inline-flex min-h-[40px] items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "pending_cash"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "bg-white/[0.02] text-zinc-400 hover:text-amber-300 border border-white/[0.05]"
                  }`}
                >
                  <Banknote
                    className="h-3.5 w-3.5 text-amber-400"
                    strokeWidth={1.5}
                  />
                  <span>مستحق كاش على الدكة</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black tabular-nums">
                    {timetableStats.pendingCashSlots}
                  </span>
                </button>

                {/* Completed */}
                {timetableStats.completedSlots > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("completed")}
                    className={`inline-flex min-h-[40px] items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
                      statusFilter === "completed"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                        : "bg-white/[0.02] text-zinc-400 hover:text-emerald-400 border border-white/[0.05]"
                    }`}
                  >
                    <Check
                      className="h-3.5 w-3.5 text-emerald-400"
                      strokeWidth={2}
                    />
                    <span>حضروا وسددوا</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black tabular-nums">
                      {timetableStats.completedSlots}
                    </span>
                  </button>
                )}
              </div>

              {/* Quick KPIs & Reset */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                  <span>نسبة الإشغال:</span>
                  <strong className="text-white font-black tabular-nums">
                    {timetableStats.occupancyRate}%
                  </strong>
                </span>

                {!isStaffMode && timetableStats.totalCashRemaining > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    <span>كاش منتظر:</span>
                    <strong className="font-black tabular-nums">
                      {timetableStats.totalCashRemaining.toLocaleString("ar-EG")} ج.م
                    </strong>
                  </span>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex min-h-[36px] items-center gap-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-primary transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>إلغاء الفلاتر</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Courts List */}
          <div className="space-y-8">
            {visibleCourts.map((court) => {
              const courtSlots = generateVenueSlots(court);

              const courtBookedCount = courtSlots.filter((s) =>
                bookings.some(
                  (b) =>
                    b.court_id === court.id &&
                    b.start_time.substring(0, 5) === s.startTime.substring(0, 5)
                )
              ).length;
              const courtAvailableCount =
                courtSlots.length - courtBookedCount;

              const filteredCourtSlots = courtSlots.filter((slot) => {
                const booking = bookings.find(
                  (b) =>
                    b.court_id === court.id &&
                    b.start_time.substring(0, 5) ===
                      slot.startTime.substring(0, 5)
                );
                const isAvailable = !booking;

                // 1. Status Filter
                if (statusFilter === "available" && !isAvailable) return false;
                if (statusFilter === "booked" && isAvailable) return false;
                if (statusFilter === "pending_cash") {
                  if (
                    isAvailable ||
                    !booking ||
                    (booking.cash_remaining ?? 0) <= 0
                  )
                    return false;
                }
                if (statusFilter === "completed") {
                  if (isAvailable || !booking || booking.status !== "completed")
                    return false;
                }

                // 2. Start Hour Picker
                if (selectedStartHour !== "all") {
                  if (slot.startTime.substring(0, 5) !== selectedStartHour)
                    return false;
                }

                // 3. Time Period Filter
                if (periodFilter === "morning") {
                  if (slot.hour < 9 || slot.hour > 16) return false;
                } else if (periodFilter === "evening") {
                  const isEvening =
                    (slot.hour >= 17 && slot.hour <= 23) ||
                    (slot.hour >= 0 && slot.hour <= 2);
                  if (!isEvening) return false;
                }

                // 4. Search Query
                if (searchQuery.trim()) {
                  const q = searchQuery.trim().toLowerCase();
                  const formattedStart = formatTimeArabic(
                    slot.startTime
                  ).toLowerCase();
                  const formattedEnd = formatTimeArabic(
                    slot.endTime
                  ).toLowerCase();
                  const rawStart = slot.startTime.toLowerCase();
                  const hourNum = String(slot.hour);

                  const matchesTime =
                    rawStart.includes(q) ||
                    formattedStart.includes(q) ||
                    formattedEnd.includes(q) ||
                    hourNum === q ||
                    (q === "صبح" && slot.hour < 17) ||
                    (q === "ليل" && (slot.hour >= 17 || slot.hour <= 2));

                  const matchesBooking =
                    booking &&
                    ((booking.booker_name &&
                      booking.booker_name.toLowerCase().includes(q)) ||
                      (booking.booker_phone &&
                        booking.booker_phone.includes(q)));

                  if (!matchesTime && !matchesBooking) return false;
                }

                return true;
              });

              return (
                <div
                  key={court.id}
                  className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 sm:p-6 space-y-4 shadow-sm"
                >
                  {/* Court Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/[0.06] text-primary flex items-center justify-center font-black text-xs">
                        {court.sport === "football" ? "5V5" : "PAD"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-black text-white">
                            {court.name}
                          </h2>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-white/[0.03] px-2 py-0.5 rounded-md">
                            <span className="text-primary font-bold tabular-nums">
                              {courtAvailableCount} فاضي
                            </span>
                            <span>•</span>
                            <span className="text-zinc-300 font-bold tabular-nums">
                              {courtBookedCount} محجوز
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-zinc-400 block mt-0.5">
                          {court.surface === "turf_3g"
                            ? "نجيل صناعي تركي"
                            : court.surface === "natural_grass"
                            ? "نجيل طبيعي"
                            : "زجاج بانوراما"}{" "}
                          • مدة الحجز {court.slot_duration_minutes} دقيقة
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!court.is_active ? (
                        <Link
                          href="/dashboard/courts"
                          className="inline-flex min-h-[36px] items-center gap-1.5 px-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-all"
                        >
                          <Wrench className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>صيانة حالياً</span>
                        </Link>
                      ) : (
                        <span className="inline-flex min-h-[36px] items-center gap-1.5 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          <span>شغال ومتاح</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openWalkinModal({
                            courtId: court.id,
                            startTime: "18:00",
                            date: selectedDate,
                          })
                        }
                        className="inline-flex min-h-[44px] items-center gap-1.5 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-200 transition-all"
                      >
                        <Plus
                          className="h-3.5 w-3.5 text-primary"
                          strokeWidth={2}
                        />
                        <span>حجز كاش سريع</span>
                      </button>
                    </div>
                  </div>

                  {/* Empty state when filters return 0 slots for this court */}
                  {filteredCourtSlots.length === 0 ? (
                    <div className="text-center py-10 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] space-y-2.5">
                      <div className="h-9 w-9 rounded-full bg-white/[0.04] text-zinc-400 mx-auto flex items-center justify-center">
                        <Search className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white">
                        لا توجد مواعيد تطابق الفلتر أو البحث المحدد في هذا الملعب
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        جرب إزالة كلمات البحث أو تغيير فلتر الساعة للوصول للمواعيد المتاحة.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex min-h-[38px] items-center gap-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-primary transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>إلغاء الفلاتر وعرض الكل</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Slots Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredCourtSlots.map((slot) => {
                        const booking = bookings.find(
                          (b) =>
                            b.court_id === court.id &&
                            b.start_time.substring(0, 5) ===
                              slot.startTime.substring(0, 5)
                        );
                        const isAvailable = !booking;
                        const isPeak =
                          slot.hour >=
                          parseInt(court.peak_hour_start.split(":")[0], 10);
                        const slotPrice = isPeak
                          ? court.price_evening
                          : court.price_morning;
                        const isSlotNow =
                          isToday && slot.hour === currentEgyptHour;

                        return (
                          <div
                            key={`${court.id}-${slot.startTime}`}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between relative ${
                              isSlotNow
                                ? "ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] "
                                : ""
                            }${
                              !court.is_active
                                ? "bg-[#1c1c1f]/40 border-white/[0.04] opacity-50"
                                : isAvailable
                                ? "bg-[#1c1c1f]/60 hover:bg-[#1c1c1f] border-white/[0.06] hover:border-primary/40"
                                : booking?.status === "completed"
                                ? "bg-emerald-950/20 border-emerald-500/30"
                                : booking?.status === "confirmed"
                                ? "bg-primary/5 border-primary/30"
                                : "bg-amber-500/5 border-amber-500/30"
                            }`}
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                              <div className="flex items-center gap-2">
                                <Clock
                                  className="h-4 w-4 text-zinc-400"
                                  strokeWidth={1.5}
                                />
                                <span className="text-xs font-black text-white tabular-nums">
                                  {formatTimeArabic(slot.startTime)} —{" "}
                                  {formatTimeArabic(slot.endTime)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {isSlotNow && (
                                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    <span>شغال دلوقتي</span>
                                  </span>
                                )}

                                {!court.is_active ? (
                                  <span className="text-[10px] font-bold text-zinc-500">
                                    صيانة
                                  </span>
                                ) : isAvailable ? (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">
                                    فاضي ({slotPrice} ج.م)
                                  </span>
                                ) : booking?.status === "completed" ? (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check className="h-3 w-3" strokeWidth={2} />
                                    <span>حضروا وسددوا</span>
                                  </span>
                                ) : booking?.status === "confirmed" ? (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>
                                      {booking.is_walkin
                                        ? "كاش على الدكة"
                                        : "محجوز أونلاين"}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    <span>مستني مراجعة العربون</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="py-2.5">
                              {isAvailable ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWalkinModal({
                                      courtId: court.id,
                                      startTime: slot.startTime.substring(0, 5),
                                      date: selectedDate,
                                    })
                                  }
                                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition-all"
                                >
                                  <Plus
                                    className="h-3.5 w-3.5 text-primary"
                                    strokeWidth={2}
                                  />
                                  <span>احجز كاش سريع للفرقة دي</span>
                                </button>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-white flex items-center gap-1.5 truncate max-w-[150px]">
                                      <User
                                        className="h-3.5 w-3.5 text-zinc-400 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      {booking?.booker_name}
                                    </span>

                                    <a
                                      href={`tel:${booking?.booker_phone}`}
                                      className="text-zinc-300 hover:text-white text-[11px] font-bold tabular-nums flex items-center gap-1 bg-white/[0.04] px-2.5 py-1.5 rounded-lg min-h-[34px]"
                                    >
                                      <Phone
                                        className="h-3 w-3 text-primary"
                                        strokeWidth={1.5}
                                      />
                                      <span dir="ltr">
                                        {booking?.booker_phone}
                                      </span>
                                    </a>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.04]">
                                    <span className="text-zinc-400">
                                      العربون المدفوع:{" "}
                                      <strong className="text-white tabular-nums">
                                        {booking?.deposit_paid} ج.م
                                      </strong>
                                    </span>
                                    <span className="text-zinc-400">
                                      الباقي كاش:{" "}
                                      <strong
                                        className={`tabular-nums ${
                                          booking?.cash_remaining === 0
                                            ? "text-zinc-500"
                                            : "text-amber-400 font-bold"
                                        }`}
                                      >
                                        {booking?.cash_remaining} ج.م
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {!isAvailable && booking && (
                              <div className="pt-2 border-t border-white/[0.04]">
                                {booking.status === "completed" ? (
                                  <div className="text-center py-1">
                                    <span className="text-[11px] text-zinc-500 font-bold">
                                      الماتش خلص واستلمنا الكاش تمام
                                    </span>
                                  </div>
                                ) : booking.status === "confirmed" ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={
                                        completingBookingId === booking.id
                                      }
                                      onClick={() =>
                                        void handleCompleteAttendance(
                                          booking.id
                                        )
                                      }
                                      className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-xs font-bold text-primary hover:text-white transition-all disabled:opacity-50"
                                    >
                                      <CheckCircle2
                                        className="h-3.5 w-3.5"
                                        strokeWidth={1.5}
                                      />
                                      <span>
                                        {completingBookingId === booking.id
                                          ? "بنحدث البيانات..."
                                          : `حضروا واستلم الباقي (${booking.cash_remaining} ج.م)`}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCancellingBooking(booking)
                                      }
                                      title="إلغاء الحجز وتفريغ الساعة"
                                      aria-label="إلغاء الحجز"
                                      className="min-h-[44px] min-w-[44px] rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center shrink-0 border border-destructive/20 transition-all"
                                    >
                                      <XCircle
                                        className="h-4 w-4"
                                        strokeWidth={1.5}
                                      />
                                    </button>
                                  </div>
                                ) : (
                                  <Link
                                    href="/dashboard/receipts"
                                    className="w-full inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold text-amber-300 transition-all"
                                  >
                                    <AlertCircle
                                      className="h-3.5 w-3.5 text-amber-400"
                                      strokeWidth={1.5}
                                    />
                                    <span>مراجعة إيصال التحويل</span>
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CancelBookingModal
        isOpen={Boolean(cancellingBooking)}
        booking={cancellingBooking}
        onClose={() => setCancellingBooking(null)}
        onCancelSuccess={triggerRealtimeRefresh}
      />
    </div>
  );
}
