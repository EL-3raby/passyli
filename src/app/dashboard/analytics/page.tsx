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

        {/* Occupancy Rate */}
        <div className="p-5 rounded-3xl bg-[#141418] border border-white/[0.08] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400">
              نسبة إشغال المنشأة
            </span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Activity className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 tabular-nums">
              {summary?.occupancy_rate ?? 0}%
            </span>
            <span className="text-xs text-zinc-500 font-bold">
              ({summary?.total_booked_hours ?? 0} ساعة محجوزة)
            </span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(summary?.occupancy_rate ?? 0, 100)}%`,
              }}
            />
          </div>
        </div>
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

      {/* Hourly Demand & Heatmap (Peak vs Dead Hours) */}
      <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-black text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <span>خريطة ساعات الذروة والركود (Hourly Demand Heatmap)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              توزيع الحجوزات على ساعات اليوم لمعرفة أوقات الإقبال والساعات الهادئة
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>ساعات الذروة المسائية</span>
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-zinc-600" />
              <span>ساعات الصباح الهادئة</span>
            </span>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="pt-4 overflow-x-auto scrollbar-none pb-2">
          <div className="min-w-[700px] flex items-end gap-2 h-44 border-b border-white/[0.08] pb-2 px-1">
            {hourly.map((h) => {
              const heightPercent =
                h.bookings_count > 0
                  ? Math.max(
                      Math.round((h.bookings_count / maxHourlyCount) * 100),
                      12
                    )
                  : 4;

              return (
                <div
                  key={h.hour_24}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-[#1c1c1f] border border-white/10 px-2 py-1 rounded-lg text-[10px] font-bold text-white whitespace-nowrap shadow-lg">
                    {h.slot_label}: {h.bookings_count} ماتش
                  </div>

                  <span className="text-[10px] font-black tabular-nums text-zinc-400 mb-1 group-hover:text-primary transition-colors">
                    {h.bookings_count > 0 ? h.bookings_count : ""}
                  </span>

                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      h.bookings_count > 0
                        ? h.is_peak
                          ? "bg-primary group-hover:bg-primary-hover shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          : "bg-cyan-500 group-hover:bg-cyan-400"
                        : "bg-white/[0.04]"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Hour Labels */}
          <div className="min-w-[700px] flex items-center justify-between pt-2 px-1 text-[10px] font-bold text-zinc-500 tabular-nums">
            {hourly.map((h) => (
              <span key={h.hour_24} className="flex-1 text-center truncate">
                {h.slot_label.split(" ")[0]}
                <span className="text-[8px] text-zinc-600 block">
                  {h.slot_label.split(" ")[1]}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Actionable Strategy Tip */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>
            <strong className="text-zinc-200">نصيحة باصيلي لتطوير الأرباح:</strong>{" "}
            إذا كانت الساعات الصباحية (11 ص إلى 4 م) تشهد معدل إشغال منخفض، يمكنك
            تطبيق تخفيض على السعر الصباحي من شاشة «الملاعب والأسعار» لجذب الأكاديميات
            وحجوزات الطلاب ومضاعفة دخلك في الفترات الميتة.
          </span>
        </div>
      </div>

      {/* Two Columns: Channels Split & Payment Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Channels Split */}
        <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-black text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <span>توزيع قنوات الحجز</span>
            </h3>
            <span className="text-[11px] text-zinc-500 font-bold">
              أونلاين vs بالملعب
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

      {/* Daily Financial Ledger Table */}
      {analytics && analytics.daily_timeline.length > 1 && (
        <div className="p-6 rounded-3xl bg-[#141418] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-black text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <span>سجل الأيام التفصيلي في الفترة المختارة</span>
            </h3>
            <span className="text-xs text-zinc-500 font-bold">
              {analytics.daily_timeline.length} يوم
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-none">
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
                  <tr key={row.date} className="hover:bg-white/[0.02] transition-colors">
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
        </div>
      )}
    </div>
  );
}
