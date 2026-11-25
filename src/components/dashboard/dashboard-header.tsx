"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileCheck2,
  Plus,
  Wrench,
  Eye,
  EyeOff,
  Building2,
  ExternalLink,
  Search,
  Printer,
  Wallet,
  KeyRound,
  Coins,
  Sliders,
  Repeat,
  Volume2,
  VolumeX,
} from "lucide-react";
import NotificationsPopover, {
  type OperationalNotification,
} from "@/components/shared/notifications-popover";

interface DashboardHeaderProps {
  venuesCount: number;
  pendingReceiptsCount: number;
  isStaffMode: boolean;
  prepaidBalance?: number;
  commissionPerSlot?: number;
  soundEnabled?: boolean;
  notifications?: OperationalNotification[];
  onMarkAllNotificationsAsRead?: () => void;
  onMarkNotificationAsRead?: (id: string) => void;
  onClearNotifications?: () => void;
  onToggleStaffMode: () => void;
  onOpenWalkin: () => void;
  onOpenMaintenance: () => void;
  onOpenSearch?: () => void;
  onOpenRunningSheet?: () => void;
  onOpenWallets?: () => void;
  onOpenPrepaidWallet?: () => void;
  onOpenStaffPin?: () => void;
  onOpenCourtSettings?: () => void;
  onOpenRecurring?: () => void;
  onToggleSound?: () => void;
}

export default function DashboardHeader({
  venuesCount,
  pendingReceiptsCount,
  isStaffMode,
  prepaidBalance,
  commissionPerSlot = 15,
  soundEnabled = true,
  notifications,
  onMarkAllNotificationsAsRead,
  onMarkNotificationAsRead,
  onClearNotifications,
  onToggleStaffMode,
  onOpenWalkin,
  onOpenMaintenance,
  onOpenSearch,
  onOpenRunningSheet,
  onOpenWallets,
  onOpenPrepaidWallet,
  onOpenStaffPin,
  onOpenCourtSettings,
  onOpenRecurring,
  onToggleSound,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const isTimelineActive = pathname === "/dashboard";
  const isReceiptsActive = pathname === "/dashboard/receipts";

  return (
    <header className="sticky top-0 z-40 w-full bg-[#141418]/95 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand & Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center group py-1">
            <span className="font-display text-xl sm:text-2xl font-black tracking-normal text-white leading-none">
              باصي&zwj;<span className="text-primary">&zwj;لي</span>
            </span>
          </Link>
          <span className="h-4 w-[1px] bg-white/20 hidden sm:block" aria-hidden="true" />
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.06] hidden sm:inline-flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-primary" strokeWidth={1.5} />
            <span>لوحة الملاعب والموظفين</span>
          </span>
        </div>

        {/* Center Tabs Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/dashboard"
            className={`inline-flex min-h-[38px] items-center gap-1.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              isTimelineActive
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            <span>الجدول الزمني</span>
          </Link>

          <Link
            href="/dashboard/receipts"
            className={`inline-flex min-h-[38px] items-center gap-1.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
              isReceiptsActive
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <FileCheck2 className="h-4 w-4" strokeWidth={1.5} />
            <span>مراجعة الإيصالات</span>
            {pendingReceiptsCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-amber-500 text-[10px] font-black text-black tabular-nums">
                {pendingReceiptsCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Realtime Operational Notifications Center */}
          {notifications && (
            <NotificationsPopover
              notifications={notifications}
              onMarkAllAsRead={onMarkAllNotificationsAsRead}
              onMarkAsRead={onMarkNotificationAsRead}
              onClearAll={onClearNotifications}
              title="تنبيهات المنشأة الحية"
              emptyMessage="جميع الإيصالات والحجوزات مراجعة، لا توجد تنبيهات معلقة حالياً"
            />
          )}

          {/* Quick Search */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              title="بحث سريع عن حجز أو كابتن"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all"
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          {/* Running Sheet Print */}
          {onOpenRunningSheet && (
            <button
              type="button"
              onClick={onOpenRunningSheet}
              title="كشف تشغيل اليوم (طباعة / معاينة)"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all"
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          {/* Staff Mode Toggle */}
          <button
            type="button"
            onClick={onToggleStaffMode}
            title={isStaffMode ? "تفعيل وضع المالك (إظهار الأرباح)" : "تفعيل وضع موظف الاستقبال (إخفاء الأرباح)"}
            className={`inline-flex min-h-[38px] items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
              isStaffMode
                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                : "bg-white/[0.04] text-zinc-300 hover:text-white border-white/[0.08]"
            }`}
          >
            {isStaffMode ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                <span className="hidden md:inline">وضع الموظف (الأرباح مخفية)</span>
                <span className="md:hidden">الموظف</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                <span className="hidden md:inline">وضع المالك (الأرباح ظاهرة)</span>
                <span className="md:hidden">المالك</span>
              </>
            )}
          </button>

          {/* Sound Chime Toggle */}
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? "كتم جرس الإيصالات الواردة" : "تفعيل جرس تنبيه الإيصالات الواردة"}
              className={`inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border transition-all ${
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
          )}

          {/* Recurring Weekly Slot Modal (Owner Mode Only) */}
          {!isStaffMode && onOpenRecurring && (
            <button
              type="button"
              onClick={onOpenRecurring}
              title="حجز ساعات أسبوعية ثابتة ومتكررة"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-primary transition-all"
            >
              <Repeat className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          {/* Court Pricing & Add Court Modal (Owner Mode Only) */}
          {!isStaffMode && onOpenCourtSettings && (
            <button
              type="button"
              onClick={onOpenCourtSettings}
              title="إدارة أسعار الساعات وإضافة ملاعب فرعية"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-primary transition-all"
            >
              <Sliders className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          {/* Maintenance Modal Trigger */}
          <button
            type="button"
            onClick={onOpenMaintenance}
            title="طوارئ الصيانة والطقس"
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all"
          >
            <Wrench className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Prepaid Balance Pill (Owner Mode Only) */}
          {!isStaffMode && onOpenPrepaidWallet && typeof prepaidBalance === "number" && (
            <button
              type="button"
              onClick={onOpenPrepaidWallet}
              title="رصيد محفظة باصيلي مسبق الدفع وشحن الرصيد"
              className={`inline-flex min-h-[38px] items-center gap-1.5 px-3 rounded-xl border text-xs font-black tabular-nums transition-all ${
                prepaidBalance <= Math.max(30, commissionPerSlot * 2)
                  ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-300"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <Coins className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span>{prepaidBalance} ج.م</span>
            </button>
          )}

          {/* Staff PIN Button (Owner Mode Only) */}
          {!isStaffMode && onOpenStaffPin && (
            <button
              type="button"
              onClick={onOpenStaffPin}
              title="إدارة رمز PIN الخاص بموظف الدكة"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-amber-300 transition-all"
            >
              <KeyRound className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          {/* Wallets Settings Trigger */}
          {onOpenWallets && (
            <button
              type="button"
              onClick={onOpenWallets}
              title="إدارة أرقام إنستاباي وفودافون كاش للملعب"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all"
            >
              <Wallet className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          {/* Walk-in Fast Booking Button */}
          <button
            type="button"
            onClick={onOpenWalkin}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 text-xs font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">حجز كاش سريع</span>
            <span className="sm:hidden">كاش</span>
          </button>
        </div>

      </div>
    </header>
  );
}
