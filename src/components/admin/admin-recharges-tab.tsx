"use client";

import { useState } from "react";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  ZoomIn,
  X,
  Loader2,
  ExternalLink,
  ReceiptText,
} from "lucide-react";
import {
  reviewRechargeRequest,
  type AdminRechargeRequest,
} from "@/lib/api/admin";

interface AdminRechargesTabProps {
  requests: AdminRechargeRequest[];
  onRefresh: () => Promise<void>;
  onFeedback: (msg: string, isError?: boolean) => void;
}

const STATUS_META: Record<
  AdminRechargeRequest["status"],
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending: {
    label: "بانتظار المراجعة",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    dotClass: "bg-amber-400",
  },
  approved: {
    label: "تم الاعتماد والشحن",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    dotClass: "bg-emerald-400",
  },
  rejected: {
    label: "مرفوض",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    dotClass: "bg-rose-400",
  },
};

export default function AdminRechargesTab({
  requests,
  onRefresh,
  onFeedback,
}: AdminRechargesTabProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewRequest, setPreviewRequest] =
    useState<AdminRechargeRequest | null>(null);

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto">
          <Wallet className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-base font-bold text-white">
          لا توجد طلبات شحن محافظ حالياً
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          عند رفع أي صاحب ملعب إيصال شحن رصيد عبر إنستا باي أو فودافون كاش، سيظهر هنا فوراً للمراجعة والاعتماد.
        </p>
      </div>
    );
  }

  const handleReview = async (
    req: AdminRechargeRequest,
    action: "approve" | "reject"
  ) => {
    setBusyId(req.id);
    const res = await reviewRechargeRequest({
      requestId: req.id,
      action,
      adminNotes: notes[req.id]?.trim() || undefined,
    });
    setBusyId(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر تنفيذ مراجعة طلب الشحن", true);
      return;
    }

    if (action === "approve") {
      onFeedback(
        `تم اعتماد شحن ${req.amount.toLocaleString("en-US")} ج.م لملعب "${req.venue_name}". الرصيد الجديد: ${(res.new_balance ?? req.current_balance + req.amount).toLocaleString("en-US")} ج.م`
      );
    } else {
      onFeedback(`تم رفض طلب الشحن الخاص بملعب "${req.venue_name}".`);
    }

    await onRefresh();
  };

  return (
    <>
      <div className="space-y-4">
        {requests.map((req) => {
          const statusInfo = STATUS_META[req.status];
          const isPending = req.status === "pending";
          const isBusy = busyId === req.id;

          return (
            <div
              key={req.id}
              className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-display text-base font-black text-white">
                      {req.venue_name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusInfo.badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`}
                      />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-zinc-400">
                    <div>
                      <span>مبلغ الشحن المطلوب: </span>
                      <span className="font-black text-emerald-400 tabular-nums">
                        {req.amount.toLocaleString("en-US")} ج.م
                      </span>
                    </div>
                    <div>
                      <span>رصيد المحفظة الحالي: </span>
                      <span className="font-bold text-zinc-200 tabular-nums">
                        {req.current_balance.toLocaleString("en-US")} ج.م
                      </span>
                    </div>
                    {req.reference_number && (
                      <div>
                        <span>رقم المرجع: </span>
                        <span className="font-bold text-zinc-200 tabular-nums">
                          {req.reference_number}
                        </span>
                      </div>
                    )}
                    <div className="tabular-nums text-zinc-500">
                      {new Date(req.created_at).toLocaleString("ar-EG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                </div>

                {/* Receipt Thumbnail / Zoom Trigger */}
                <div className="shrink-0">
                  {req.receipt_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewRequest(req)}
                      className="group relative flex items-center gap-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] p-2 pr-3 min-h-[44px] transition-all"
                    >
                      <img
                        src={req.receipt_url}
                        alt={`إيصال شحن ${req.venue_name}`}
                        className="h-12 w-12 rounded-lg object-cover border border-white/10 bg-black/40"
                      />
                      <div className="text-right">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <ZoomIn
                            className="h-3.5 w-3.5 text-primary"
                            strokeWidth={1.5}
                          />
                          <span>معاينة الإيصال</span>
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          اضغط للتكبير والتدقيق
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 text-xs text-zinc-500">
                      <ReceiptText className="h-4 w-4" strokeWidth={1.5} />
                      <span>لا يوجد مرفق صورة</span>
                    </div>
                  )}
                </div>
              </div>

              {isPending ? (
                <div className="pt-3 border-t border-white/[0.06] flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                  <input
                    type="text"
                    value={notes[req.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    placeholder="ملاحظات المراجعة (مطلوبة عند الرفض أو للتوثيق المالي)..."
                    className="flex-1 min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60"
                  />

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReview(req, "approve")}
                      className="flex-1 md:flex-none min-h-[44px] px-4 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                      )}
                      <span>اعتماد وشحن الرصيد</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReview(req, "reject")}
                      className="flex-1 md:flex-none min-h-[44px] px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 border border-rose-500/30 text-rose-300 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all"
                    >
                      <XCircle className="h-4 w-4" strokeWidth={1.5} />
                      <span>رفض الطلب</span>
                    </button>
                  </div>
                </div>
              ) : (
                req.admin_notes && (
                  <div className="pt-3 border-t border-white/[0.06] text-xs text-zinc-400">
                    <span className="font-bold text-zinc-300">ملاحظة المشرف: </span>
                    <span>{req.admin_notes}</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Full-Screen Receipt Zoom Preview Modal */}
      {previewRequest && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewRequest(null)}
        >
          <div
            className="max-w-2xl w-full rounded-3xl bg-[#141418] border border-white/[0.12] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08]">
              <div>
                <h4 className="font-display text-sm font-black text-white">
                  إيصال شحن — {previewRequest.venue_name}
                </h4>
                <p className="text-xs text-emerald-400 font-bold tabular-nums mt-0.5">
                  المبلغ المطلوب: {previewRequest.amount.toLocaleString("en-US")} ج.م
                  {previewRequest.reference_number
                    ? ` | مرجع: ${previewRequest.reference_number}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewRequest.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">فتح الأصل</span>
                </a>
                <button
                  type="button"
                  aria-label="إغلاق المعاينة"
                  onClick={() => setPreviewRequest(null)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 inline-flex items-center justify-center transition-all"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#09090b] flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewRequest.receipt_url}
                alt={`إيصال شحن ${previewRequest.venue_name}`}
                className="max-w-full max-h-[68vh] object-contain rounded-xl border border-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
