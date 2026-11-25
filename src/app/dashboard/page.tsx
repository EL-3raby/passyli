"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Phone,
  User,
  Banknote,
  ShieldCheck,
  Building2,
  Wrench,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  getDashboardVenues,
  getVenueDateBookings,
  getPendingReceipts,
  completeBookingAttendance,
  type DashboardVenue,
  type DashboardCourt,
  type DashboardBooking,
} from "@/lib/api/dashboard";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import WalkinModal from "@/components/dashboard/walkin-modal";
import MaintenanceModal from "@/components/dashboard/maintenance-modal";
import SearchModal from "@/components/dashboard/search-modal";
import CancelBookingModal from "@/components/dashboard/cancel-booking-modal";
import DailyRunningSheetModal from "@/components/dashboard/daily-running-sheet-modal";
import WalletModal from "@/components/dashboard/wallet-modal";
import PrepaidWalletModal from "@/components/dashboard/prepaid-wallet-modal";
import StaffPinModal from "@/components/dashboard/staff-pin-modal";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStaffMode, setIsStaffMode] = useState<boolean>(false);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);

  // Modals state
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [walkinCourtId, setWalkinCourtId] = useState<string | undefined>(undefined);
  const [walkinStartTime, setWalkinStartTime] = useState<string | undefined>(undefined);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isPrepaidOpen, setIsPrepaidOpen] = useState(false);
  const [isStaffPinOpen, setIsStaffPinOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<DashboardBooking | null>(null);

  // Load venues on mount
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const vList = await getDashboardVenues();
      setVenues(vList);
      if (vList.length > 0) {
        setSelectedVenueId(vList[0].id);
      }
      const pending = await getPendingReceipts();
      setPendingCount(pending.length);
      setIsLoading(false);
    }
    init();
  }, []);

  // Fetch bookings whenever venue or date changes
  const loadBookings = useCallback(
    async (showRefreshIndicator = false) => {
      if (!selectedVenueId) return;
      if (showRefreshIndicator) setIsRefreshing(true);
      const data = await getVenueDateBookings(selectedVenueId, selectedDate);
      setBookings(data);
      const pending = await getPendingReceipts(selectedVenueId);
      setPendingCount(pending.length);
      if (showRefreshIndicator) setIsRefreshing(false);
    },
    [selectedVenueId, selectedDate]
  );

  useEffect(() => {
    if (selectedVenueId) {
      loadBookings();
    }
  }, [selectedVenueId, selectedDate, loadBookings]);

  // Supabase Realtime WebSocket subscription for live slot & receipt updates
  useEffect(() => {
    if (!selectedVenueId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`venue_${selectedVenueId}_realtime`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts" },
        () => {
          loadBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venues" },
        () => {
          getDashboardVenues().then((vList) => setVenues(vList));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_wallet_transactions" },
        () => {
          getDashboardVenues().then((vList) => setVenues(vList));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedVenueId, loadBookings]);

  // Current selected venue and courts
  const currentVenue = venues.find((v) => v.id === selectedVenueId) || venues[0];
  const allCourts = currentVenue?.courts || [];
  const visibleCourts =
    selectedCourtId === "all"
      ? allCourts
      : allCourts.filter((c) => c.id === selectedCourtId);

  // Generate 24-hour slots according to venue opening/closing
  const generateVenueSlots = (court: DashboardCourt) => {
    const slots: { startTime: string; endTime: string; hour: number }[] = [];
    const duration = court.slot_duration_minutes || 60;
    
    // Operating hours: 09:00 to 02:00 (next day) -> 17 operating hours
    const startHour = 9;
    const endHour = 26; // 02:00 AM next day is represented as 26

    for (let currentMinute = startHour * 60; currentMinute < endHour * 60; currentMinute += duration) {
      const h = Math.floor(currentMinute / 60) % 24;
      const m = currentMinute % 60;
      const endTotal = currentMinute + duration;
      const endH = Math.floor(endTotal / 60) % 24;
      const endM = endTotal % 60;

      const startTimeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;

      slots.push({
        startTime: startTimeStr,
        endTime: endTimeStr,
        hour: h,
      });
    }

    return slots;
  };

  // Format 24h time to Arabic display
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

  // Format date to Arabic
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

  // Date navigation helpers
  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Action: Complete Attendance
  const handleCompleteAttendance = async (bookingId: string) => {
    try {
      setCompletingBookingId(bookingId);
      const res = await completeBookingAttendance(bookingId);
      if (res.success) {
        await loadBookings();
      } else {
        alert(res.error || "تعذر تسجيل الحضور");
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ");
    } finally {
      setCompletingBookingId(null);
    }
  };

  // Calculate daily financial stats
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

  return (
    <div className="min-h-screen bg-[#09090b] pb-24 text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Top Navbar */}
      <DashboardHeader
        venuesCount={venues.length}
        pendingReceiptsCount={pendingCount}
        isStaffMode={isStaffMode}
        prepaidBalance={currentVenue?.prepaid_balance}
        commissionPerSlot={currentVenue?.commission_per_slot}
        onToggleStaffMode={() => setIsStaffMode((prev) => !prev)}
        onOpenWalkin={() => {
          setWalkinCourtId(visibleCourts[0]?.id);
          setWalkinStartTime("18:00");
          setIsWalkinOpen(true);
        }}
        onOpenMaintenance={() => setIsMaintenanceOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenRunningSheet={() => setIsSheetOpen(true)}
        onOpenWallets={() => setIsWalletOpen(true)}
        onOpenPrepaidWallet={() => setIsPrepaidOpen(true)}
        onOpenStaffPin={() => setIsStaffPinOpen(true)}
      />

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6" dir="rtl">

        {/* Low Prepaid Balance or Inactive Venue Alert (Owner Mode Only) */}
        {!isStaffMode && currentVenue && (
          <>
            {!currentVenue.is_active && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs sm:text-sm text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-bold">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />
                  <span>
                    تنبيه: هذا الملعب متوقف مؤقتاً عن الظهور للجمهور. تأكد من شحن رصيدك أو تواصل مع الإدارة لإعادة التفعيل.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrepaidOpen(true)}
                  className="min-h-[40px] px-4 rounded-xl bg-rose-500 text-white font-black text-xs shrink-0"
                >
                  فتح محفظة باصيلي
                </button>
              </div>
            )}

            {currentVenue.prepaid_balance <= Math.max(30, (currentVenue.commission_per_slot || 15) * 2) && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-bold">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />
                  <span>
                    انخفض رصيد محفظة باصيلي إلى{" "}
                    <strong className="tabular-nums text-amber-300">
                      {currentVenue.prepaid_balance} ج.م
                    </strong>
                    . اشحن الرصيد الآن لضمان عدم توقف استقبال حجوزات اللاعبين أونلاين.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrepaidOpen(true)}
                  className="min-h-[40px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs shrink-0 transition-all"
                >
                  شحن الرصيد الآن
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Top Control Bar: Venue Picker + Date Navigation */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#141418] border border-white/[0.08] shadow-sm">
          
          {/* Venue Selector */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block font-bold">المنشأة الرياضية</span>
              <select
                value={selectedVenueId}
                onChange={(e) => {
                  setSelectedVenueId(e.target.value);
                  setSelectedCourtId("all");
                }}
                className="bg-transparent text-sm sm:text-base font-black text-white focus:outline-none cursor-pointer pr-1"
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id} className="bg-[#1c1c1f] text-white">
                    {venue.name} — {venue.city} ({venue.district})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Date Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDateShift(-1)}
              className="h-10 w-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              title="اليوم السابق"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all ${
                isToday
                  ? "bg-primary text-black font-black"
                  : "bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white"
              }`}
            >
              اليوم
            </button>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 px-3.5 rounded-xl bg-[#1c1c1f] border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all tabular-nums"
              />
            </div>

            <button
              type="button"
              onClick={() => handleDateShift(1)}
              className="h-10 w-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
              title="اليوم التالي"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => loadBookings(true)}
              disabled={isRefreshing}
              className="h-10 w-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
              title="تحديث الجدول"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`}
                strokeWidth={1.5}
              />
            </button>
          </div>

        </div>

        {/* Selected Date Header Note */}
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="font-bold text-white text-sm sm:text-base">
              {formatDateArabic(selectedDate)}
            </span>
          </div>

          {/* Pending receipts alert pill */}
          {pendingCount > 0 && (
            <Link
              href="/dashboard/receipts"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-bold"
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
              <span>يوجد {pendingCount} إيصال تحويل بانتظار المراجعة والاعتماد</span>
            </Link>
          )}
        </div>

        {/* Financial & Operational Summary Banner (Hidden in Staff Mode) */}
        {!isStaffMode ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
              <span className="text-[11px] text-zinc-400 font-bold block">ماتشات اليوم المؤكدة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                  {activeBookings.length}
                </span>
                <span className="text-xs text-zinc-500 font-normal">ماتش</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
              <span className="text-[11px] text-zinc-400 font-bold block">إجمالي القيمة الإيجارية</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-primary tabular-nums">
                  {totalRevenue}
                </span>
                <span className="text-xs text-zinc-500 font-normal">ج.م</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
              <span className="text-[11px] text-zinc-400 font-bold block">المحصل فعلياً (عربونات + كاش)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
                  {totalCollected}
                </span>
                <span className="text-xs text-zinc-500 font-normal">ج.م</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-1">
              <span className="text-[11px] text-zinc-400 font-bold block">المتبقي تحصيله بالملعب</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                  {totalCashRemaining}
                </span>
                <span className="text-xs text-zinc-500 font-normal">ج.م</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />
              <span className="font-bold">
                وضع موظف الاستقبال نشط — تم إخفاء الإحصائيات المالية وصافي الأرباح لضمان سرية البيانات.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStaffMode(false)}
              className="text-xs text-amber-400 underline font-bold hover:text-white"
            >
              تبديل لوضع المالك
            </button>
          </div>
        )}

        {/* Court Tabs Selector */}
        {allCourts.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCourtId("all")}
              className={`inline-flex min-h-[40px] items-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                selectedCourtId === "all"
                  ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                  : "bg-[#141418] text-zinc-400 hover:text-white border border-white/[0.06]"
              }`}
            >
              <span>جميع الملاعب ({allCourts.length})</span>
            </button>

            {allCourts.map((court) => (
              <button
                key={court.id}
                type="button"
                onClick={() => setSelectedCourtId(court.id)}
                className={`inline-flex min-h-[40px] items-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
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
                  <span className="h-2 w-2 rounded-full bg-amber-500" title="تحت الصيانة" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Timeline Schedules */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-[#141418]/60 animate-pulse border border-white/[0.06]"
              />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-16 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4">
            <Building2 className="h-10 w-10 text-primary mx-auto" strokeWidth={1.5} />
            <h4 className="text-base font-black text-white">
              لا توجد منشآت رياضية مربوطة بحسابك حالياً
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              إذا كنت قد قدمت طلب شراكة بالفعل، انتظر اعتماد الإدارة وربط حسابك بالملعب، أو سجّل منشأتك الآن.
            </p>
            <Link
              href="/partner"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-5 transition-all"
            >
              تقديم طلب تسجيل ملعب جديد
            </Link>
          </div>
        ) : visibleCourts.length === 0 ? (
          <div className="text-center py-16 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-3">
            <Building2 className="h-10 w-10 text-zinc-600 mx-auto" strokeWidth={1.5} />
            <h4 className="text-base font-bold text-white">لا توجد ملاعب مسجلة في هذه المنشأة</h4>
            <p className="text-xs text-zinc-400">
              يرجى إضافة ملاعب فرعية للمنشأة لعرض الجدول الزمني للحجوزات.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {visibleCourts.map((court) => {
              const courtSlots = generateVenueSlots(court);

              return (
                <div
                  key={court.id}
                  className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 sm:p-6 space-y-4 shadow-sm"
                >
                  {/* Court Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/[0.06] text-primary flex items-center justify-center font-black">
                        {court.sport === "football" ? "5V5" : "PAD"}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-white">
                          {court.name}
                        </h3>
                        <span className="text-[11px] text-zinc-400 block">
                          {court.surface === "turf_3g" ? "نجيل صناعي تركي" : "زجاج بانوراما"} •{" "}
                          مدة الحجز {court.slot_duration_minutes} دقيقة
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!court.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
                          <Wrench className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                          <span>معطل للصيانة</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          <span>نشط ومتاح</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setWalkinCourtId(court.id);
                          setWalkinStartTime("18:00");
                          setIsWalkinOpen(true);
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-200 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                        <span>حجز كاش</span>
                      </button>
                    </div>
                  </div>

                  {/* Slots Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {courtSlots.map((slot) => {
                      // Match with booking on this court and time
                      const booking = bookings.find(
                        (b) =>
                          b.court_id === court.id &&
                          b.start_time.substring(0, 5) === slot.startTime.substring(0, 5)
                      );

                      const isAvailable = !booking;
                      const isPeak =
                        slot.hour >= parseInt(court.peak_hour_start.split(":")[0], 10);
                      const slotPrice = isPeak ? court.price_evening : court.price_morning;

                      return (
                        <div
                          key={`${court.id}-${slot.startTime}`}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
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
                          {/* Slot Time & Status */}
                          <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                              <span className="text-xs font-black text-white tabular-nums">
                                {formatTimeArabic(slot.startTime)} — {formatTimeArabic(slot.endTime)}
                              </span>
                            </div>

                            {/* Status Badges */}
                            {!court.is_active ? (
                              <span className="text-[10px] font-bold text-zinc-500">
                                صيانة
                              </span>
                            ) : isAvailable ? (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                متاح ({slotPrice} ج.م)
                              </span>
                            ) : booking?.status === "completed" ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="h-3 w-3" strokeWidth={2} />
                                <span>حضر وسدد</span>
                              </span>
                            ) : booking?.status === "confirmed" ? (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>{booking.is_walkin ? "كاش محلي" : "مؤكد أونلاين"}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>إيصال معلق</span>
                              </span>
                            )}
                          </div>

                          {/* Slot Content Body */}
                          <div className="py-2.5">
                            {isAvailable ? (
                              <div className="text-center py-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWalkinCourtId(court.id);
                                    setWalkinStartTime(slot.startTime.substring(0, 5));
                                    setIsWalkinOpen(true);
                                  }}
                                  className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition-all"
                                >
                                  <Plus className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                                  <span>قفل كاش فوري للفرقة</span>
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {/* Booker Details */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-white flex items-center gap-1.5 truncate max-w-[150px]">
                                    <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                                    {booking?.booker_name}
                                  </span>

                                  <a
                                    href={`tel:${booking?.booker_phone}`}
                                    className="text-zinc-400 hover:text-white text-[11px] font-bold tabular-nums flex items-center gap-1 bg-white/[0.04] px-2 py-1 rounded-lg"
                                  >
                                    <Phone className="h-3 w-3 text-primary" strokeWidth={1.5} />
                                    <span dir="ltr">{booking?.booker_phone}</span>
                                  </a>
                                </div>

                                {/* Financial Settlement Row */}
                                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.04]">
                                  <span className="text-zinc-400">
                                    المدفوع:{" "}
                                    <strong className="text-white tabular-nums">
                                      {booking?.deposit_paid} ج.م
                                    </strong>
                                  </span>
                                  <span className="text-zinc-400">
                                    المتبقي:{" "}
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

                          {/* Quick Action Footer for Booked Slots */}
                          {!isAvailable && booking && (
                            <div className="pt-2 border-t border-white/[0.04]">
                              {booking.status === "completed" ? (
                                <div className="text-center py-1">
                                  <span className="text-[11px] text-zinc-500 font-bold">
                                    تم استلام الكاش وإنهاء الماتش
                                  </span>
                                </div>
                              ) : booking.status === "confirmed" ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={completingBookingId === booking.id}
                                    onClick={() => handleCompleteAttendance(booking.id)}
                                    className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-xs font-bold text-primary hover:text-white transition-all disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                    <span>
                                      {completingBookingId === booking.id
                                        ? "جاري التسجيل..."
                                        : `حضر واستلم المتبقي (${booking.cash_remaining} ج.م)`}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setCancellingBooking(booking)}
                                    title="إلغاء الحجز وتحرير الساعة"
                                    className="h-[38px] w-[38px] rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center shrink-0 border border-destructive/20 transition-all"
                                  >
                                    <XCircle className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                </div>
                              ) : (
                                <Link
                                  href="/dashboard/receipts"
                                  className="w-full inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold text-amber-300 transition-all"
                                >
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                                  <span>مراجعة إيصال التحويل</span>
                                </Link>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Modals */}
      <WalkinModal
        isOpen={isWalkinOpen}
        onClose={() => setIsWalkinOpen(false)}
        courts={allCourts}
        initialCourtId={walkinCourtId}
        initialDate={selectedDate}
        initialStartTime={walkinStartTime}
        onBookingSuccess={() => {
          loadBookings();
        }}
      />

      <MaintenanceModal
        isOpen={isMaintenanceOpen}
        onClose={() => setIsMaintenanceOpen(false)}
        courts={allCourts}
        onMaintenanceSuccess={() => {
          // reload venues and bookings
          getDashboardVenues().then((vList) => setVenues(vList));
          loadBookings();
        }}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        venueId={selectedVenueId}
        onSelectBookingDate={(d) => {
          setSelectedDate(d);
        }}
      />

      <CancelBookingModal
        isOpen={!!cancellingBooking}
        booking={cancellingBooking}
        onClose={() => setCancellingBooking(null)}
        onCancelSuccess={() => {
          loadBookings();
        }}
      />

      <DailyRunningSheetModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        venueName={currentVenue?.name || "الملعب"}
        date={selectedDate}
        bookings={bookings}
        courts={allCourts}
      />

      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        venue={currentVenue}
        onSuccess={() => {
          getDashboardVenues().then((vList) => setVenues(vList));
        }}
      />

      <PrepaidWalletModal
        isOpen={isPrepaidOpen}
        onClose={() => setIsPrepaidOpen(false)}
        venue={currentVenue}
        onRechargeSubmitted={() => {
          getDashboardVenues().then((vList) => setVenues(vList));
        }}
      />

      <StaffPinModal
        isOpen={isStaffPinOpen}
        onClose={() => setIsStaffPinOpen(false)}
        venue={currentVenue}
      />
    </div>
  );
}
