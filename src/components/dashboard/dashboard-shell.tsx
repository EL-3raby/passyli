"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  FileCheck2,
  Sliders,
  Wallet,
  Settings,
  Search,
  Plus,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Building2,
  PanelRightClose,
  PanelRightOpen,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useDashboard } from "@/components/dashboard/dashboard-provider";

interface NavItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  group: "ops" | "manage";
  badgeCount?: number;
}

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "الجدول اليومي",
    subtitle: "إدارة مواعيد اليوم والحجوزات الفورية",
  },
  "/dashboard/receipts": {
    title: "مراجعة الإيصالات",
    subtitle: "التحقق من إيصالات إنستا باي وفودافون كاش",
  },
  "/dashboard/courts": {
    title: "الملاعب والأسعار",
    subtitle: "إعداد الساعات والأسعار وحالة الصيانة",
  },
  "/dashboard/wallet": {
    title: "المحفظة والعمولات",
    subtitle: "رصيد العمولات المسبق وحسابات استلام العربون",
  },
  "/dashboard/settings": {
    title: "الموظفين والإعدادات",
    subtitle: "رمز دخول الاستقبال وتفضيلات التشغيل",
  },
};

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const {
    venues,
    selectedVenueId,
    setSelectedVenueId,
    selectedVenue,
    pendingCount,
    isStaffMode,
    toggleStaffMode,
    soundEnabled,
    toggleSound,
    newReceiptBanner,
    dismissReceiptBanner,
    openWalkinModal,
    openSearchModal,
  } = useDashboard();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const navItems: NavItem[] = [
    {
      label: "الجدول اليومي",
      shortLabel: "الجدول",
      href: "/dashboard",
      icon: Calendar,
      group: "ops",
    },
    {
      label: "مراجعة الإيصالات",
      shortLabel: "الإيصالات",
      href: "/dashboard/receipts",
      icon: FileCheck2,
      group: "ops",
      badgeCount: pendingCount,
    },
    {
      label: "الملاعب والأسعار",
      shortLabel: "الملاعب",
      href: "/dashboard/courts",
      icon: Sliders,
      group: "manage",
    },
    {
      label: "المحفظة والعمولات",
      shortLabel: "المحفظة",
      href: "/dashboard/wallet",
      icon: Wallet,
      group: "manage",
    },
    {
      label: "الموظفين والإعدادات",
      shortLabel: "الإعدادات",
      href: "/dashboard/settings",
      icon: Settings,
      group: "manage",
    },
  ];

  const pageMeta = ROUTE_TITLES[pathname || "/dashboard"] ?? {
    title: "لوحة إدارة المنشأة",
    subtitle: "إدارة الحجوزات والتشغيل",
  };

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

  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  const handleSignOut = async () => {
    closeDrawer();
    await signOut();
    router.push("/");
  };

  const lowBalanceThreshold = Math.max(
    30,
    (selectedVenue?.commission_per_slot || 15) * 2
  );
  const isLowBalance =
    typeof selectedVenue?.prepaid_balance === "number" &&
    selectedVenue.prepaid_balance <= lowBalanceThreshold;

  const renderSidebarBody = (collapsed: boolean, mobileMode = false) => (
    <div className="flex flex-col h-full">
      {/* Zone 1: Brand Header & Collapse Control */}
      <div className="h-16 px-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 min-w-0"
          title="باصيلي — لوحة الشريك"
        >
          <span className="h-9 w-9 rounded-xl bg-[#09090b] border border-primary/50 flex items-center justify-center shrink-0 shadow-sm">
            <svg
              viewBox="0 0 32 32"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M11 7h7.5a5.5 5.5 0 0 1 0 11H13l-1.5 7H8l3-18Z"
                fill="#10b981"
                transform="skewX(-12)"
              />
              <circle cx="17.5" cy="12.5" r="2.2" fill="#ffffff" />
            </svg>
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-display text-lg font-black text-white leading-none block">
                باصي&zwj;<span className="text-primary">&zwj;لي</span>
              </span>
              <span className="text-[10px] font-bold text-zinc-400 block mt-0.5">
                بوابة الشريك
              </span>
            </div>
          )}
        </Link>

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

      {/* Workspace / Venue Switcher + Prepaid Balance */}
      {!collapsed && (
        <div className="p-3 border-b border-white/[0.06] space-y-2.5 shrink-0">
          <div className="rounded-xl bg-[#141418] border border-white/[0.08] p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
              <span className="text-[10px] font-bold text-zinc-400">
                المنشأة النشطة
              </span>
            </div>
            {venues.length > 1 ? (
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                aria-label="اختيار المنشأة"
                className="w-full bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer truncate"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#18181c] text-white">
                    {v.name} — {v.city}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs font-black text-white truncate">
                {selectedVenue ? `${selectedVenue.name} — ${selectedVenue.city}` : "لا توجد منشآت"}
              </p>
            )}
          </div>

          {!isStaffMode && selectedVenue && (
            <Link
              href="/dashboard/wallet"
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 border transition-all min-h-[44px] ${
                isLowBalance
                  ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
                  : "bg-emerald-500/[0.08] border-emerald-500/20 hover:bg-emerald-500/15"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Coins
                  className={`h-4 w-4 shrink-0 ${
                    isLowBalance ? "text-amber-400" : "text-emerald-400"
                  }`}
                  strokeWidth={1.5}
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-400 font-bold block leading-none">
                    رصيد العمولات
                  </span>
                  <span
                    className={`text-xs font-black tabular-nums block mt-0.5 ${
                      isLowBalance ? "text-amber-300" : "text-emerald-400"
                    }`}
                  >
                    {selectedVenue.prepaid_balance} ج.م
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                  isLowBalance
                    ? "bg-amber-400 text-black"
                    : "bg-white/[0.07] text-zinc-200"
                }`}
              >
                {isLowBalance ? "شحن عاجل" : "المحفظة"}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Zone 2: Quick Search Trigger */}
      <div className="px-3 pt-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (mobileMode) closeDrawer();
            openSearchModal();
          }}
          title="بحث سريع عن حجز أو لاعب (Ctrl+K)"
          className={`w-full min-h-[44px] rounded-xl bg-[#141418] hover:bg-[#191920] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center transition-all ${
            collapsed ? "justify-center px-0" : "justify-between px-3"
          }`}
        >
          <span className="flex items-center gap-2 text-xs font-bold">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>بحث عن حجز...</span>}
          </span>
          {!collapsed && (
            <kbd
              dir="ltr"
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.06]"
            >
              Ctrl K
            </kbd>
          )}
        </button>
      </div>

      {/* Zone 3: Grouped Navigation */}
      <nav
        aria-label="التنقل الرئيسي في لوحة الإدارة"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
      >
        {/* Group 1: Daily Ops */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              التشغيل اليومي
            </p>
          )}
          {navItems
            .filter((item) => item.group === "ops")
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
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
                    typeof item.badgeCount === "number" &&
                    item.badgeCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-amber-500 text-black text-[10px] font-black tabular-nums">
                        {item.badgeCount}
                      </span>
                    )}
                </Link>
              );
            })}
        </div>

        {/* Group 2: Facility & Finance */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              المنشأة والماليات
            </p>
          )}
          {navItems
            .filter((item) => item.group === "manage")
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
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
                </Link>
              );
            })}
        </div>
      </nav>

      {/* Zone 4: Sidebar Footer (Privacy + Profile + Site Exit) */}
      <div className="p-3 border-t border-white/[0.07] space-y-2 shrink-0 bg-[#0b0b0f]">
        <button
          type="button"
          onClick={toggleStaffMode}
          title={
            isStaffMode
              ? "وضع الخصوصية نشط (الأرباح مخفية) — اضغط لإظهارها"
              : "وضع المالك نشط — اضغط لإخفاء الأرباح أمام الموظفين"
          }
          className={`w-full min-h-[44px] rounded-xl border text-xs font-bold flex items-center transition-all ${
            collapsed ? "justify-center px-0" : "justify-between px-3"
          } ${
            isStaffMode
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            {isStaffMode ? (
              <EyeOff className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />
            ) : (
              <Eye className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
            )}
            {!collapsed && (
              <span>{isStaffMode ? "الأرباح مخفية" : "وضع المالك"}</span>
            )}
          </span>
          {!collapsed && (
            <span
              className={`h-2 w-2 rounded-full ${
                isStaffMode ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
          )}
        </button>

        {!collapsed ? (
          <div className="rounded-xl bg-[#141418] border border-white/[0.06] p-2.5 space-y-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 text-primary font-black text-xs flex items-center justify-center shrink-0">
                {(profile?.full_name || user?.email || "M")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">
                  {profile?.full_name || "صاحب المنشأة"}
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
              aria-label="فتح قائمة لوحة الإدارة"
              aria-expanded={isDrawerOpen}
              aria-controls="dashboard-nav-drawer"
              className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-zinc-200 flex items-center justify-center shrink-0"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-display text-sm sm:text-base font-black text-white truncate">
                  {pageMeta.title}
                </h1>
                {selectedVenue && (
                  <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
                    <span className="h-1 w-1 rounded-full bg-zinc-600" />
                    <span className="truncate max-w-[180px]">{selectedVenue.name}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 hidden sm:block truncate">
                {pageMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Clean Utility Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openSearchModal}
              title="بحث سريع عن حجز (Ctrl+K)"
              aria-label="بحث سريع عن حجز"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-all"
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? "كتم تنبيه الإيصالات" : "تفعيل صوت الإيصالات"}
              aria-label={soundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-all ${
                soundEnabled
                  ? "bg-primary/10 border-primary/25 text-primary"
                  : "bg-white/[0.04] border-white/[0.08] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <VolumeX className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>

            <button
              type="button"
              onClick={() => openWalkinModal()}
              className="min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs inline-flex items-center gap-1.5 transition-all shadow-[0_2px_14px_rgba(16,185,129,0.28)]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">حجز كاش سريع</span>
              <span className="sm:hidden">حجز كاش</span>
            </button>
          </div>
        </header>

        {/* Live New Receipt Non-Blocking Toast Banner */}
        {newReceiptBanner && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl w-full mx-auto">
            <div
              role="status"
              className="p-3.5 rounded-2xl bg-primary/15 border border-primary/35 text-xs sm:text-sm text-white flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 font-bold">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping shrink-0" />
                <span>وصل إيصال تحويل جديد من لاعب الآن.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/receipts"
                  onClick={dismissReceiptBanner}
                  className="min-h-[36px] px-3 rounded-lg bg-primary text-black font-black text-xs inline-flex items-center"
                >
                  مراجعة الإيصال
                </Link>
                <button
                  type="button"
                  onClick={dismissReceiptBanner}
                  aria-label="إغلاق الإشعار"
                  className="min-h-[36px] min-w-[36px] rounded-lg bg-white/10 text-zinc-300 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Portal Tab Bar (4 core tabs + More drawer trigger) */}
      <nav
        aria-label="اختصارات لوحة الإدارة للموبايل"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#0e0e12]/95 backdrop-blur-xl border-t border-white/[0.08] px-1.5 flex items-center justify-around"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative min-h-[44px] min-w-[58px] px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                isActive ? "text-primary font-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span>{item.shortLabel}</span>
              {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                <span className="absolute top-1 left-2.5 h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-black text-[9px] font-black tabular-nums flex items-center justify-center">
                  {item.badgeCount}
                </span>
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openDrawer}
          className={`min-h-[44px] min-w-[58px] px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
            pathname === "/dashboard/settings"
              ? "text-primary font-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} />
          <span>المزيد</span>
        </button>
      </nav>

      {/* Mobile Top-Layer Navigation Drawer (<dialog>) */}
      <dialog
        ref={drawerRef}
        id="dashboard-nav-drawer"
        aria-label="قائمة لوحة الإدارة"
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
