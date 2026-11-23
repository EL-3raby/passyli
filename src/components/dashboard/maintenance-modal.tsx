"use client";

import { useState } from "react";
import { X, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DashboardCourt } from "@/lib/api/dashboard";
import { toggleCourtMaintenance } from "@/lib/api/dashboard";

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: DashboardCourt[];
  onMaintenanceSuccess: () => void;
}

export default function MaintenanceModal({
  isOpen,
  onClose,
  courts,
  onMaintenanceSuccess,
}: MaintenanceModalProps) {
  const [togglingCourtId, setTogglingCourtId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = async (court: DashboardCourt) => {
    try {
      setTogglingCourtId(court.id);
      setErrorMsg(null);
      const res = await toggleCourtMaintenance(court.id, !court.is_active);
      if (!res.success) {
        setErrorMsg(res.error || "تعذر تغيير حالة الصيانة للملعب");
        return;
      }
      onMaintenanceSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع");
    } finally {
      setTogglingCourtId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                طوارئ الصيانة والظروف الجوية
              </h3>
              <p className="text-xs text-zinc-400">
                إيقاف أو تفعيل حجز الملاعب في الحالات الطارئة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Info notice */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>
            عند تفعيل وضع الصيانة، يتم إخفاء الملعب فورياً من محرك الحجز العام للاعبين لمنع الحجوزات الجديدة أثناء المطر أو صيانة النجيل والكشافات.
          </span>
        </div>

        {/* Courts List */}
        <div className="space-y-2.5">
          {courts.map((court) => {
            const isProcessing = togglingCourtId === court.id;
            return (
              <div
                key={court.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] hover:border-white/10 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{court.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 font-bold">
                      {court.sport === "football" ? "خماسي" : "بادل"}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    الحالة الحالية:{" "}
                    {court.is_active ? (
                      <span className="text-primary font-bold">متاح ونشط للجمهور</span>
                    ) : (
                      <span className="text-amber-400 font-bold">معطل للصيانة (مغلق)</span>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleToggle(court)}
                  className={`inline-flex min-h-[44px] items-center justify-center px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                    court.is_active
                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20"
                      : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                  }`}
                >
                  {isProcessing
                    ? "جاري التحديث..."
                    : court.is_active
                    ? "إيقاف للصيانة"
                    : "إعادة تفعيل الملعب"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-200 transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
