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
} from "lucide-react";
import type { AdminStats } from "@/lib/api/admin";

interface AdminOverviewCardsProps {
  stats: AdminStats;
  onJumpTab: (tab: "partners" | "recharges" | "users") => void;
}

export default function AdminOverviewCards({
  stats,
  onJumpTab,
}: AdminOverviewCardsProps) {
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

  return (
    <div className="space-y-5">
      {/* Urgent Pending Action Banners */}
      {(stats.pending_applications > 0 || stats.pending_recharges > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.pending_applications > 0 && (
            <button
              type="button"
              onClick={() => onJumpTab("partners")}
              className="rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 p-4 flex items-center justify-between text-right transition-all"
            >
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-amber-400 shrink-0" strokeWidth={1.5} />
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
              className="rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 p-4 flex items-center justify-between text-right transition-all"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-emerald-400 shrink-0" strokeWidth={1.5} />
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
          className="min-h-[40px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-bold text-white tabular-nums shrink-0"
        >
          {stats.blacklist_count} أرقام محظورة
        </button>
      </div>
    </div>
  );
}
