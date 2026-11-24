"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Loader2,
  Building2,
} from "lucide-react";
import {
  approvePartnerApp,
  rejectPartnerApp,
  sendPartnerWelcomeEmail,
  type AdminPartnerApplication,
} from "@/lib/api/admin";

interface AdminPartnersTabProps {
  applications: AdminPartnerApplication[];
  onRefresh: () => Promise<void>;
  onFeedback: (msg: string, isError?: boolean) => void;
}

export default function AdminPartnersTab({
  applications,
  onRefresh,
  onFeedback,
}: AdminPartnersTabProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | AdminPartnerApplication["status"]
  >("all");
  const [credits, setCredits] = useState<Record<string, number>>({});
  const [commissions, setCommissions] = useState<Record<string, number>>({});
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (applications.length === 0) {
    return (
      <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto">
          <Building2 className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-base font-bold text-white">
          لا توجد طلبات انضمام ملاعب حالياً
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          عند تقديم أي صاحب ملعب طلب انضمام عبر المنصة سيظهر هنا فوراً للمراجعة وتحديد رصيده الترحيبي.
        </p>
      </div>
    );
  }

  const handleApprove = async (app: AdminPartnerApplication) => {
    setBusyId(app.id);
    const welcomeCredit = credits[app.id] ?? app.welcome_credit ?? 150;
    const commissionPerSlot = commissions[app.id] ?? 15;
    const ownerEmail = ownerEmails[app.id] || "";

    const res = await approvePartnerApp({
      appId: app.id,
      welcomeCredit,
      commissionPerSlot,
      ownerEmail,
    });

    setBusyId(null);
    if (!res.success) {
      onFeedback(res.error || "تعذر اعتماد الطلب", true);
      return;
    }

    const trimmedOwnerEmail = ownerEmail.trim();
    if (trimmedOwnerEmail) {
      void sendPartnerWelcomeEmail({
        ownerEmail: trimmedOwnerEmail,
        venueName: app.venue_name,
        welcomeCredit,
        commissionPerSlot,
      });
    }

    onFeedback(
      trimmedOwnerEmail
        ? `تم اعتماد وتفعيل "${app.venue_name}" برصيد ترحيبي ${welcomeCredit} ج.م وإرسال بريد الترحيب للمالك.`
        : `تم اعتماد وتفعيل "${app.venue_name}" برصيد ترحيبي ${welcomeCredit} ج.م بنجاح!`
    );
    await onRefresh();
  };

  const handleReject = async (app: AdminPartnerApplication) => {
    const note = (rejectNotes[app.id] || "").trim();
    if (!note) {
      onFeedback("يرجى كتابة سبب رفض طلب الشراكة في خانة الملاحظات أولاً.", true);
      return;
    }

    setBusyId(app.id);
    const res = await rejectPartnerApp(app.id, note);
    setBusyId(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر رفض الطلب", true);
      return;
    }

    onFeedback(`تم رفض طلب "${app.venue_name}".`);
    await onRefresh();
  };

  const visibleApps =
    statusFilter === "all"
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: `الكل (${applications.length})` },
            {
              id: "pending",
              label: `قيد المراجعة (${applications.filter((a) => a.status === "pending").length})`,
            },
            {
              id: "approved",
              label: `معتمد (${applications.filter((a) => a.status === "approved").length})`,
            },
            {
              id: "rejected",
              label: `مرفوض (${applications.filter((a) => a.status === "rejected").length})`,
            },
          ] as const
        ).map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setStatusFilter(btn.id)}
            className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold tabular-nums transition-all ${
              statusFilter === btn.id
                ? "bg-primary text-black border-primary font-black"
                : "bg-[#141418] text-zinc-300 border-white/[0.08] hover:bg-white/[0.05]"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {visibleApps.length === 0 ? (
        <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-8 text-center text-xs text-zinc-400">
          لا توجد طلبات شراكة ضمن هذا التصنيف.
        </div>
      ) : (
        visibleApps.map((app) => {
        const isPending = app.status === "pending";
        const creditVal = credits[app.id] ?? app.welcome_credit ?? 150;
        const commVal = commissions[app.id] ?? 15;

        return (
          <div
            key={app.id}
            className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-black text-white">
                    {app.venue_name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      app.status === "pending"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : app.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {app.status === "pending"
                      ? "قيد المراجعة"
                      : app.status === "approved"
                      ? "معتمد ومفعّل"
                      : "مرفوض"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1.5">
                  <span>مقدم الطلب: {app.applicant_name}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    {app.city} — {app.district} ({app.address})
                  </span>
                  <span className="flex items-center gap-1 tabular-nums" dir="ltr">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                    {app.phone}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-xl bg-[#0e0e11] border border-white/[0.06] px-3 py-1.5 font-bold text-zinc-200 tabular-nums">
                  {app.courts_count} ملاعب
                </span>
                <span className="rounded-xl bg-[#0e0e11] border border-white/[0.06] px-3 py-1.5 font-bold text-primary tabular-nums">
                  صباحي {app.base_price_morning} / مسائي {app.base_price_evening} ج.م
                </span>
              </div>
            </div>

            {isPending ? (
              <div className="rounded-xl bg-[#0e0e11] border border-white/[0.06] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                      الرصيد الترحيبي المجاني (ج.م)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={15}
                      value={creditVal}
                      onChange={(e) =>
                        setCredits((prev) => ({
                          ...prev,
                          [app.id]: Number(e.target.value),
                        }))
                      }
                      className="w-full h-10 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-emerald-400 tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                      عمولة باصيلي لكل ساعة (ج.م)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={commVal}
                      onChange={(e) =>
                        setCommissions((prev) => ({
                          ...prev,
                          [app.id]: Number(e.target.value),
                        }))
                      }
                      className="w-full h-10 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                      ربط إيميل المالك (اختياري)
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={ownerEmails[app.id] || ""}
                      onChange={(e) =>
                        setOwnerEmails((prev) => ({
                          ...prev,
                          [app.id]: e.target.value,
                        }))
                      }
                      placeholder="owner@gmail.com"
                      className="w-full h-10 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white text-left placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === app.id}
                    onClick={() => handleApprove(app)}
                    className="min-h-[44px] px-5 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {busyId === app.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                    )}
                    <span>اعتماد وإنشاء الملعب الآن</span>
                  </button>

                  <input
                    type="text"
                    value={rejectNotes[app.id] || ""}
                    onChange={(e) =>
                      setRejectNotes((prev) => ({
                        ...prev,
                        [app.id]: e.target.value,
                      }))
                    }
                    placeholder="سبب الرفض (إلزامي عند الرفض)..."
                    className="flex-1 h-11 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                  />

                  <button
                    type="button"
                    disabled={busyId === app.id}
                    onClick={() => handleReject(app)}
                    className="min-h-[44px] px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <XCircle className="h-4 w-4" strokeWidth={1.5} />
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            ) : (
              app.admin_notes && (
                <p className="text-xs text-zinc-400 bg-[#0e0e11] rounded-xl px-3.5 py-2 border border-white/[0.05]">
                  ملاحظات الإدارة: {app.admin_notes}
                </p>
              )
            )}
          </div>
        );
      })
      )}
    </div>
  );
}
