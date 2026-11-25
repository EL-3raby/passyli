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
import AdminShell, {
  type AdminNavItem,
  type AdminTabId,
} from "@/components/admin/admin-shell";
import AdminOverviewCards from "@/components/admin/admin-overview-cards";
import AdminPartnersTab from "@/components/admin/admin-partners-tab";
import AdminVenuesTab from "@/components/admin/admin-venues-tab";
import AdminRechargesTab from "@/components/admin/admin-recharges-tab";
import AdminBookingsTab from "@/components/admin/admin-bookings-tab";
import AdminUsersBlacklistTab from "@/components/admin/admin-users-blacklist-tab";

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
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

  const navItems: AdminNavItem[] = [
    {
      id: "overview",
      label: "نظرة عامة",
      shortLabel: "نظرة عامة",
      subtitle: "مؤشرات النمو والأرباح والتشغيل الفوري",
      icon: LayoutDashboard,
      group: "command",
    },
    {
      id: "partners",
      label: "طلبات الشراكة",
      shortLabel: "الشراكة",
      subtitle: "اعتماد الملاعب الجديدة وربط بريد الملاك",
      icon: ClipboardCheck,
      group: "command",
      badge: data?.stats.pending_applications ?? 0,
    },
    {
      id: "bookings",
      label: "الحجوزات والنزاعات",
      shortLabel: "النزاعات",
      subtitle: "متابعة الحجوزات وتحرير المواعيد المعلقة",
      icon: CalendarClock,
      group: "command",
      badge: data?.stats.pending_receipt_bookings ?? 0,
    },
    {
      id: "venues",
      label: "الملاعب والمحافظ",
      shortLabel: "الملاعب",
      subtitle: "الأرصدة والعمولات وتفعيل/إيقاف المنشآت",
      icon: Building2,
      group: "network",
      badge: data?.stats.low_balance_venues ?? 0,
    },
    {
      id: "recharges",
      label: "طلبات الشحن",
      shortLabel: "الشحن",
      subtitle: "مراجعة إيصالات شحن أرصدة الملاعب",
      icon: Wallet,
      group: "network",
      badge: data?.stats.pending_recharges ?? 0,
    },
    {
      id: "users",
      label: "المستخدمون والحظر",
      shortLabel: "المستخدمون",
      subtitle: "إدارة الصلاحيات والقائمة السوداء",
      icon: Users,
      group: "network",
      badge: data?.stats.blacklist_count ?? 0,
    },
  ];

  const pendingAlertsCount = data
    ? data.stats.pending_applications +
      data.stats.pending_recharges +
      data.stats.pending_receipt_bookings
    : 0;

  return (
    <AdminShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      navItems={navItems}
      onRefresh={() => void loadData(true)}
      refreshing={refreshing}
      quickStats={
        data
          ? {
              activeVenues: data.stats.active_venues,
              pendingAlerts: pendingAlertsCount,
            }
          : undefined
      }
    >
      {loading && !data ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl bg-[#141418] border border-white/[0.06]"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-[#141418] border border-white/[0.06]" />
        </div>
      ) : error && !data ? (
        <div className="max-w-xl mx-auto rounded-3xl bg-[#141418] border border-rose-500/25 p-8 text-center space-y-4 my-8">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-lg font-black text-white">
            تعذر تحميل لوحة المشرف العام
          </h2>
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
      ) : !data ? null : (
        <div className="space-y-6">
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
        </div>
      )}
    </AdminShell>
  );
}
