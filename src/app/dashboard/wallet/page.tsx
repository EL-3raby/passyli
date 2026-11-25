"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Coins,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  AtSign,
  Phone,
  Banknote,
  Building2,
} from "lucide-react";
import { compressImageClient } from "@/lib/api/bookings";
import {
  getVenueWalletDetails,
  submitVenueRechargeRequest,
  uploadRechargeReceiptImage,
  updateVenueWallets,
  type VenueWalletDetails,
} from "@/lib/api/dashboard";
import { useDashboard } from "@/components/dashboard/dashboard-provider";

const PLATFORM_INSTAPAY = "passyli@instapay";
const PLATFORM_VODAFONE = "01099001122";

const TX_TYPE_LABELS: Record<string, string> = {
  welcome_bonus: "رصيد ترحيبي",
  recharge: "شحن رصيد معتمد",
  commission_deduction: "خصم عمولة حجز أونلاين",
  admin_adjustment: "تسوية إدارية",
};

export default function DashboardWalletPage() {
  const {
    venues,
    selectedVenue,
    isLoadingVenues,
    isStaffMode,
    setStaffMode,
    realtimeTick,
    triggerRealtimeRefresh,
  } = useDashboard();

  const [details, setDetails] = useState<VenueWalletDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Prepaid Recharge State
  const [amount, setAmount] = useState<number>(300);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalKB: number;
    compressedKB: number;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);
  const [rechargeError, setRechargeError] = useState<string | null>(null);
  const [rechargeSuccess, setRechargeSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Receiving Deposit Wallets State
  const [instapayAddress, setInstapayAddress] = useState("");
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState("");
  const [backupWalletNumber, setBackupWalletNumber] = useState("");
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [isSavingWallets, setIsSavingWallets] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletSuccess, setWalletSuccess] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!selectedVenue?.id) return;
    setLoadingDetails(true);
    const res = await getVenueWalletDetails(selectedVenue.id);
    if (res.success) {
      setDetails(res);
    }
    setLoadingDetails(false);
  }, [selectedVenue?.id]);

  useEffect(() => {
    if (selectedVenue) {
      setInstapayAddress(selectedVenue.instapay_address || "");
      setVodafoneCashNumber(selectedVenue.vodafone_cash_number || "");
      setDepositAmount(selectedVenue.deposit_amount || 100);
      setBackupWalletNumber("");
      setWalletError(null);
      setWalletSuccess(null);
      void loadDetails();
    }
  }, [selectedVenue, loadDetails, realtimeTick]);

  const handleCopy = (val: string, key: string) => {
    void navigator.clipboard.writeText(val);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRechargeError(null);
    setIsCompressing(true);

    try {
      const compressed = await compressImageClient(file, 195 * 1024);
      setCompressedBlob(compressed.blob);
      setCompressionInfo({
        originalKB: Math.round(compressed.originalSize / 1024),
        compressedKB: Math.round(compressed.compressedSize / 1024),
      });
      setPreviewUrl(URL.createObjectURL(compressed.blob));
    } catch (err) {
      setRechargeError(
        err instanceof Error ? err.message : "تعذر معالجة صورة الإيصال"
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmitRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;
    setRechargeError(null);
    setRechargeSuccess(null);

    if (amount < 50) {
      setRechargeError("الحد الأدنى لطلب شحن المحفظة هو 50 ج.م.");
      return;
    }
    if (!compressedBlob) {
      setRechargeError("يرجى إرفاق صورة إيصال التحويل أولاً.");
      return;
    }

    setIsSubmittingRecharge(true);
    const upload = await uploadRechargeReceiptImage(
      selectedVenue.id,
      compressedBlob
    );
    if (!upload.url) {
      setIsSubmittingRecharge(false);
      setRechargeError(upload.error || "تعذر رفع صورة الإيصال");
      return;
    }

    const res = await submitVenueRechargeRequest({
      venueId: selectedVenue.id,
      amount,
      receiptUrl: upload.url,
      referenceNumber: referenceNumber.trim() || undefined,
    });
    setIsSubmittingRecharge(false);

    if (!res.success) {
      setRechargeError(res.error || "تعذر إرسال طلب الشحن");
      return;
    }

    setRechargeSuccess(
      "تم استلام طلب الشحن وإيصال التحويل بنجاح! سيقوم فريق الإدارة بمراجعته وإضافة الرصيد فوراً."
    );
    setCompressedBlob(null);
    setCompressionInfo(null);
    setPreviewUrl(null);
    setReferenceNumber("");
    triggerRealtimeRefresh();
    await loadDetails();
  };

  const handleSaveWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;
    setWalletError(null);
    setWalletSuccess(null);
    setIsSavingWallets(true);

    const res = await updateVenueWallets({
      venueId: selectedVenue.id,
      instapayAddress: instapayAddress.trim(),
      vodafoneCashNumber: vodafoneCashNumber.trim(),
      backupWalletNumber: backupWalletNumber.trim() || undefined,
      depositAmount,
    });
    setIsSavingWallets(false);

    if (!res.success) {
      setWalletError(res.error || "تعذر تحديث بيانات المحافظ");
      return;
    }

    setWalletSuccess("تم حفظ حسابات استلام العربون وقيمة العربون للاعبين بنجاح.");
    triggerRealtimeRefresh();
  };

  if (isLoadingVenues) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 rounded-2xl bg-[#141418]/70 animate-pulse border border-white/[0.06]" />
        <div className="h-80 rounded-2xl bg-[#141418]/70 animate-pulse border border-white/[0.06]" />
      </div>
    );
  }

  if (venues.length === 0 || !selectedVenue) {
    return (
      <div className="text-center py-16 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4">
        <Building2
          className="h-10 w-10 text-primary mx-auto"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-black text-white">
          لا توجد منشآت مربوطة بحسابك حالياً
        </h2>
        <Link
          href="/partner"
          className="inline-flex min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs items-center"
        >
          تقديم طلب شراكة
        </Link>
      </div>
    );
  }

  if (isStaffMode) {
    return (
      <div className="rounded-2xl bg-[#141418] border border-amber-500/30 p-8 text-center space-y-4 max-w-lg mx-auto my-8">
        <ShieldCheck
          className="h-10 w-10 text-amber-400 mx-auto"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-black text-white">
          البيانات المالية محمية في وضع الموظف
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          تم إخفاء رصيد المحفظة وأرقام الحسابات البنكية لخصوصية المنشأة. للوصول إلى المحفظة قم بالتبديل إلى وضع المالك.
        </p>
        <button
          type="button"
          onClick={() => setStaffMode(false)}
          className="min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs"
        >
          تفعيل وضع المالك (إظهار المالية)
        </button>
      </div>
    );
  }

  const balance = details?.prepaid_balance ?? selectedVenue.prepaid_balance ?? 0;
  const commission =
    details?.commission_per_slot ?? selectedVenue.commission_per_slot ?? 15;
  const remainingSlots =
    commission > 0 ? Math.floor(balance / commission) : 999;
  const isLowBalance = balance <= Math.max(30, commission * 2);

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-4 sm:p-5 rounded-2xl border ${
            isLowBalance
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-emerald-500/10 border-emerald-500/25"
          }`}
        >
          <span className="text-xs font-bold text-zinc-300 block mb-1">
            رصيد العمولات المتاح
          </span>
          <span
            className={`text-2xl font-black tabular-nums ${
              isLowBalance ? "text-amber-300" : "text-emerald-400"
            }`}
          >
            {balance} ج.م
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-white/[0.08]">
          <span className="text-xs font-bold text-zinc-400 block mb-1">
            عمولة المنصة لكل حجز أونلاين
          </span>
          <span className="text-2xl font-black text-white tabular-nums">
            {commission} ج.م
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-white/[0.08]">
          <span className="text-xs font-bold text-zinc-400 block mb-1">
            الحجوزات الأونلاين المتبقية بالرصيد
          </span>
          <span className="text-2xl font-black text-primary tabular-nums">
            {remainingSlots} حجز
          </span>
        </div>
      </div>

      {/* Main 2-Column Financial Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Start: Prepaid Recharge + Ledger */}
        <section className="xl:col-span-7 space-y-6">
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Coins className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white">
                  شحن محفظة باصيلي المسبقة
                </h2>
                <p className="text-xs text-zinc-400">
                  تُخصم العمولة فقط عند اعتماد حجز أونلاين، وحجوزات الكاش بالملعب مجانية 100%
                </p>
              </div>
            </div>

            {rechargeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{rechargeError}</span>
              </div>
            )}

            {rechargeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{rechargeSuccess}</span>
              </div>
            )}

            {/* Platform Accounts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#0e0e11] border border-white/[0.08] p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] text-zinc-400 block">
                    إنستاباي باصيلي
                  </span>
                  <span
                    dir="ltr"
                    className="text-xs font-black text-white truncate block"
                  >
                    {PLATFORM_INSTAPAY}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(PLATFORM_INSTAPAY, "instapay")}
                  aria-label="نسخ حساب إنستاباي"
                  className="min-h-[40px] min-w-[40px] rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 flex items-center justify-center shrink-0"
                >
                  {copiedKey === "instapay" ? (
                    <Check className="h-4 w-4 text-primary" strokeWidth={2} />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-[#0e0e11] border border-white/[0.08] p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] text-zinc-400 block">
                    فودافون كاش باصيلي
                  </span>
                  <span
                    dir="ltr"
                    className="text-xs font-black text-white tabular-nums block"
                  >
                    {PLATFORM_VODAFONE}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(PLATFORM_VODAFONE, "vodafone")}
                  aria-label="نسخ رقم فودافون كاش"
                  className="min-h-[40px] min-w-[40px] rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 flex items-center justify-center shrink-0"
                >
                  {copiedKey === "vodafone" ? (
                    <Check className="h-4 w-4 text-primary" strokeWidth={2} />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitRecharge} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    مبلغ الشحن (ج.م)
                  </label>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-sm font-black text-white tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    رقم مرجع التحويل (اختياري)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Ref / Transaction ID"
                    className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white placeholder:text-zinc-600 tabular-nums text-left focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 hover:border-primary/60 bg-[#0e0e11] p-5 cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {isCompressing ? (
                  <>
                    <Loader2 className="h-6 w-6 text-primary animate-spin" strokeWidth={1.5} />
                    <span className="text-xs text-zinc-400">جاري ضغط الصورة...</span>
                  </>
                ) : previewUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="معاينة الإيصال"
                      className="max-h-36 rounded-xl border border-white/10 object-contain"
                    />
                    {compressionInfo && (
                      <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
                        جاهز للرفع ({compressionInfo.compressedKB}KB بدلاً من{" "}
                        {compressionInfo.originalKB}KB)
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-primary" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-zinc-300">
                      اضغط لاختيار سكرين شوت إيصال الشحن
                    </span>
                  </>
                )}
              </label>

              <button
                type="submit"
                disabled={isSubmittingRecharge || isCompressing || !compressedBlob}
                className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all"
              >
                {isSubmittingRecharge ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                )}
                <span>
                  {isSubmittingRecharge ? "جاري إرسال الطلب..." : "إرسال طلب شحن المحفظة"}
                </span>
              </button>
            </form>
          </div>

          {/* Ledger & Recharge Requests History */}
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4">
            <h3 className="text-sm font-black text-white border-b border-white/[0.06] pb-3">
              سجل الحركات المالية وطلبات الشحن
            </h3>

            {loadingDetails ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-14 rounded-xl bg-white/[0.05]" />
                <div className="h-14 rounded-xl bg-white/[0.05]" />
              </div>
            ) : (
              <div className="space-y-4">
                {details && details.recharges.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-400 block">
                      طلبات الشحن الأخيرة
                    </span>
                    {details.recharges.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl bg-[#0e0e11] border border-white/[0.06] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-black text-white tabular-nums">
                            +{r.amount} ج.م
                          </span>
                          {r.reference_number && (
                            <span className="text-zinc-400 mr-2 tabular-nums">
                              ({r.reference_number})
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            r.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : r.status === "rejected"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                          }`}
                        >
                          {r.status === "approved"
                            ? "معتمد"
                            : r.status === "rejected"
                            ? "مرفوض"
                            : "قيد المراجعة"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 block">
                    حركات الخصم والإضافة
                  </span>
                  {!details || details.transactions.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">
                      لا توجد حركات مسجلة في محفظة المنشأة حتى الآن.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {details.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="rounded-xl bg-[#0e0e11] border border-white/[0.06] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">
                              {tx.description}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {TX_TYPE_LABELS[tx.type] ?? tx.type} •{" "}
                              {new Date(tx.created_at).toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                          <div className="text-left shrink-0 tabular-nums">
                            <span
                              dir="ltr"
                              className={`font-black block ${
                                tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} ج.م
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              الرصيد: {tx.balance_after}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right/End: Venue Deposit Receiving Wallets */}
        <section className="xl:col-span-5 rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                حسابات استلام العربون
              </h2>
              <p className="text-xs text-zinc-400">
                تظهر للاعبين لتحويل العربون مباشرة إلى حسابك
              </p>
            </div>
          </div>

          {walletError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{walletError}</span>
            </div>
          )}

          {walletSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{walletSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveWallets} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                <AtSign className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                <span>عنوان إنستا باي (InstaPay)</span>
              </label>
              <input
                type="text"
                dir="ltr"
                value={instapayAddress}
                onChange={(e) => setInstapayAddress(e.target.value)}
                placeholder="name@instapay"
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white text-left focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3.5 w-3.5 text-rose-400" strokeWidth={1.5} />
                <span>رقم فودافون كاش</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                value={vodafoneCashNumber}
                onChange={(e) => setVodafoneCashNumber(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums text-left focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>محفظة احتياطية إضافية (اختياري)</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                value={backupWalletNumber}
                onChange={(e) => setBackupWalletNumber(e.target.value)}
                placeholder="011 / 012 / 015..."
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums text-left focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                <Banknote className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                <span>قيمة العربون المطلوب للحجز (ج.م)</span>
              </label>
              <input
                type="number"
                min={20}
                step={10}
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-sm font-black text-white tabular-nums focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingWallets}
              className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
            >
              {isSavingWallets ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              )}
              <span>حفظ بيانات المحافظ والعربون</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
