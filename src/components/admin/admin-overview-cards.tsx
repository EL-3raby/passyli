"use client";

import {
  Building2,
  CalendarCheck,
  Wallet,
  TrendingUp,
  Users,
  ShieldAlert,
  Clock3,
  AlertCircle,
  MessageCircle,
  ReceiptText,
  AlertTriangle,
  BarChart3,
  UserX,
} from "lucide-react";
import type {
  AdminDailyTrendItem,
  AdminStats,
  AdminVenueItem,
} from "@/lib/api/admin";

interface AdminOverviewCardsProps {
  stats: AdminStats;
  venues: AdminVenueItem[];
  dailyTrend: AdminDailyTrendItem[];
  onJumpTab: (
    tab: "partners" | "venues" | "recharges" | "bookings" | "users"
  ) => void;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("20")
    ? digits
    : digits.startsWith("0")
    ? `2${digits}`
    : `20${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export default function AdminOverviewCards({
  stats,
  venues,
  dailyTrend,
  onJumpTab,
}: AdminOverviewCardsProps) {
  const lowBalanceVenues = venues.filter(
    (v) => v.is_active && v.prepaid_balance <= 30
  );
  const unlinkedVenues = venues.filter((v) => !v.owner_id);

  const maxBookings = Math.max(
    1,
    ...dailyTrend.map((d) => Number(d.bookings_count) || 0)
  );

  const kpis = [
    {
      label: "الملاعب النشطة / الإجمالي",
      value: `${stats.active_venues} / ${stats.total_venues}`,
      icon: Building2,
      accent: "text-emerald-400",
    },
    {
      label: "الحجوزات المؤكدة (اليوم / الكل)",
      value: `${stats.today_bookings} / ${stats.total_bookings}`,
      icon: CalendarCheck,
      accent: "text-primary",
    },
    {
      label: "حجم حجوزات المنصة",
      value: `${stats.confirmed_revenue.toLocaleString("en-US")} ج.م`,
      icon: TrendingUp,
      accent: "text-white",
    },
    {
      label: "أرباح عمولات باصيلي",
      value: `${stats.total_commission_earned.toLocaleString("en-US")} ج.م`,
      icon: Wallet,
      accent: "text-emerald-400",
    },
    {
      label: "إجمالي أرصدة محافظ الملاعب",
      value: `${stats.total_wallet_balances.toLocaleString("en-US")} ج.م`,
      icon: Wallet,
      accent: "text-amber-400",
    },
    {
      label: "اللاعبين المسجلين",
      value: `${stats.total_players}`,
      icon: Users,
      accent: "text-zinc-200",
    },
  ];

  const hasAlerts =
    stats.pending_applications > 0 ||
    stats.pending_recharges > 0 ||
    stats.pending_receipt_bookings > 0 ||
    stats.low_balance_venues > 0;

  return (
    <div className="space-y-5">
      {/* Urgent Pending Action Banners */}
      {hasAlerts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.pending_applications > 0 && (
            <button
              type="button"
              onClick={() => onJumpTab("partners")}
              className="min-h-[64px] rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 p-4 flex items-center justify-between text-right transition-all"
            >
              <div className="flex items-center gap-3">
                <Clock3
                  className="h-5 w-5 text-amber-400 shrink-0"
                  strokeWidth={1.5}
                />
                <div>
                  <span className="text-xs font-black text-amber-300 block">
                    طلبات انضمام ملاعب تنتظر المراجعة
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    اضغط لمراجعة البيانات وتحديد الرصيد الترحيبي
                  </span>
                </div>
              </div>
              <span className="h-8 min-w-[32px] px-2.5 rounded-xl bg-amber-400 text-black font-black text-xs flex items-center justify-center tabular-nums">
                {stats.pending_applications}
              </span>
            </button>
          )}

          {stats.pending_recharges > 0 && (
            <button
              type="button"
              onClick={() => onJumpTab("recharges")}
              className="min-h-[64px] rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 p-4 flex items-center justify-between text-right transition-all"
            >
              <div className="flex items-center gap-3">
                <AlertCircle
                  className="h-5 w-5 text-emerald-400 shrink-0"
                  strokeWidth={1.5}
                />
                <div>
                  <span className="text-xs font-black text-emerald-300 block">
                    طلبات شحن رصيد بانتظار الاعتماد
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    اضغط لمراجعة إيصالات التحويل وإضافة الرصيد
                  </span>
                </div>
              </div>
              <span className="h-8 min-w-[32px] px-2.5 rounded-xl bg-emerald-400 text-black font-black text-xs flex items-center justify-center tabular-nums">
                {stats.pending_recharges}
              </span>
            </button>
          )}

          {stats.pending_receipt_bookings > 0 && (
            <button
              type="button"
              onClick={() => onJumpTab("bookings")}
              className="min-h-[64px] rounded-2xl bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/30 p-4 flex items-center justify-between text-right transition-all"
            >
              <div className="flex items-center gap-3">
                <ReceiptText
                  className="h-5 w-5 text-sky-400 shrink-0"
                  strokeWidth={1.5}
                />
                <div>
                  <span className="text-xs font-black text-sky-300 block">
                    إيصالات حجوزات بانتظار التأكيد من الملاعب
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    تابع حالات التحويل وتدخل عند وجود تأخير أو نزاع
                  </span>
                </div>
              </div>
              <span className="h-8 min-w-[32px] px-2.5 rounded-xl bg-sky-400 text-black font-black text-xs flex items-center justify-center tabular-nums">
                {stats.pending_receipt_bookings}
              </span>
            </button>
          )}

          {stats.low_balance_venues > 0 && (
            <button
              type="button"
              onClick={() => onJumpTab("venues")}
              className="min-h-[64px] rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 p-4 flex items-center justify-between text-right transition-all"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className="h-5 w-5 text-rose-400 shrink-0"
                  strokeWidth={1.5}
                />
                <div>
                  <span className="text-xs font-black text-rose-300 block">
                    ملاعب نشطة اقترب رصيدها من النفاد
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    رصيد يساوي أو يقل عن 30 ج.م — تواصل مع المالك قبل التوقف
                  </span>
                </div>
              </div>
              <span className="h-8 min-w-[32px] px-2.5 rounded-xl bg-rose-400 text-black font-black text-xs flex items-center justify-center tabular-nums">
                {stats.low_balance_venues}
              </span>
            </button>
          )}
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-xs font-bold text-zinc-400 block">
                  {item.label}
                </span>
                <span
                  className={`font-display text-2xl font-black tabular-nums mt-1.5 block ${item.accent}`}
                >
                  {item.value}
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[#1c1c21] border border-white/[0.06] flex items-center justify-center text-primary shrink-0">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 7-Day Activity Trend + Low Balance / Unlinked Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 7-Day Bookings Bar Chart */}
        <div className="lg:col-span-7 rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-display text-sm font-black text-white">
                نشاط الحجوزات آخر 7 أيام
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400 tabular-nums">
              أقفال جارية الآن: {stats.active_locked_bookings}
            </span>
          </div>

          {dailyTrend.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              لا توجد بيانات حجوزات للأيام السبعة الماضية.
            </p>
          ) : (
            <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
              {dailyTrend.map((point) => {
                const count = Number(point.bookings_count) || 0;
                const heightPct = Math.max(8, Math.round((count / maxBookings) * 100));
                const shortDate = point.day.slice(5);
                return (
                  <div
                    key={point.day}
                    className="flex flex-col items-center justify-end h-full gap-1.5"
                    title={`${point.day}: ${count} حجز • ${point.revenue} ج.م`}
                  >
                    <span className="text-[10px] font-black text-zinc-300 tabular-nums">
                      {count}
                    </span>
                    <div className="w-full max-w-[34px] flex-1 flex items-end bg-white/[0.03] rounded-lg overflow-hidden p-0.5">
                      <div
                        className="w-full rounded-md bg-primary/80 transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      dir="ltr"
                      className="text-[10px] text-zinc-500 tabular-nums"
                    >
                      {shortDate}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low-Balance & Unlinked Venues Radar */}
        <div className="lg:col-span-5 rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 text-amber-400"
                strokeWidth={1.5}
              />
              <h3 className="font-display text-sm font-black text-white">
                رادار الملاعب الحرجة
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onJumpTab("venues")}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              إدارة الملاعب
            </button>
          </div>

          {lowBalanceVenues.length === 0 && unlinkedVenues.length === 0 ? (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-xs text-emerald-300 font-bold">
              جميع الملاعب النشطة لديها رصيد كافٍ ومربوطة بحسابات ملاكها.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-0.5">
              {lowBalanceVenues.map((venue) => {
                const contactPhone = venue.whatsapp_number || venue.phone;
                return (
                  <div
                    key={`low-${venue.id}`}
                    className="rounded-xl bg-[#0e0e11] border border-amber-500/20 px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block truncate">
                        {venue.name}
                      </span>
                      <span className="text-[11px] text-amber-400 font-bold tabular-nums">
                        رصيد متبقي: {venue.prepaid_balance} ج.م
                      </span>
                    </div>
                    {contactPhone && (
                      <a
                        href={buildWhatsAppUrl(
                          contactPhone,
                          `مرحباً إدارة ${venue.name}، نحيطكم علماً من منصة باصيلي أن رصيد محفظة الملعب وصل إلى ${venue.prepaid_balance} ج.م. يرجى شحن الرصيد لضمان استمرار استقبال الحجوزات.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0"
                      >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>واتساب</span>
                      </a>
                    )}
                  </div>
                );
              })}

              {unlinkedVenues.map((venue) => (
                <div
                  key={`unlinked-${venue.id}`}
                  className="rounded-xl bg-[#0e0e11] border border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">
                      {venue.name}
                    </span>
                    <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1">
                      <UserX className="h-3 w-3 text-rose-400" strokeWidth={1.5} />
                      <span>بدون حساب مالك مربوط</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJumpTab("venues")}
                    className="min-h-[36px] px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-[11px] font-bold shrink-0"
                  >
                    ربط الآن
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Blacklist quick link card */}
      <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-xs font-black text-white block">
              أرقام القائمة السوداء المحظورة حالياً
            </span>
            <span className="text-[11px] text-zinc-400 block">
              يُمنع أي رقم في القائمة السوداء من قفل مواعيد الحجز تلقائياً
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onJumpTab("users")}
          className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-bold text-white tabular-nums shrink-0"
        >
          {stats.blacklist_count} أرقام محظورة
        </button>
      </div>
    </div>
  );
}
