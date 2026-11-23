"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Phone,
  User,
  Copy,
  Check,
  Building2,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  SlidersHorizontal,
  Eye,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  getDashboardVenues,
  getPendingReceipts,
  reviewReceipt,
  type DashboardVenue,
  type DashboardReceipt,
} from "@/lib/api/dashboard";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import WalkinModal from "@/components/dashboard/walkin-modal";
import MaintenanceModal from "@/components/dashboard/maintenance-modal";

export default function ReceiptsReviewPage() {
  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("all");
  const [receipts, setReceipts] = useState<DashboardReceipt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStaffMode, setIsStaffMode] = useState<boolean>(false);

  // Active action states
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

  // Zoom Image modal state
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Adjust amount dialog state
  const [adjustReceipt, setAdjustReceipt] = useState<DashboardReceipt | null>(null);
  const [adjustedAmount, setAdjustedAmount] = useState<number>(100);

  // Reject dialog state
  const [rejectReceipt, setRejectReceipt] = useState<DashboardReceipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("الرقم المرجعي غير مطابق للعملية");

  // Quick modals for header
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);

  // Load data
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    const [vList, rList] = await Promise.all([
      getDashboardVenues(),
      getPendingReceipts(selectedVenueId === "all" ? undefined : selectedVenueId),
    ]);
    setVenues(vList);
    setReceipts(rList);
    if (showIndicator) setIsRefreshing(false);
    setIsLoading(false);
  }, [selectedVenueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format 24h time to Arabic
  const formatTimeArabic = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const period = h >= 12 ? "م" : "ص";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${period}`;
  };

  // Format date to Arabic
  const formatDateArabic = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr + "T00:00:00");
      return new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Copy reference number
  const handleCopyRef = (ref: string, id: string) => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(ref);
    setCopiedRefId(id);
    setTimeout(() => setCopiedRefId(null), 2000);
  };

  // Action: Approve
  const handleApprove = async (receipt: DashboardReceipt) => {
    try {
      setActionProcessingId(receipt.id);
      const res = await reviewReceipt(receipt.id, "approve");
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "تعذر اعتماد الإيصال");
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ غير متوقع");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Action: Submit Adjustment
  const handleConfirmAdjust = async () => {
    if (!adjustReceipt) return;
    try {
      setActionProcessingId(adjustReceipt.id);
      const res = await reviewReceipt(
        adjustReceipt.id,
        "adjust",
        adjustedAmount
      );
      if (res.success) {
        setAdjustReceipt(null);
        await loadData();
      } else {
        alert(res.error || "تعذر تعديل مبلغ الإيصال");
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Action: Submit Reject
  const handleConfirmReject = async () => {
    if (!rejectReceipt) return;
    try {
      setActionProcessingId(rejectReceipt.id);
      const res = await reviewReceipt(
        rejectReceipt.id,
        "reject",
        undefined,
        rejectionReason
      );
      if (res.success) {
        setRejectReceipt(null);
        await loadData();
      } else {
        alert(res.error || "تعذر رفض الإيصال");
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ");
    } finally {
      setActionProcessingId(null);
    }
  };

  const allCourts = venues.flatMap((v) => v.courts);

  return (
    <div className="min-h-screen bg-[#09090b] pb-24 text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <DashboardHeader
        venuesCount={venues.length}
        pendingReceiptsCount={receipts.length}
        isStaffMode={isStaffMode}
        onToggleStaffMode={() => setIsStaffMode((prev) => !prev)}
        onOpenWalkin={() => setIsWalkinOpen(true)}
        onOpenMaintenance={() => setIsMaintenanceOpen(true)}
      />

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6" dir="rtl">
        
        {/* Title & Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#141418] border border-white/[0.08] shadow-sm">
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <FileCheck2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">
                  مراجعة واعتماد إيصالات التحويل
                </h1>
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-black tabular-nums">
                  {receipts.length} معلق
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                فحص إيصالات فودافون كاش وإنستاباي واعتماد الحجز أو تصحيح المبلغ المحول
              </p>
            </div>
          </div>

          {/* Venue Filter + Refresh */}
          <div className="flex items-center gap-2">
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="h-10 rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="all">جميع المنشآت الرياضية</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="h-10 w-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-50 shrink-0"
              title="تحديث القائمة"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`}
                strokeWidth={1.5}
              />
            </button>
          </div>

        </div>

        {/* Audit Instructions Hint */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
            <span>
              <strong>توجيه إداري:</strong> تأكد من مطابقة الرقم المرجعي للتحويل في تطبيقك البنكي أو محفظتك قبل الضغط على اعتماد الحجز. في حالة النقص، استخدم زر «تعديل المبلغ».
            </span>
          </div>

          <Link
            href="/dashboard"
            className="text-primary hover:underline font-bold text-xs shrink-0 hidden sm:inline-flex items-center gap-1"
          >
            <span>العودة للجدول الزمني</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Receipts Content List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-[#141418]/60 animate-pulse border border-white/[0.06]"
              />
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-20 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-white">لا توجد إيصالات تحويل معلقة حالياً</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              جميع حجوزات الملاعب معتمدة ومحدثة. أي إيصال جديد يرفعه اللاعبون سيظهر هنا فورياً للمراجعة والاعتماد.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex min-h-[44px] items-center gap-2 px-5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-white transition-all"
              >
                <span>متابعة جدول الحجوزات اليومي</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {receipts.map((receipt) => {
              const b = receipt.booking;
              const court = b?.court;
              const venue = (court as any)?.venue;
              const isProcessing = actionProcessingId === receipt.id;

              return (
                <div
                  key={receipt.id}
                  className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between"
                >
                  {/* Top Bar: Booker Info & Status */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-white/[0.06] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-black text-white">
                            {receipt.sender_name || b?.booker_name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                            إيصال معلق
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 block mt-0.5">
                          {venue?.name || "الملعب"} • {court?.name}
                        </span>
                      </div>

                      {/* Contact Actions */}
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://wa.me/2${(receipt.sender_phone || b?.booker_phone || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-all"
                          title="محادثة واتساب"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                        </a>

                        <a
                          href={`tel:${receipt.sender_phone || b?.booker_phone}`}
                          className="h-9 w-9 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all"
                          title="اتصال هاتفي"
                        >
                          <Phone className="h-4 w-4" strokeWidth={1.5} />
                        </a>
                      </div>
                    </div>

                    {/* Match & Time Pill */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] text-zinc-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        <span className="font-bold tabular-nums">
                          {formatDateArabic(b?.booking_date)} • {formatTimeArabic(b?.start_time)}
                        </span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] text-zinc-300 flex items-center gap-1.5">
                        <span className="text-zinc-400">طريقة التحويل:</span>
                        <strong className="text-white">
                          {receipt.payment_method === "instapay"
                            ? "إنستاباي"
                            : receipt.payment_method === "vodafone_cash"
                            ? "فودافون كاش"
                            : "محفظة كاش"}
                        </strong>
                      </div>
                    </div>

                    {/* Screenshot Preview & Reference Number Box */}
                    <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#1c1c1f] border border-white/[0.06]">
                      {/* Thumbnail Image */}
                      <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black aspect-[3/4] flex items-center justify-center cursor-pointer">
                        {receipt.image_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={receipt.image_url}
                              alt="سكرين شوت الإيصال"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedImageUrl(receipt.image_url)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all"
                            >
                              <Eye className="h-5 w-5" strokeWidth={1.5} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-500">لا توجد صورة</span>
                        )}
                      </div>

                      {/* Financials & Reference Detail */}
                      <div className="col-span-2 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] text-zinc-400 block">الرقم المرجعي للتحويل</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-1 rounded-md tabular-nums break-all">
                              {receipt.reference_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyRef(receipt.reference_number, receipt.id)}
                              className="h-7 w-7 rounded-md bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center shrink-0 transition-all"
                              title="نسخ الرقم المرجعي"
                            >
                              {copiedRefId === receipt.id ? (
                                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                              ) : (
                                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Financial balance breakdown */}
                        <div className="space-y-1 text-xs border-t border-white/[0.06] pt-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">العربون المحول:</span>
                            <span className="font-bold text-primary tabular-nums">
                              {receipt.amount_paid} ج.م
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">إجمالي الماتش:</span>
                            <span className="text-white tabular-nums">
                              {b?.total_price} ج.م
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">المتبقي كاش في الملعب:</span>
                            <span className="font-bold text-amber-400 tabular-nums">
                              {b?.cash_remaining} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decision Actions Bar */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
                    {/* Approve CTA */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(receipt)}
                      className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                      <span>{isProcessing ? "جاري الاعتماد..." : "اعتماد الحجز"}</span>
                    </button>

                    {/* Adjust Underpayment CTA */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setAdjustReceipt(receipt);
                        setAdjustedAmount(receipt.amount_paid);
                      }}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 px-3 text-xs font-bold text-zinc-200 transition-all disabled:opacity-50"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                      <span>تعديل المبلغ</span>
                    </button>

                    {/* Reject CTA */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setRejectReceipt(receipt);
                        setRejectionReason("الرقم المرجعي غير مطابق للعملية");
                      }}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 px-3 text-xs font-bold text-destructive transition-all disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>رفض</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Image Lightbox Modal */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedImageUrl}
              alt="صورة الإيصال المكبرة"
              className="w-full h-full object-contain max-h-[85vh]"
            />
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Adjust Underpayment Modal */}
      {adjustReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl bg-[#141418] border border-white/10 p-5 space-y-4 shadow-2xl"
            dir="rtl"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  تعديل المبلغ المحول فعلياً (Underpayment)
                </h3>
                <p className="text-xs text-zinc-400">
                  كابتن الفرقة: {adjustReceipt.sender_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              إذا كان الإيصال المرفوع يوضح تحويل مبلغ أقل (مثلاً 50 ج.م بدلاً من 100 ج.م)، حدد المبلغ الحقيقي ليتم تحديث المتبقي كاش في الملعب تلقائياً.
            </p>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                المبلغ المحول فعلياً في الإيصال (ج.م)
              </label>
              <input
                type="number"
                min="0"
                max={adjustReceipt.booking?.total_price || 500}
                value={adjustedAmount}
                onChange={(e) => setAdjustedAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-sm font-bold text-primary focus:outline-none focus:border-primary transition-all tabular-nums text-left"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#1c1c1f] border border-white/[0.06] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">سعر الماتش الإجمالي:</span>
                <span className="text-white font-bold tabular-nums">
                  {adjustReceipt.booking?.total_price} ج.م
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">المتبقي كاش الجديد:</span>
                <span className="text-amber-400 font-bold tabular-nums">
                  {Math.max(0, (adjustReceipt.booking?.total_price || 0) - adjustedAmount)} ج.م
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAdjust}
                disabled={actionProcessingId === adjustReceipt.id}
                className="flex-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary text-xs font-black text-black hover:bg-primary-hover transition-all disabled:opacity-50"
              >
                {actionProcessingId === adjustReceipt.id ? "جاري الاعتماد..." : "تأكيد واعتماد الحجز"}
              </button>
              <button
                type="button"
                onClick={() => setAdjustReceipt(null)}
                className="px-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/[0.06] text-xs font-bold text-zinc-300 hover:text-white transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl bg-[#141418] border border-white/10 p-5 space-y-4 shadow-2xl"
            dir="rtl"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
              <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  رفض الإيصال وإلغاء الحجز
                </h3>
                <p className="text-xs text-zinc-400">
                  سيتم تحرير الميعاد فورياً ليصبح متاحاً للاعبين الآخرين
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                سبب الرفض
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-primary transition-all cursor-pointer mb-2"
              >
                <option value="الرقم المرجعي غير مطابق للعملية">الرقم المرجعي غير مطابق للعملية</option>
                <option value="صورة الإيصال غير واضحة أو مقصوصة">صورة الإيصال غير واضحة أو مقصوصة</option>
                <option value="لم يصل أي تحويل على محفظة الملعب">لم يصل أي تحويل على محفظة الملعب</option>
                <option value="الإيصال مكرر ومستخدم في حجز سابق">الإيصال مكرر ومستخدم في حجز سابق</option>
                <option value="أخرى">سبب آخر...</option>
              </select>

              {rejectionReason === "أخرى" && (
                <input
                  type="text"
                  placeholder="اكتب سبب الرفض بالتفصيل..."
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all"
                />
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionProcessingId === rejectReceipt.id}
                className="flex-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-destructive text-xs font-black text-white hover:bg-destructive/90 transition-all disabled:opacity-50"
              >
                {actionProcessingId === rejectReceipt.id ? "جاري الإلغاء..." : "تأكيد الرفض وتحرير الساعة"}
              </button>
              <button
                type="button"
                onClick={() => setRejectReceipt(null)}
                className="px-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/[0.06] text-xs font-bold text-zinc-300 hover:text-white transition-all"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Walkin & Maintenance Modals */}
      <WalkinModal
        isOpen={isWalkinOpen}
        onClose={() => setIsWalkinOpen(false)}
        courts={allCourts}
        onBookingSuccess={() => loadData()}
      />

      <MaintenanceModal
        isOpen={isMaintenanceOpen}
        onClose={() => setIsMaintenanceOpen(false)}
        courts={allCourts}
        onMaintenanceSuccess={() => loadData()}
      />
    </div>
  );
}
