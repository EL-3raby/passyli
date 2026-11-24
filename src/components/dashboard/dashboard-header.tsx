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
} from "lucide-react";

interface DashboardHeaderProps {
  venuesCount: number;
  pendingReceiptsCount: number;
  isStaffMode: boolean;
  onToggleStaffMode: () => void;
  onOpenWalkin: () => void;
  onOpenMaintenance: () => void;
  onOpenSearch?: () => void;
  onOpenRunningSheet?: () => void;
}

export default function DashboardHeader({
  venuesCount,
  pendingReceiptsCount,
  isStaffMode,
  onToggleStaffMode,
  onOpenWalkin,
  onOpenMaintenance,
  onOpenSearch,
  onOpenRunningSheet,
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

          {/* Maintenance Modal Trigger */}
          <button
            type="button"
            onClick={onOpenMaintenance}
            title="طوارئ الصيانة والطقس"
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all"
          >
            <Wrench className="h-4 w-4" strokeWidth={1.5} />
          </button>

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
