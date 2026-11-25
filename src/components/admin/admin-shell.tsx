"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Wallet,
  Users,
  CalendarClock,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  Menu,
  X,
  LogOut,
  ExternalLink,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import NotificationsPopover, {
  type OperationalNotification,
} from "@/components/shared/notifications-popover";

export type AdminTabId =
  | "overview"
  | "partners"
  | "venues"
  | "recharges"
  | "bookings"
  | "users";

export interface AdminNavItem {
  id: AdminTabId;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: LucideIcon;
  group: "command" | "network";
  badge?: number;
}

interface AdminShellProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  navItems: AdminNavItem[];
  onRefresh: () => void;
  refreshing: boolean;
  quickStats?: {
    activeVenues: number;
    pendingAlerts: number;
  };
  notifications?: OperationalNotification[];
  onMarkAllNotificationsAsRead?: () => void;
  onMarkNotificationAsRead?: (id: string) => void;
  onClearNotifications?: () => void;
  children: React.ReactNode;
}

export default function AdminShell({
  activeTab,
  onSelectTab,
  navItems,
  onRefresh,
  refreshing,
  quickStats,
  notifications,
  onMarkAllNotificationsAsRead,
  onMarkNotificationAsRead,
  onClearNotifications,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const activeMeta =
    navItems.find((item) => item.id === activeTab) ?? navItems[0];

  const openDrawer = () => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    const dialog = drawerRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setIsDrawerOpen(false);
  };

  const handleSelect = (tab: AdminTabId, fromDrawer = false) => {
    onSelectTab(tab);
    if (fromDrawer) closeDrawer();
  };

  const handleSignOut = async () => {
    closeDrawer();
    await signOut();
    router.push("/");
  };

  const renderSidebarBody = (collapsed: boolean, mobileMode = false) => (
    <div className="flex flex-col h-full">
      {/* Zone 1: Brand Header & Collapse Control */}
      <div className="h-16 px-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => handleSelect("overview", mobileMode)}
          className="flex items-center gap-2.5 min-w-0 text-right"
          title="باصيلي — المشرف العام"
        >
          {!collapsed ? (
            <div className="min-w-0">
              <span className="font-display text-lg font-black text-white leading-none block">
                باصي&zwj;<span className="text-primary">&zwj;لي</span>
              </span>
              <span className="text-[10px] font-bold text-primary block mt-0.5">
                مركز القيادة العام
              </span>
            </div>
          ) : (
            <span className="font-display text-xs font-black text-white">
              باصي&zwj;<span className="text-primary">&zwj;لي</span>
            </span>
          )}
        </button>

        {mobileMode ? (
          <button
            type="button"
            onClick={closeDrawer}
            autoFocus
            aria-label="إغلاق القائمة"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={collapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            title={collapsed ? "توسيع القائمة" : "طي القائمة"}
            className="min-h-[44px] min-w-[44px] rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] flex items-center justify-center transition-colors"
          >
            {collapsed ? (
              <PanelRightOpen className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <PanelRightClose className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      {/* Platform Health Snapshot */}
      {!collapsed && quickStats && (
        <div className="p-3 border-b border-white/[0.06] shrink-0">
          <div className="rounded-xl bg-[#141418] border border-white/[0.08] p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>الملاعب النشطة</span>
              </span>
              <span className="font-black text-white tabular-nums">
                {quickStats.activeVenues}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    quickStats.pendingAlerts > 0
                      ? "bg-amber-400"
                      : "bg-zinc-600"
                  }`}
                />
                <span>بنود تحتاج مراجعة</span>
              </span>
              <span
                className={`font-black tabular-nums ${
                  quickStats.pendingAlerts > 0
                    ? "text-amber-300"
                    : "text-zinc-400"
                }`}
              >
                {quickStats.pendingAlerts}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grouped Navigation */}
      <nav
        aria-label="أقسام لوحة المشرف العام"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
      >
        {/* Group 1: Command & Review */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              القيادة والمراجعة
            </p>
          )}
          {navItems
            .filter((item) => item.group === "command")
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id, mobileMode)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative w-full flex items-center min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
                    collapsed ? "justify-center px-0" : "justify-between"
                  } ${
                    isActive
                      ? "bg-primary/12 text-white border border-primary/25 font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute right-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-primary" : "text-zinc-400"
                      }`}
                      strokeWidth={1.5}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed &&
                    typeof item.badge === "number" &&
                    item.badge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-amber-500 text-black text-[10px] font-black tabular-nums">
                        {item.badge}
                      </span>
                    )}
                </button>
              );
            })}
        </div>

        {/* Group 2: Network & Governance */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              الشبكة والماليات
            </p>
          )}
          {navItems
            .filter((item) => item.group === "network")
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id, mobileMode)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative w-full flex items-center min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
                    collapsed ? "justify-center px-0" : "justify-between"
                  } ${
                    isActive
                      ? "bg-primary/12 text-white border border-primary/25 font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute right-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-primary" : "text-zinc-400"
                      }`}
                      strokeWidth={1.5}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed &&
                    typeof item.badge === "number" &&
                    item.badge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black tabular-nums">
                        {item.badge}
                      </span>
                    )}
                </button>
              );
            })}
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-white/[0.07] space-y-2 shrink-0 bg-[#0b0b0f]">
        {!collapsed && (
          <Link
            href="/dashboard"
            className="w-full min-h-[42px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 text-xs font-bold text-zinc-200 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span>لوحة الملاك</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          </Link>
        )}

        {!collapsed ? (
          <div className="rounded-xl bg-[#141418] border border-white/[0.06] p-2.5 space-y-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">
                  {profile?.full_name || "المشرف العام"}
                </p>
                <p className="text-[10px] text-zinc-500 truncate" dir="ltr">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/[0.06]">
              <Link
                href="/"
                className="min-h-[36px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                <span>الموقع</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-[36px] rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-bold text-rose-300 flex items-center justify-center gap-1 transition-colors"
              >
                <LogOut className="h-3 w-3" strokeWidth={1.5} />
                <span>خروج</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            title="تسجيل الخروج"
            className="w-full min-h-[44px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center justify-center transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );

  // Mobile Bottom Bar keeps 4 high-frequency destinations
  const mobileBarIds: AdminTabId[] = [
    "overview",
    "partners",
    "recharges",
    "bookings",
  ];

  return (
    <div
      className="min-h-screen bg-[#09090b] text-foreground flex selection:bg-primary/20 selection:text-primary"
      dir="rtl"
    >
      {/* Desktop Fixed RTL Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen shrink-0 bg-[#0e0e12] border-l border-white/[0.07] transition-[width] duration-200 ${
          isCollapsed ? "w-[78px]" : "w-[268px]"
        }`}
      >
        {renderSidebarBody(isCollapsed, false)}
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Top Utility Header (< 12% viewport height, single row) */}
        <header className="sticky top-0 z-30 h-16 bg-[#09090b]/92 backdrop-blur-xl border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={openDrawer}
              aria-label="فتح قائمة المشرف العام"
              aria-expanded={isDrawerOpen}
              aria-controls="admin-nav-drawer"
              className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-zinc-200 flex items-center justify-center shrink-0"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-display text-sm sm:text-base font-black text-white truncate">
                  {activeMeta?.label || "لوحة المشرف العام"}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span>المشرف العام</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 hidden sm:block truncate">
                {activeMeta?.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notifications && (
              <NotificationsPopover
                align="left"
                notifications={notifications}
                onMarkAllAsRead={onMarkAllNotificationsAsRead}
                onMarkAsRead={onMarkNotificationAsRead}
                onClearAll={onClearNotifications}
                title="تنبيهات الإدارة العليا"
                emptyMessage="جميع طلبات الانضمام وشحن المحافظ معتمدة، لا توجد طلبات معلقة حالياً"
              />
            )}

            <button
              type="button"
              disabled={refreshing}
              onClick={onRefresh}
              className="min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-[#141418] hover:bg-white/[0.06] disabled:opacity-60 border border-white/[0.08] text-zinc-200 text-xs font-bold inline-flex items-center gap-2 transition-all"
            >
              <RefreshCw
                className={`h-4 w-4 text-primary ${
                  refreshing ? "animate-spin" : ""
                }`}
                strokeWidth={1.5}
              />
              <span className="hidden sm:inline">
                {refreshing ? "جاري التحديث..." : "تحديث البيانات"}
              </span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="اختصارات المشرف العام للموبايل"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#0e0e12]/95 backdrop-blur-xl border-t border-white/[0.08] px-1.5 flex items-center justify-around"
      >
        {mobileBarIds.map((id) => {
          const item = navItems.find((n) => n.id === id);
          if (!item) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative min-h-[44px] min-w-[58px] px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                isActive ? "text-primary font-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span>{item.shortLabel}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="absolute top-1 left-2.5 h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-black text-[9px] font-black tabular-nums flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={openDrawer}
          className={`min-h-[44px] min-w-[58px] px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
            activeTab === "venues" || activeTab === "users"
              ? "text-primary font-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" strokeWidth={1.5} />
          <span>المزيد</span>
        </button>
      </nav>

      {/* Mobile Top-Layer Navigation Drawer (<dialog>) */}
      <dialog
        ref={drawerRef}
        id="admin-nav-drawer"
        aria-label="قائمة المشرف العام"
        onClick={(e) => {
          if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
            closeDrawer();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          closeDrawer();
        }}
        className="fixed inset-0 m-0 h-dvh w-screen max-w-none max-h-none border-0 bg-transparent p-0 backdrop:bg-black/75 backdrop:backdrop-blur-sm open:flex open:justify-start"
      >
        <div
          ref={sheetRef}
          className="h-full w-[min(300px,84vw)] bg-[#0e0e12] border-l border-white/10 shadow-2xl overflow-y-auto overscroll-contain"
        >
          {renderSidebarBody(false, true)}
        </div>
      </dialog>
    </div>
  );
}
