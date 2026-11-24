"use client";

import { useState, useEffect } from "react";
import { X, Wallet, AlertCircle, CheckCircle2, ShieldCheck, Phone, AtSign, Banknote } from "lucide-react";
import type { DashboardVenue } from "@/lib/api/dashboard";
import { updateVenueWallets } from "@/lib/api/dashboard";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: DashboardVenue | null;
  onSuccess: () => void;
}

export default function WalletModal({
  isOpen,
  onClose,
  venue,
  onSuccess,
}: WalletModalProps) {
  const [instapayAddress, setInstapayAddress] = useState("");
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState("");
  const [backupWalletNumber, setBackupWalletNumber] = useState("");
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (venue) {
      setInstapayAddress(venue.instapay_address || "");
      setVodafoneCashNumber(venue.vodafone_cash_number || "");
      setDepositAmount(venue.deposit_amount || 100);
      setBackupWalletNumber("");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [venue, isOpen]);

  if (!isOpen || !venue) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setIsSubmitting(true);
      const res = await updateVenueWallets({
        venueId: venue.id,
        instapayAddress: instapayAddress.trim(),
        vodafoneCashNumber: vodafoneCashNumber.trim(),
        backupWalletNumber: backupWalletNumber.trim() || undefined,
        depositAmount: depositAmount,
      });

      if (!res.success) {
        setErrorMsg(res.error || "تعذر تحديث بيانات المحافظ");
        return;
      }

      setSuccessMsg("تم تحديث بيانات المحافظ والعربون بنجاح وتفعيلها للاعبين فورياً!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                إدارة محافظ الدفع والعربون
              </h3>
              <p className="text-xs text-zinc-400">
                {venue.name} — تحديث أرقام إنستاباي وفودافون كاش
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
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Notice for Monthly Limits */}
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>
            أي رقم يتم تحديثه هنا يظهر <strong>فورياً</strong> في شاشة الدفع للاعبين عند حجز المواعيد. استخدم الرقم الاحتياطي في حال وصول محفظتك للحد الشهري الأقصى.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* InstaPay IPA */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              عنوان إنستاباي (InstaPay Address / IPA)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: name@instapay"
                value={instapayAddress}
                onChange={(e) => setInstapayAddress(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                dir="ltr"
              />
              <AtSign className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            </div>
          </div>

          {/* Vodafone Cash */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              رقم فودافون كاش الأساسي
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="010XXXXXXXX"
                value={vodafoneCashNumber}
                onChange={(e) => setVodafoneCashNumber(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                dir="ltr"
              />
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            </div>
          </div>

          {/* Backup Wallet */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              رقم المحفظة الاحتياطية (اختياري عند امتلاء المحفظة الأساسية)
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="01XXXXXXXXX (محفظة بديلة)"
                value={backupWalletNumber}
                onChange={(e) => setBackupWalletNumber(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                dir="ltr"
              />
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            </div>
          </div>

          {/* Deposit Amount */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              قيمة العربون الإلزامي لتأكيد الحجز (ج.م)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="25"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-bold text-primary placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-all tabular-nums text-left"
                dir="ltr"
                required
              />
              <Banknote className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">
              العربون الافتراضي المعتمد في دمنهور هو 100 ج.م لضمان الجدية.
            </span>
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs sm:text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
              <span>{isSubmitting ? "جاري الحفظ..." : "حفظ وتفعيل الأرقام الجديدة"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
