"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  Wallet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  History,
  ArrowUpRight,
} from "lucide-react";
import { compressImageClient } from "@/lib/api/bookings";
import {
  getVenueWalletDetails,
  submitVenueRechargeRequest,
  uploadRechargeReceiptImage,
  type DashboardVenue,
  type VenueWalletDetails,
} from "@/lib/api/dashboard";

interface PrepaidWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: DashboardVenue | null;
  onRechargeSubmitted: () => void;
}

const PLATFORM_INSTAPAY = "passyli@instapay";
const PLATFORM_VODAFONE = "01099001122";

const TX_TYPE_LABELS: Record<string, string> = {
  welcome_bonus: "رصيد ترحيبي",
  recharge: "شحن رصيد معتمد",
  commission_deduction: "خصم عمولة حجز أونلاين",
  admin_adjustment: "تسوية إدارية",
};

export default function PrepaidWalletModal({
  isOpen,
  onClose,
  venue,
  onRechargeSubmitted,
}: PrepaidWalletModalProps) {
  const [details, setDetails] = useState<VenueWalletDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"recharge" | "history">("recharge");

  const [amount, setAmount] = useState<number>(300);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalKB: number;
    compressedKB: number;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!venue?.id) return;
    setLoading(true);
    const res = await getVenueWalletDetails(venue.id);
    if (res.success) {
      setDetails(res);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
    setLoading(false);
  }, [venue?.id]);

  useEffect(() => {
    if (isOpen && venue?.id) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setCompressedBlob(null);
      setCompressionInfo(null);
      setPreviewUrl(null);
      setReferenceNumber("");
      void loadDetails();
    }
  }, [isOpen, venue?.id, loadDetails]);

  if (!isOpen || !venue) return null;

  const balance = details?.prepaid_balance ?? venue.prepaid_balance ?? 0;
  const commission = details?.commission_per_slot ?? venue.commission_per_slot ?? 15;
  const remainingSlots =
    commission > 0 ? Math.floor(balance / commission) : 999;
  const isLowBalance = balance <= Math.max(30, commission * 2);

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
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
      setErrorMsg(
        err instanceof Error ? err.message : "تعذر معالجة صورة الإيصال"
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (amount < 50) {
      setErrorMsg("الحد الأدنى لطلب شحن المحفظة هو 50 ج.م.");
      return;
    }
    if (!compressedBlob) {
      setErrorMsg("يرجى إرفاق صورة إيصال التحويل أولاً.");
      return;
    }

    setIsSubmitting(true);
    const upload = await uploadRechargeReceiptImage(venue.id, compressedBlob);
    if (!upload.url) {
      setIsSubmitting(false);
      setErrorMsg(upload.error || "تعذر رفع صورة الإيصال");
      return;
    }

    const res = await submitVenueRechargeRequest({
      venueId: venue.id,
      amount,
      receiptUrl: upload.url,
      referenceNumber: referenceNumber.trim() || undefined,
    });

    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || "تعذر إرسال طلب الشحن");
      return;
    }

    setSuccessMsg(
      "تم استلام طلب الشحن وإيصال التحويل بنجاح! سيقوم فريق الإدارة بمراجعته وإضافة الرصيد فوراً."
    );
    setCompressedBlob(null);
    setCompressionInfo(null);
    setPreviewUrl(null);
    setReferenceNumber("");
    await loadDetails();
    onRechargeSubmitted();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-black text-white">
                محفظة باصيلي مسبق الدفع
              </h3>
              <p className="text-xs text-zinc-400">
                {venue.name} — خصم {commission} ج.م تلقائياً مع كل حجز أونلاين مؤكد
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 flex items-center justify-center transition-all"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Balance Summary Card */}
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isLowBalance
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-[#0e0e11] border-white/[0.08]"
          }`}
        >
          <div>
            <span className="text-xs font-bold text-zinc-400 block">
              الرصيد الحالي المتاح
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`font-display text-3xl font-black tabular-nums ${
                  isLowBalance ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {balance.toLocaleString("en-US")}
              </span>
              <span className="text-xs text-zinc-400 font-bold">ج.م</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2">
              <span className="text-zinc-400 block text-[11px]">
                العمولة / ساعة أونلاين
              </span>
              <span className="font-black text-white tabular-nums">
                {commission} ج.م
              </span>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2">
              <span className="text-zinc-400 block text-[11px]">
                يكفي تقريباً لـ
              </span>
              <span className="font-black text-primary tabular-nums">
                {remainingSlots} حجز أونلاين
              </span>
            </div>
          </div>
        </div>

        {isLowBalance && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-3.5 py-2.5 text-xs text-rose-300 font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />
            <span>
              تنبيه: رصيد المحفظة منخفض! يرجى شحن الرصيد لضمان استمرار استقبال حجوزات اللاعبين أونلاين دون انقطاع.
            </span>
          </div>
        )}

        {/* Modal Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("recharge")}
            className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-all ${
              activeTab === "recharge"
                ? "bg-primary text-black border-primary font-black"
                : "bg-[#0e0e11] text-zinc-300 border-white/[0.08] hover:bg-white/[0.05]"
            }`}
          >
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            <span>شحن الرصيد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-all ${
              activeTab === "history"
                ? "bg-primary text-black border-primary font-black"
                : "bg-[#0e0e11] text-zinc-300 border-white/[0.08] hover:bg-white/[0.05]"
            }`}
          >
            <History className="h-4 w-4" strokeWidth={1.5} />
            <span>سجل المحفظة وطلبات الشحن</span>
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === "recharge" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform Payment Targets */}
            <div className="rounded-2xl bg-[#0e0e11] border border-white/[0.06] p-4 space-y-2.5">
              <span className="text-xs font-black text-zinc-200 block">
                1. حوّل مبلغ الشحن إلى أحد حسابات منصة باصيلي الرسمية:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#141418] border border-white/[0.08] px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">
                      إنستا باي (InstaPay IPA)
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs font-black text-white tabular-nums"
                    >
                      {PLATFORM_INSTAPAY}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(PLATFORM_INSTAPAY, "ipa")}
                    className="min-h-[36px] px-2.5 rounded-lg bg-white/[0.06] hover:bg-primary hover:text-black text-xs font-bold text-zinc-200 inline-flex items-center gap-1 transition-all"
                  >
                    {copiedKey === "ipa" ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : (
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    <span>{copiedKey === "ipa" ? "تم" : "نسخ"}</span>
                  </button>
                </div>

                <div className="rounded-xl bg-[#141418] border border-white/[0.08] px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">
                      فودافون كاش (Vodafone Cash)
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs font-black text-white tabular-nums"
                    >
                      {PLATFORM_VODAFONE}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(PLATFORM_VODAFONE, "vf")}
                    className="min-h-[36px] px-2.5 rounded-lg bg-white/[0.06] hover:bg-primary hover:text-black text-xs font-bold text-zinc-200 inline-flex items-center gap-1 transition-all"
                  >
                    {copiedKey === "vf" ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : (
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    <span>{copiedKey === "vf" ? "تم" : "نسخ"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Amount Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                2. اختر مبلغ الشحن (الحد الأدنى 50 ج.م):
              </label>
              <div className="flex flex-wrap gap-2">
                {[150, 300, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`min-h-[44px] px-4 rounded-xl border text-xs font-black tabular-nums transition-all ${
                      amount === preset
                        ? "bg-primary text-black border-primary"
                        : "bg-[#0e0e11] text-zinc-300 border-white/[0.08] hover:bg-white/[0.05]"
                    }`}
                  >
                    {preset} ج.م
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  المبلغ المحول (ج.م)
                </label>
                <input
                  type="number"
                  min={50}
                  step={10}
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

            {/* Receipt Upload with Client-Side Compression */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                3. ارفع صورة إيصال التحويل (يتم ضغطها تلقائياً لسرعة الرفع):
              </label>
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
                      اضغط لاختيار سكرين شوت التحويل
                    </span>
                  </>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isCompressing || !compressedBlob}
              className="w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              )}
              <span>{isSubmitting ? "جاري إرسال الطلب..." : "إرسال طلب شحن المحفظة"}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-16 rounded-xl bg-white/[0.05]" />
                <div className="h-16 rounded-xl bg-white/[0.05]" />
              </div>
            ) : (
              <>
                {details && details.recharges.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-zinc-300">
                      طلبات الشحن الأخيرة
                    </h4>
                    <div className="space-y-2">
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
                            {r.admin_notes && (
                              <p className="text-[11px] text-zinc-400 mt-0.5">
                                {r.admin_notes}
                              </p>
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
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-black text-zinc-300">
                    سجل الحركات المالية للمحفظة
                  </h4>
                  {!details || details.transactions.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">
                      لا توجد حركات مسجلة في محفظة الملعب حتى الآن.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
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
                              الرصيد: {tx.balance_after} ج.م
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
