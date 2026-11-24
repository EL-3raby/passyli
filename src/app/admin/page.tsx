"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Wallet,
  Users,
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminOverview, type AdminOverviewPayload } from "@/lib/api/admin";
import AdminOverviewCards from "@/components/admin/admin-overview-cards";
import AdminPartnersTab from "@/components/admin/admin-partners-tab";
import AdminVenuesTab from "@/components/admin/admin-venues-tab";
import AdminRechargesTab from "@/components/admin/admin-recharges-tab";
import AdminBookingsTab from "@/components/admin/admin-bookings-tab";
import AdminUsersBlacklistTab from "@/components/admin/admin-users-blacklist-tab";

type AdminTab =
  | "overview"
  | "partners"
  | "venues"
  | "recharges"
  | "bookings"
  | "users";

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [data, setData] = useState<AdminOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const payload = await getAdminOverview();
      setData(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل بيانات لوحة المشرف العام"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  // Realtime live updates across critical admin tables
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("super-admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_applications" },
        () => {
          void loadData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_recharge_requests" },
        () => {
          void loadData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venues" },
        () => {
          void loadData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void loadData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts" },
        () => {
          void loadData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_wallet_transactions" },
        () => {
          void loadData(true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleFeedback = useCallback((message: string, isError = false) => {
    setFeedback({ message, isError });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  }, []);

  if (loading && !data) {
    return (
      <main
        className="min-h-screen bg-[#09090b] pt-24 pb-24 px-4 sm:px-6"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-36 rounded-full bg-white/[0.06]" />
              <div className="h-8 w-64 rounded-xl bg-white/[0.08]" />
            </div>
            <div className="h-11 w-32 rounded-xl bg-white/[0.06]" />
          </div>

          <div className="h-12 w-full rounded-2xl bg-white/[0.05]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl bg-[#141418] border border-white/[0.06]"
              />
            ))}
          </div>

          <div className="h-64 rounded-2xl bg-[#141418] border border-white/[0.06]" />
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main
        className="min-h-screen bg-[#09090b] pt-24 pb-24 px-4 sm:px-6"
        dir="rtl"
      >
        <div className="max-w-xl mx-auto rounded-3xl bg-[#141418] border border-rose-500/25 p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-lg font-black text-white">
            تعذر تحميل لوحة المشرف العام
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">{error}</p>
          <button
            type="button"
            onClick={() => void loadData(false)}
            className="min-h-[44px] px-6 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const tabs: Array<{
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    {
      id: "partners",
      label: "طلبات الشراكة",
      icon: ClipboardCheck,
      badge: data.stats.pending_applications,
    },
    {
      id: "venues",
      label: "الملاعب والمحافظ",
      icon: Building2,
      badge: data.stats.low_balance_venues,
    },
    {
      id: "recharges",
      label: "طلبات الشحن",
      icon: Wallet,
      badge: data.stats.pending_recharges,
    },
    {
      id: "bookings",
      label: "الحجوزات والنزاعات",
      icon: CalendarClock,
      badge: data.stats.pending_receipt_bookings,
    },
    {
      id: "users",
      label: "المستخدمون والحظر",
      icon: Users,
      badge: data.stats.blacklist_count,
    },
  ];

  return (
    <main
      className="min-h-screen bg-[#09090b] pt-24 pb-28 px-4 sm:px-6"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>مركز القيادة — المشرف العام</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              إدارة منصة باصي&zwj;<span className="text-primary">&zwj;لي</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              متابعة فورية لطلبات انضمام الملاعب، أرصدة المحافظ، إيصالات الشحن، الحجوزات، وصلاحيات الحسابات.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadData(true)}
            className="min-h-[44px] px-4 rounded-xl bg-[#141418] hover:bg-white/[0.06] disabled:opacity-60 border border-white/[0.08] text-zinc-200 text-xs font-bold inline-flex items-center justify-center gap-2 self-start sm:self-auto transition-all"
          >
            <RefreshCw
              className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={1.5}
            />
            <span>{refreshing ? "جاري التحديث..." : "تحديث البيانات"}</span>
          </button>
        </header>

        {/* Feedback Banner */}
        {feedback && (
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
              feedback.isError
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {feedback.isError ? (
              <XCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <nav
          aria-label="أقسام لوحة المشرف"
          className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-black border-primary font-black shadow-lg shadow-primary/15"
                    : "bg-[#141418] text-zinc-300 border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2 : 1.5} />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black inline-flex items-center justify-center tabular-nums ${
                      isActive
                        ? "bg-black/20 text-black"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Views */}
        <section>
          {activeTab === "overview" && (
            <AdminOverviewCards
              stats={data.stats}
              venues={data.venues}
              dailyTrend={data.daily_trend ?? []}
              onJumpTab={(target) => setActiveTab(target)}
            />
          )}

          {activeTab === "partners" && (
            <AdminPartnersTab
              applications={data.applications}
              onRefresh={() => loadData(true)}
              onFeedback={handleFeedback}
            />
          )}

          {activeTab === "venues" && (
            <AdminVenuesTab
              venues={data.venues}
              users={data.users}
              transactions={data.wallet_transactions}
              onRefresh={() => loadData(true)}
              onFeedback={handleFeedback}
            />
          )}

          {activeTab === "recharges" && (
            <AdminRechargesTab
              requests={data.recharge_requests}
              onRefresh={() => loadData(true)}
              onFeedback={handleFeedback}
            />
          )}

          {activeTab === "bookings" && (
            <AdminBookingsTab
              onRefreshOverview={() => loadData(true)}
              onFeedback={handleFeedback}
            />
          )}

          {activeTab === "users" && (
            <AdminUsersBlacklistTab
              users={data.users}
              blacklist={data.blacklist}
              onRefresh={() => loadData(true)}
              onFeedback={handleFeedback}
            />
          )}
        </section>
      </div>
    </main>
  );
}
