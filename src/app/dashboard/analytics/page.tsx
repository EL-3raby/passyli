"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Star,
  Building2,
  Sliders,
  DollarSign,
  PieChart,
  Activity,
  Printer,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Banknote,
  Sparkles,
  SunMedium,
  Moon,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  getVenueAnalytics,
  type VenueAnalyticsData,
  type VenueCourtAnalyticsItem,
} from "@/lib/api/dashboard";

type DatePreset = "today" | "week" | "month" | "custom";

export default function DashboardAnalyticsPage() {
  const {
    selectedVenue,
    isLoadingVenues,
    venuesError,
    isStaffMode,
    realtimeTick,
    refreshVenues,
  } = useDashboard();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [preset, setPreset] = useState<DatePreset>("today");
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [dailyViewMode, setDailyViewMode] = useState<"chart" | "table">("chart");
  const [hourlyViewMode, setHourlyViewMode] = useState<"grid" | "chart">("grid");

  const [analytics, setAnalytics] = useState<VenueAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Apply quick date preset
  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const now = new Date();

    if (newPreset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (newPreset === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      setStartDate(weekAgo.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (newPreset === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(monthStart.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  const loadData = useCallback(
    async (showIndicator = false) => {
      if (!selectedVenue?.id) {
        setAnalytics(null);
        setIsLoading(false);
        return;
      }
      try {
        setError(null);
        if (showIndicator) setIsRefreshing(true);
        const data = await getVenueAnalytics(
          selectedVenue.id,
          startDate,
          endDate
        );
        if (!data.success) {
          setError(data.error || "تعذر تحميل إحصائيات المنشأة");
        } else {
          setAnalytics(data);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الجلب"
        );
      } finally {
        setIsLoading(false);
        if (showIndicator) setIsRefreshing(false);
      }
    },
    [selectedVenue?.id, startDate, endDate]
  );

  useEffect(() => {
    void loadData();
  }, [loadData, realtimeTick]);

  // Export Analytics to CSV
  const handleExportCSV = () => {
    if (!analytics || !selectedVenue) return;

    const headers = [
      "التاريخ",
      "عدد الماتشات",
      "إجمالي الإيراد (ج.م)",
      "المحصل فعلياً (ج.م)",
      "المتبقي كاش (ج.م)",
    ];

    const rows = analytics.daily_timeline.map((d) => [
      d.date,
      d.bookings_count.toString(),
      d.gross_revenue.toString(),
      d.collected_revenue.toString(),
      d.pending_cash.toString(),
    ]);

    const csvContent =
      "\uFEFF" +
      [
        `تقرير أداء منشأة: ${selectedVenue.name}`,
        `الفترة: من ${startDate} إلى ${endDate}`,
        "",
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `passyli_analytics_${selectedVenue.slug}_${startDate}_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isStaffMode) {
    return (
      <div className="rounded-3xl bg-[#141418] border border-white/[0.08] p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
          <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-lg font-black text-white">
          وضع خصوصية الموظفين مفعّل
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          البيانات المالية وتقارير الأرباح مخفية في وضع الاستقبال لحماية سرية
          حسابات المنشأة. يمكنك تعطيل وضع الخصوصية من الشريط العلوي لاستعراض
          التقارير.
        </p>
      </div>
    );
  }

  if (venuesError || error) {
    return (
      <div className="rounded-2xl bg-[#141418] border border-rose-500/30 p-8 text-center space-y-4">
        <AlertCircle
          className="h-10 w-10 text-rose-400 mx-auto"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-black text-white">
          تعذر تحميل تقارير الأداء
        </h2>
        <p className="text-xs text-zinc-400">{venuesError || error}</p>
        <button
          type="button"
          onClick={() => {
            void refreshVenues();
            void loadData(true);
          }}
          className="inline-flex min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  const summary = analytics?.summary;
  const courts = analytics?.courts_breakdown || [];
  const hourly = analytics?.hourly_distribution || [];
  const channels = analytics?.channel_split;
  const payments = analytics?.payment_methods;
  const ratings = analytics?.ratings_summary;

  const maxHourlyCount = Math.max(
    ...hourly.map((h) => h.bookings_count),
    1
  );

  return (
    <div className="space-y-6">
      {/* Top Filter & Operations Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-3xl bg-[#141418] border border-white/[0.08]">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 ml-1">
            نطاق التقرير:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#1c1c1f] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => handlePresetChange("today")}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-black transition-all ${
                preset === "today"
                  ? "bg-primary text-black shadow-md shadow-primary/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("week")}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-black transition-all ${
                preset === "week"
                  ? "bg-primary text-black shadow-md shadow-primary/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("month")}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-black transition-all ${
                preset === "month"
                  ? "bg-primary text-black shadow-md shadow-primary/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => setPreset("custom")}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-black transition-all ${
                preset === "custom"
                  ? "bg-primary text-black shadow-md shadow-primary/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              مخصص
            </button>
          </div>
        </div>

        {/* Date Inputs & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl bg-[#1c1c1f] border border-white/10 text-xs text-white font-bold tabular-nums focus:outline-none focus:border-primary"
              />
              <span className="text-zinc-500 text-xs">إلى</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl bg-[#1c1c1f] border border-white/10 text-xs text-white font-bold tabular-nums focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
            title="تحديث الأرقام"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing ? "animate-spin text-primary" : ""
              }`}
              strokeWidth={1.5}
            />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!analytics || courts.length === 0}
            className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] text-xs font-bold text-zinc-200 inline-flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-3xl bg-[#141418] border border-white/[0.08] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400">
              إجمالي القيمة الإيجارية
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {summary ? summary.gross_revenue.toLocaleString("en-US") : "0"}
            </span>
            <span className="text-xs text-zinc-500 font-bold">ج.م</span>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>
              متوسط سعر الماتش:{" "}
              <strong className="text-zinc-300 tabular-nums">
                {summary?.avg_booking_price || 0} ج.م
              </strong>
            </span>
          </p>
        </div>

        {/* Collected Revenue */}
        <div className="p-5 rounded-3xl bg-[#141418] border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400">
              المحصّل فعلياً
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
              {summary ? summary.collected_revenue.toLocaleString("en-US") : "0"}
            </span>
            <span className="text-xs text-zinc-500 font-bold">ج.م</span>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>عربونات أونلاين + كاش الماتشات المكتملة</span>
          </p>
        </div>

        {/* Pending Cash on Pitch */}
        <div className="p-5 rounded-3xl bg-[#141418] border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400">
              متبقي تحصيله كاش بالملعب
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Banknote className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              {summary ? summary.pending_cash.toLocaleString("en-US") : "0"}
            </span>
            <span className="text-xs text-zinc-500 font-bold">ج.م</span>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>مستحق من الفرق عند وصولهم</span>
          </p>
        </div>

        {/* Occupancy / Utilization Rate (Hours + Positive Gauge) */}
        {(() => {
          const safeOccupancy = Math.max(0, Math.min(100, summary?.occupancy_rate ?? 0));
          const bookedHours = Math.max(0, summary?.total_booked_hours ?? 0);
          const activeCourtsCount = courts.length || 1;
          const daysCount = (() => {
            try {
              const s = new Date(startDate).getTime();
              const e = new Date(endDate).getTime();
              return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
            } catch {
              return 1;
            }
          })();
          const totalOperatingHours = Math.max(activeCourtsCount * daysCount * 16, Math.ceil(bookedHours));
          const remainingHours = Math.max(0, totalOperatingHours - Math.round(bookedHours));

          return (
            <div className="p-5 rounded-3xl bg-[#141418] border border-white/[0.08] relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400">
                  ساعات تشغيل الملاعب
                </span>
                <div
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 border ${
                    safeOccupancy >= 75
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : safeOccupancy >= 40
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      safeOccupancy >= 75
                        ? "bg-emerald-400 animate-pulse"
                        : safeOccupancy >= 40
                        ? "bg-cyan-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span>
                    {safeOccupancy >= 75
                      ? "إقبال ممتاز"
                      : safeOccupancy >= 40
                      ? "تشغيل مستقر"
                      : "ساعات هادئة"}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl sm:text-3xl font-black text-cyan-400 tabular-nums">
                  {bookedHours}
                </span>
                <span className="text-xs text-zinc-400 font-bold">
                  من {totalOperatingHours} ساعة ({safeOccupancy}%)
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    safeOccupancy >= 75
                      ? "bg-emerald-400"
                      : safeOccupancy >= 40
                      ? "bg-cyan-400"
                      : "bg-amber-400"
                  }`}
                  style={{
                    width: `${safeOccupancy}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 flex items-center justify-between">
                <span>
                  {remainingHours > 0
                    ? `متبقي ${remainingHours} ساعة شاغرة`
                    : "تم استغلال كامل الساعات المتاحة"}
                </span>
                <span className="text-zinc-400 font-bold tabular-nums">
                  {summary?.total_bookings || 0} ماتش
                </span>
              </p>
            </div>
          );
        })()}
      </div>

      {/* Courts Breakdown Section (Which Court Performed Best) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="font-display text-base font-black text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <span>أداء الملاعب الفردية والمقارنة</span>
            </h3>
            <p className="text-xs text-zinc-400">
              مقارنة الإيرادات ونسب الإشغال لكل ملعب لتحديد الأكثر طلباً
            </p>
          </div>
          <Link
            href="/dashboard/courts"
            className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-all"
          >
            <span>إعدادات الأسعار</span>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>

        {courts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#141418] border border-white/[0.08] text-center text-zinc-400 text-xs">
            لا توجد ملاعب نشطة مسجلة في هذه المنشأة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map((court: VenueCourtAnalyticsItem) => (
              <div
                key={court.court_id}
                className={`p-5 rounded-3xl bg-[#141418] border transition-all flex flex-col justify-between ${
                  court.is_star
                    ? "border-primary/40 shadow-[0_4px_24px_rgba(16,185,129,0.08)] bg-gradient-to-b from-primary/[0.03] to-[#141418]"
                    : "border-white/[0.08]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-base font-black text-white">
                          {court.court_name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 font-bold border border-white/5">
                          {court.sport === "football"
                            ? "خماسي"
                            : court.surface === "covered_padel"
                            ? "بادل مغطى"
                            : "بادل بانوراما"}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 block mt-0.5">
                        صباحي: {court.price_morning} ج.م | مسائي:{" "}
                        {court.price_evening} ج.م
                      </span>
                    </div>

                    {court.is_star && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-black shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span>الأعلى طلباً</span>
                      </span>
                    )}
                  </div>

                  {/* Revenue & Bookings stats */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/[0.06] my-3">
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5 font-bold">
                        الإيراد المحقق
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-white tabular-nums">
                          {court.gross_revenue.toLocaleString("en-US")}
                        </span>
                        <span className="text-[10px] text-zinc-500">ج.م</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5 font-bold">
                        عدد الماتشات
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-primary tabular-nums">
                          {court.total_bookings}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          ({court.total_hours} س)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">
                      نسبة إشغال الملعب:
                    </span>
                    <span className="font-black text-white tabular-nums">
                      {court.occupancy_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        court.is_star ? "bg-primary" : "bg-zinc-400"
                      }`}
                      style={{
                        width: `${Math.min(court.occupancy_rate, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hourly Demand & Heatmap (Peak vs Dead Hours - Simplified & Redesigned) */}
      {(() => {
        const morningSlots = hourly.filter((h) => !h.is_peak);
        const eveningSlots = hourly.filter((h) => h.is_peak);
        const morningMatches = morningSlots.reduce((sum, h) => sum + h.bookings_count, 0);
        const eveningMatches = eveningSlots.reduce((sum, h) => sum + h.bookings_count, 0);
        const totalMatches = morningMatches + eveningMatches;
        const eveningPct = totalMatches > 0 ? Math.round((eveningMatches / totalMatches) * 100) : 0;
        const morningPct = totalMatches > 0 ? 100 - eveningPct : 0;
        const sortedByDemand = [...hourly].sort((a, b) => b.bookings_count - a.bookings_count);
        const topHour = sortedByDemand[0]?.bookings_count > 0 ? sortedByDemand[0] : null;
        const bookedSlotsCount = hourly.filter((h) => h.bookings_count > 0).length;
        const vacantSlotsCount = Math.max(0, hourly.length - bookedSlotsCount);
        const utilizationPct = hourly.length > 0 ? Math.round((bookedSlotsCount / hourly.length) * 100) : 0;

        return (
          <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-black text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <span>توزيع الإقبال وساعات الذروة والركود</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  متابعة أوقات الإقبال العالي مقارنة بالساعات الهادئة لتعديل أسعار التشغيل وزيادة الأرباح
                </p>
              </div>

              {/* View Switcher Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#1c1c1f] border border-white/[0.06] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHourlyViewMode("grid")}
                  className={`min-h-[36px] px-3.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all ${
                    hourlyViewMode === "grid"
                      ? "bg-primary text-black shadow-md shadow-primary/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>شبكة الساعات (مبسطة)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHourlyViewMode("chart")}
                  className={`min-h-[36px] px-3.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all ${
                    hourlyViewMode === "chart"
                      ? "bg-primary text-black shadow-md shadow-primary/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>مخطط بياني</span>
                </button>
              </div>
            </div>

            {/* Top 3 Strategic Stat Cards (Instant Executive Overview) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Card 1: Evening Peak */}
              <div className="p-4 rounded-2xl bg-gradient-to-l from-primary/[0.12] to-[#1c1c1f] border border-primary/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Moon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span>الذروة المسائية (5م — 1ص)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/20 text-primary border border-primary/30">
                    {eveningPct}% من الحجوزات
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white tabular-nums">
                    {eveningMatches}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">ماتش مسائي</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  الساعة الأنشط:{" "}
                  <strong className="text-primary tabular-nums">
                    {topHour && topHour.is_peak ? `${topHour.slot_label} (${topHour.bookings_count} ماتش)` : "مساءً"}
                  </strong>
                </p>
              </div>

              {/* Card 2: Morning Off-peak */}
              <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <SunMedium className="h-4 w-4 text-cyan-400" strokeWidth={1.5} />
                    <span>الفترة الصباحية (9ص — 4م)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {morningPct}% من الحجوزات
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-zinc-200 tabular-nums">
                    {morningMatches}
                  </span>
                  <span className="text-xs text-zinc-500 font-bold">ماتش صباحي</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  ساعات هادئة: فرصة لتخفيض السعر لجذب الأكاديميات
                </p>
              </div>

              {/* Card 3: Operating Hours Utilization */}
              <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                    <span>جاهزية الساعات اليوم</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/[0.05] text-zinc-400 border border-white/10">
                    {hourly.length} فترات تشغيل
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400 tabular-nums">
                    {bookedSlotsCount}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">
                    ساعة محجوزة ({vacantSlotsCount} شاغرة)
                  </span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${utilizationPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Segmented Period Ratio Ribbon */}
            <div className="p-3.5 rounded-2xl bg-[#1c1c1f] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-primary flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>إشغال المساء: {eveningPct}% ({eveningMatches} ماتش)</span>
                </span>
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <SunMedium className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>إشغال الصباح: {morningPct}% ({morningMatches} ماتش)</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                {totalMatches > 0 ? (
                  <>
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{ width: `${eveningPct}%` }}
                    />
                    <div
                      className="bg-cyan-400 h-full transition-all duration-500"
                      style={{ width: `${morningPct}%` }}
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-white/10" />
                )}
              </div>
            </div>

            {/* Mode 1: Interactive Heatmap Grid (Clear, intuitive, no empty floating poles) */}
            {hourlyViewMode === "grid" && (
              <div className="space-y-4 pt-1">
                {/* Evening Slots Group */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Moon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                      <span>فترة المساء والذروة (05:00 م — 01:00 ص)</span>
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">
                      محجوز: <span className="text-primary font-black tabular-nums">{eveningMatches}</span> من {eveningSlots.length} فترات
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                    {eveningSlots.map((h) => {
                      const isBooked = h.bookings_count > 0;
                      return (
                        <div
                          key={h.hour_24}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                            isBooked
                              ? "bg-primary/15 border-primary/50 shadow-[0_4px_16px_rgba(16,185,129,0.18)]"
                              : "bg-[#1c1c1f] border-white/[0.04] opacity-80 hover:opacity-100"
                          }`}
                        >
                          <span className="text-sm font-black text-white tabular-nums block mb-1">
                            {h.slot_label}
                          </span>
                          {isBooked ? (
                            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-black text-primary bg-primary/20 rounded-xl py-1 px-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              <span>{h.bookings_count} ماتش</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-bold block py-1">
                              شاغر
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Morning Slots Group */}
                <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <SunMedium className="h-3.5 w-3.5 text-cyan-400" strokeWidth={1.5} />
                      <span>الفترة الصباحية (09:00 ص — 04:00 م)</span>
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">
                      محجوز: <span className="text-cyan-400 font-black tabular-nums">{morningMatches}</span> من {morningSlots.length} فترات
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                    {morningSlots.map((h) => {
                      const isBooked = h.bookings_count > 0;
                      return (
                        <div
                          key={h.hour_24}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                            isBooked
                              ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_4px_16px_rgba(6,182,212,0.18)]"
                              : "bg-[#1c1c1f] border-white/[0.04] opacity-80 hover:opacity-100"
                          }`}
                        >
                          <span className="text-sm font-black text-white tabular-nums block mb-1">
                            {h.slot_label}
                          </span>
                          {isBooked ? (
                            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-black text-cyan-300 bg-cyan-500/20 rounded-xl py-1 px-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                              <span>{h.bookings_count} ماتش</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-bold block py-1">
                              شاغر
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Polished Bar Chart View */}
            {hourlyViewMode === "chart" && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-bold text-zinc-400 gap-2">
                  <span>منحنى الساعات الزمني: من الصباح 09:00 ص (يميناً) ⬅ إلى منتصف الليل 01:00 ص (يساراً)</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-primary">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span>ذروة مسائية</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span>صباح هادئ</span>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto scrollbar-none pb-2">
                  <div className="min-w-[720px] flex items-end gap-2.5 h-48 border-b border-white/[0.08] pb-2 px-1 relative">
                    {/* Dotted horizontal guideline */}
                    <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-white/[0.06] pointer-events-none" />

                    {hourly.map((h) => {
                      const isBooked = h.bookings_count > 0;
                      const heightPercent = isBooked
                        ? Math.max(Math.round((h.bookings_count / maxHourlyCount) * 100), 28)
                        : 0;

                      return (
                        <div
                          key={h.hour_24}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-[#1c1c1f] border border-white/10 px-2.5 py-1 rounded-xl text-[10px] font-bold text-white whitespace-nowrap shadow-xl">
                            {h.slot_label}: {h.bookings_count} ماتش {h.is_peak ? "(ذروة مسائية)" : "(صباحي)"}
                          </div>

                          {isBooked ? (
                            <span className="text-[11px] font-black tabular-nums text-white mb-1.5 group-hover:text-primary transition-colors">
                              {h.bookings_count}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-600 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              0
                            </span>
                          )}

                          {isBooked ? (
                            <div
                              className={`w-full rounded-t-xl transition-all duration-300 ${
                                h.is_peak
                                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                                  : "bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-cyan-500 group-hover:to-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.35)]"
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            />
                          ) : (
                            <div className="w-full h-1.5 rounded-full bg-white/[0.06] group-hover:bg-white/[0.15] transition-colors" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Clean Single-line Time Labels */}
                  <div className="min-w-[720px] flex items-center justify-between pt-2.5 px-1 text-[10px] font-bold text-zinc-500 tabular-nums">
                    {hourly.map((h) => (
                      <span key={h.hour_24} className="flex-1 text-center truncate">
                        {h.slot_label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actionable Strategy Tip */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="space-y-1">
                <span className="font-bold text-zinc-200 block">
                  نصيحة باصيلي الذكية لتعظيم الأرباح:
                </span>
                <p className="leading-relaxed">
                  الفترة الصباحية تشهد عدداً محدوداً من الحجوزات ({morningMatches} ماتش)؛ يمكنك استغلال {vacantSlotsCount} ساعة شاغرة عبر تفعيل تسعير مخفض من شاشة «الملاعب والأسعار» لجذب الأكاديميات وحجوزات الطلاب ومضاعفة دخلك في الفترات الهادئة.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Two Columns: Channels Split & Payment Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Channels Split */}
        <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-black text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <span>توزيع قنوات الحجز (Booking Channels)</span>
            </h3>
            <span className="text-[11px] text-zinc-400 font-bold">
              مقارنة بيانية
            </span>
          </div>

          {/* Segmented Visual Progress Bar */}
          {(() => {
            const onlineRev = channels?.online_revenue || 0;
            const walkinRev = channels?.walkin_revenue || 0;
            const total = onlineRev + walkinRev;
            const onlinePct = total > 0 ? Math.round((onlineRev / total) * 100) : 50;
            const walkinPct = total > 0 ? 100 - onlinePct : 50;

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-primary flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span>أونلاين عبر باصيلي ({onlinePct}%)</span>
                  </span>
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>كاش مباشر بالملعب ({walkinPct}%)</span>
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${onlinePct}%` }}
                    title={`أونلاين: ${onlinePct}%`}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${walkinPct}%` }}
                    title={`كاش بالملعب: ${walkinPct}%`}
                  />
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.04] space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-1">
                <span>أونلاين (باصيلي)</span>
                <Smartphone className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white tabular-nums">
                  {channels?.online_revenue.toLocaleString("en-US") || 0}
                </span>
                <span className="text-xs text-zinc-500">ج.م</span>
              </div>
              <span className="text-[11px] text-zinc-500 block">
                {channels?.online_count || 0} حجز أونلاين
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.04] space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-1">
                <span>حجز مباشر (كاش بالملعب)</span>
                <Banknote className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white tabular-nums">
                  {channels?.walkin_revenue.toLocaleString("en-US") || 0}
                </span>
                <span className="text-xs text-zinc-500">ج.م</span>
              </div>
              <span className="text-[11px] text-zinc-500 block">
                {channels?.walkin_count || 0} حجز مباشر
              </span>
            </div>
          </div>
        </div>

        {/* Shift Cash Reconciliation & Wallets */}
        <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-black text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
              <span>مطابقة تحصيل الوردية ومنع العجز</span>
            </h3>
            <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              تدقيق مالي
            </span>
          </div>

          {/* Segmented Payment Methods Bar */}
          {(() => {
            const insta = payments?.instapay_amount || 0;
            const voda = payments?.vodafone_amount || 0;
            const cash = payments?.cash_on_pitch_amount || 0;
            const total = insta + voda + cash;
            const instaPct = total > 0 ? Math.round((insta / total) * 100) : 0;
            const vodaPct = total > 0 ? Math.round((voda / total) * 100) : 0;
            const cashPct = total > 0 ? 100 - instaPct - vodaPct : 100;

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-cyan-400">إنستا باي ({instaPct}%)</span>
                  <span className="text-rose-400">فودافون كاش ({vodaPct}%)</span>
                  <span className="text-amber-300">كاش بالملعب ({cashPct}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-500"
                    style={{ width: `${instaPct}%` }}
                    title={`إنستا باي: ${instaPct}%`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${vodaPct}%` }}
                    title={`فودافون كاش: ${vodaPct}%`}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${cashPct}%` }}
                    title={`كاش بالملعب: ${cashPct}%`}
                  />
                </div>
              </div>
            );
          })()}

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-[#1c1c1f] flex items-center justify-between border border-white/[0.04]">
              <span className="text-zinc-400 font-bold">
                تحويلات إنستا باي المعتمدة
              </span>
              <span className="font-black text-white tabular-nums">
                {payments?.instapay_amount.toLocaleString("en-US") || 0} ج.م{" "}
                <span className="text-zinc-500 text-[10px]">
                  ({payments?.instapay_count || 0} إيصال)
                </span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#1c1c1f] flex items-center justify-between border border-white/[0.04]">
              <span className="text-zinc-400 font-bold">
                تحويلات فودافون كاش المعتمدة
              </span>
              <span className="font-black text-white tabular-nums">
                {payments?.vodafone_amount.toLocaleString("en-US") || 0} ج.م{" "}
                <span className="text-zinc-500 text-[10px]">
                  ({payments?.vodafone_count || 0} إيصال)
                </span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <span className="text-amber-200 font-bold">
                الكاش الفعلي المطلوب في درج الاستقبال
              </span>
              <span className="font-black text-amber-300 text-sm tabular-nums">
                {payments?.cash_on_pitch_amount.toLocaleString("en-US") || 0} ج.م
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Quality & Player Ratings Radar */}
      <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-black text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" strokeWidth={1.5} />
              <span>مؤشر رضا اللاعبين وجودة الملعب (Player Satisfaction)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              تقييمات موثقة من اللاعبين بعد اكتمال مبارياتهم عبر المنصة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-amber-300 tabular-nums">
              {ratings?.avg_overall || 5}
            </span>
            <span className="text-xs text-zinc-500 font-bold">
              من 5 ({ratings?.reviews_count || 0} تقييم موثق)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold">جودة النجيل والأرضية</span>
              <span className="font-black text-white tabular-nums">
                {ratings?.avg_turf || 5} / 5
              </span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${((ratings?.avg_turf || 5) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold">شدة ونقاء الإضاءة</span>
              <span className="font-black text-white tabular-nums">
                {ratings?.avg_lighting || 5} / 5
              </span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full"
                style={{ width: `${((ratings?.avg_lighting || 5) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1c1c1f] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold">مستوى الاستقبال والخدمة</span>
              <span className="font-black text-white tabular-nums">
                {ratings?.avg_service || 5} / 5
              </span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full"
                style={{ width: `${((ratings?.avg_service || 5) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Performance & Timeline: Interactive Chart + Table */}
      {analytics && analytics.daily_timeline.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-black text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <span>الرسم البياني لتطور الإيرادات والماتشات اليومية</span>
              </h3>
              <p className="text-xs text-zinc-400">
                متابعة حركة الإيراد اليومي والمحصل فعلياً خلال الفترة المختارة ({analytics.daily_timeline.length} يوم)
              </p>
            </div>

            {/* View Mode Toggle (Chart vs Table) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#1c1c1f] border border-white/[0.06] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDailyViewMode("chart")}
                className={`min-h-[36px] px-3.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all ${
                  dailyViewMode === "chart"
                    ? "bg-primary text-black shadow-md shadow-primary/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>رسم بياني</span>
              </button>
              <button
                type="button"
                onClick={() => setDailyViewMode("table")}
                className={`min-h-[36px] px-3.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all ${
                  dailyViewMode === "table"
                    ? "bg-primary text-black shadow-md shadow-primary/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Activity className="h-3.5 w-3.5" strokeWidth={2} />
                <span>جدول رقمي</span>
              </button>
            </div>
          </div>

          {/* Chart View */}
          {dailyViewMode === "chart" && (
            <div className="space-y-4 pt-2">
              {/* Chart Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  <span>إجمالي القيمة الإيجارية</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                  <span>المحصّل فعلياً</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                  <span>متبقي كاش بالملعب</span>
                </span>
              </div>

              {/* Visual Bars Container */}
              {(() => {
                const maxRevenue = Math.max(
                  ...analytics.daily_timeline.map((d) => d.gross_revenue),
                  1
                );

                return (
                  <div className="overflow-x-auto scrollbar-none pb-2">
                    <div
                      className="flex items-end gap-3 h-52 border-b border-white/[0.08] pb-2 px-2"
                      style={{
                        minWidth: `${Math.max(
                          analytics.daily_timeline.length * 64,
                          600
                        )}px`,
                      }}
                    >
                      {analytics.daily_timeline.map((day) => {
                        const grossHeight =
                          day.gross_revenue > 0
                            ? Math.max(
                                Math.round(
                                  (day.gross_revenue / maxRevenue) * 100
                                ),
                                8
                              )
                            : 4;

                        const collectedHeight =
                          day.gross_revenue > 0 && day.collected_revenue > 0
                            ? Math.max(
                                Math.round(
                                  (day.collected_revenue / maxRevenue) * 100
                                ),
                                6
                              )
                            : 0;

                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          >
                            {/* Hover Tooltip Card */}
                            <div className="absolute -top-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-[#1c1c1f] border border-white/10 p-2.5 rounded-xl text-xs font-bold text-white whitespace-nowrap shadow-2xl space-y-1">
                              <span className="text-[11px] text-zinc-400 block border-b border-white/10 pb-1">
                                {day.date} — {day.bookings_count} ماتش
                              </span>
                              <div className="text-white tabular-nums">
                                إجمالي: {day.gross_revenue.toLocaleString("en-US")}{" "}
                                ج.م
                              </div>
                              <div className="text-emerald-400 tabular-nums">
                                محصل:{" "}
                                {day.collected_revenue.toLocaleString("en-US")} ج.م
                              </div>
                              {day.pending_cash > 0 && (
                                <div className="text-amber-300 tabular-nums">
                                  متبقي كاش:{" "}
                                  {day.pending_cash.toLocaleString("en-US")} ج.م
                                </div>
                              )}
                            </div>

                            {/* Value Above Bar */}
                            <div className="mb-1 text-center">
                              <span className="text-[10px] font-black tabular-nums text-white block group-hover:text-primary transition-colors">
                                {day.gross_revenue > 0
                                  ? `${day.gross_revenue}`
                                  : "0"}
                              </span>
                              {day.bookings_count > 0 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/[0.05] text-zinc-400 font-bold block">
                                  {day.bookings_count}م
                                </span>
                              )}
                            </div>

                            {/* Dual Bars Side-by-side */}
                            <div className="w-full flex items-end justify-center gap-1 h-full max-h-[140px]">
                              {/* Gross Bar */}
                              <div
                                className={`w-1/2 max-w-[20px] rounded-t-lg transition-all duration-300 ${
                                  day.gross_revenue > 0
                                    ? "bg-primary group-hover:bg-primary-hover shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                                    : "bg-white/[0.04]"
                                }`}
                                style={{ height: `${grossHeight}%` }}
                              />
                              {/* Collected Bar */}
                              <div
                                className={`w-1/2 max-w-[20px] rounded-t-lg transition-all duration-300 ${
                                  day.collected_revenue > 0
                                    ? "bg-emerald-400 group-hover:bg-emerald-300"
                                    : "bg-transparent"
                                }`}
                                style={{ height: `${collectedHeight}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Day Date Labels */}
                    <div
                      className="flex items-center justify-between pt-2 px-2 text-[10px] font-bold text-zinc-500 tabular-nums"
                      style={{
                        minWidth: `${Math.max(
                          analytics.daily_timeline.length * 64,
                          600
                        )}px`,
                      }}
                    >
                      {analytics.daily_timeline.map((day) => {
                        const [, m, d] = day.date.split("-");
                        return (
                          <span
                            key={day.date}
                            className="flex-1 text-center truncate px-0.5"
                          >
                            {d}/{m}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Table View */}
          {dailyViewMode === "table" && (
            <div className="overflow-x-auto scrollbar-none pt-1">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-zinc-400 font-bold">
                    <th className="pb-3 pr-2">التاريخ</th>
                    <th className="pb-3 px-2">عدد الماتشات</th>
                    <th className="pb-3 px-2">إجمالي الإيجار</th>
                    <th className="pb-3 px-2">المحصّل فعلياً</th>
                    <th className="pb-3 pl-2">متبقي كاش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] font-medium text-zinc-300">
                  {analytics.daily_timeline.map((row) => (
                    <tr
                      key={row.date}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 pr-2 font-bold text-white tabular-nums">
                        {row.date}
                      </td>
                      <td className="py-3 px-2 tabular-nums">
                        {row.bookings_count} ماتش
                      </td>
                      <td className="py-3 px-2 font-bold text-white tabular-nums">
                        {row.gross_revenue.toLocaleString("en-US")} ج.م
                      </td>
                      <td className="py-3 px-2 text-emerald-400 font-bold tabular-nums">
                        {row.collected_revenue.toLocaleString("en-US")} ج.م
                      </td>
                      <td className="py-3 pl-2 text-amber-300 font-bold tabular-nums">
                        {row.pending_cash.toLocaleString("en-US")} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
