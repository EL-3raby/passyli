"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  ShieldCheck,
  Wallet,
  Check,
  Loader2,
  UserCheck,
  Power,
  History,
  Download,
  AlertTriangle,
  UserX,
} from "lucide-react";
import {
  updateVenueAdminSettings,
  adjustVenueBalance,
  type AdminVenueItem,
  type AdminUserItem,
  type AdminWalletTransaction,
} from "@/lib/api/admin";

interface AdminVenuesTabProps {
  venues: AdminVenueItem[];
  users: AdminUserItem[];
  transactions: AdminWalletTransaction[];
  onRefresh: () => Promise<void>;
  onFeedback: (msg: string, isError?: boolean) => void;
}

const TX_TYPE_LABELS: Record<AdminWalletTransaction["type"], string> = {
  welcome_bonus: "رصيد ترحيبي",
  recharge: "شحن رصيد",
  commission_deduction: "خصم عمولة حجز",
  admin_adjustment: "تسوية إدارية",
};

export default function AdminVenuesTab({
  venues,
  users,
  transactions,
  onRefresh,
  onFeedback,
}: AdminVenuesTabProps) {
  const [commInputs, setCommInputs] = useState<Record<string, number>>({});
  const [ownerSelects, setOwnerSelects] = useState<Record<string, string>>({});
  const [balanceDeltas, setBalanceDeltas] = useState<Record<string, string>>({});
  const [balanceReasons, setBalanceReasons] = useState<Record<string, string>>({});
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(
    null
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [txVenueFilter, setTxVenueFilter] = useState<string>("all");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txVenueFilter !== "all" && tx.venue_id !== txVenueFilter) {
        return false;
      }
      if (txTypeFilter !== "all" && tx.type !== txTypeFilter) {
        return false;
      }
      return true;
    });
  }, [transactions, txVenueFilter, txTypeFilter]);

  const handleToggleActive = async (venue: AdminVenueItem) => {
    if (venue.is_active && confirmDeactivateId !== venue.id) {
      setConfirmDeactivateId(venue.id);
      return;
    }

    setConfirmDeactivateId(null);
    setBusyKey(`active-${venue.id}`);
    const res = await updateVenueAdminSettings({
      venueId: venue.id,
      isActive: !venue.is_active,
    });
    setBusyKey(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر تغيير حالة الملعب", true);
      return;
    }

    onFeedback(
      !venue.is_active
        ? `تم تفعيل "${venue.name}" للجمهور.`
        : `تم إيقاف ظهور "${venue.name}" مؤقتاً.`
    );
    await onRefresh();
  };

  const handleToggleVerified = async (venue: AdminVenueItem) => {
    setBusyKey(`verify-${venue.id}`);
    const res = await updateVenueAdminSettings({
      venueId: venue.id,
      isVerified: !venue.is_verified,
    });
    setBusyKey(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر تحديث حالة توثيق الملعب", true);
      return;
    }

    onFeedback(
      !venue.is_verified
        ? `تم منح شارة التوثيق لملعب "${venue.name}".`
        : `تم إلغاء شارة التوثيق عن ملعب "${venue.name}".`
    );
    await onRefresh();
  };

  const handleSaveCommissionAndOwner = async (venue: AdminVenueItem) => {
    setBusyKey(`save-${venue.id}`);
    const commissionPerSlot =
      commInputs[venue.id] ?? venue.commission_per_slot;
    const ownerId = ownerSelects[venue.id] ?? venue.owner_id ?? undefined;

    const res = await updateVenueAdminSettings({
      venueId: venue.id,
      commissionPerSlot,
      ownerId: ownerId || undefined,
    });
    setBusyKey(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر حفظ إعدادات الملعب", true);
      return;
    }

    onFeedback(`تم تحديث عمولة وربط المالك لـ "${venue.name}".`);
    await onRefresh();
  };

  const handleAdjustBalance = async (venue: AdminVenueItem) => {
    const raw = Number(balanceDeltas[venue.id] || 0);
    if (!raw || Number.isNaN(raw)) {
      onFeedback("أدخل مبلغ التسوية (+ للإضافة أو - للخصم)", true);
      return;
    }

    const reasonText = (balanceReasons[venue.id] || "").trim();
    if (raw < 0 && !reasonText) {
      onFeedback("يرجى كتابة سبب واضح عند خصم الرصيد يدوياً", true);
      return;
    }

    setBusyKey(`bal-${venue.id}`);
    const res = await adjustVenueBalance({
      venueId: venue.id,
      delta: Math.round(raw),
      reason: reasonText || "تسوية رصيد من المشرف العام",
    });
    setBusyKey(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر تعديل الرصيد", true);
      return;
    }

    setBalanceDeltas((prev) => ({ ...prev, [venue.id]: "" }));
    setBalanceReasons((prev) => ({ ...prev, [venue.id]: "" }));
    onFeedback(`تم تعديل رصيد "${venue.name}" إلى ${res.new_balance} ج.م.`);
    await onRefresh();
  };

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      onFeedback("لا توجد حركات مطابقة لتصديرها", true);
      return;
    }

    const headers = ["المعرف", "الملعب", "النوع", "الوصف", "القيمة (ج.م)", "الرصيد بعد (ج.م)", "التاريخ"];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.venue_name,
      TX_TYPE_LABELS[tx.type] ?? tx.type,
      tx.description,
      String(tx.amount),
      String(tx.balance_after),
      new Date(tx.created_at).toISOString(),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `passyli-wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onFeedback(`تم تصدير ${filteredTransactions.length} حركة مالية بصيغة CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Venues Management Grid */}
      {venues.length === 0 ? (
        <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto">
            <Building2 className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-base font-bold text-white">
            لا توجد ملاعب مسجلة على المنصة بعد
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            بعد اعتماد أول طلب شراكة سيظهر الملعب هنا لإدارة رصيده وعمولاته وتوثيقه.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {venues.map((venue) => {
            const commVal = commInputs[venue.id] ?? venue.commission_per_slot;
            const ownerVal = ownerSelects[venue.id] ?? venue.owner_id ?? "";
            const isLowBalance = venue.is_active && venue.prepaid_balance <= 30;
            const isConfirmingStop = confirmDeactivateId === venue.id;

            return (
              <div
                key={venue.id}
                className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.5}
                      />
                      <h3 className="font-display text-base sm:text-lg font-black text-white">
                        {venue.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          venue.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            venue.is_active ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        {venue.is_active ? "نشط" : "متوقف"}
                      </span>

                      {venue.is_verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                          موثق
                        </span>
                      )}

                      {isLowBalance && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                          <AlertTriangle
                            className="h-3 w-3"
                            strokeWidth={1.5}
                          />
                          رصيد منخفض
                        </span>
                      )}

                      {!venue.owner_id && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-bold">
                          <UserX className="h-3 w-3" strokeWidth={1.5} />
                          ملعب بدون مالك مربوط
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 mt-1">
                      {venue.district} • {venue.address} • {venue.courts_count} ملاعب •{" "}
                      <span className="tabular-nums">
                        {venue.bookings_count} حجز مؤكد
                      </span>
                    </p>
                    {venue.owner_name && (
                      <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>
                          المالك المربوط: {venue.owner_name} (
                          {venue.owner_email || venue.owner_phone})
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="rounded-xl bg-[#0e0e11] border border-white/[0.06] px-4 py-2 text-center">
                      <span className="text-[10px] text-zinc-500 block">
                        الرصيد مسبق الدفع
                      </span>
                      <span
                        className={`font-display text-lg font-black tabular-nums ${
                          venue.prepaid_balance <= 30
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {venue.prepaid_balance} ج.م
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={busyKey === `verify-${venue.id}`}
                      onClick={() => handleToggleVerified(venue)}
                      className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                        venue.is_verified
                          ? "bg-primary/15 hover:bg-primary/25 border-primary/35 text-primary"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300"
                      }`}
                    >
                      {busyKey === `verify-${venue.id}` ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                      <span>
                        {venue.is_verified ? "إلغاء التوثيق" : "توثيق الملعب"}
                      </span>
                    </button>

                    {isConfirmingStop ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyKey === `active-${venue.id}`}
                          onClick={() => handleToggleActive(venue)}
                          className="min-h-[44px] px-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition-all"
                        >
                          تأكيد الإيقاف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeactivateId(null)}
                          className="min-h-[44px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 text-xs font-bold transition-all"
                        >
                          تراجع
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busyKey === `active-${venue.id}`}
                        onClick={() => handleToggleActive(venue)}
                        className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          venue.is_active
                            ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400"
                            : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>
                          {venue.is_active ? "إيقاف مؤقت" : "تفعيل للجمهور"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Commission, Owner Link & Balance Adjustment Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-white/[0.06]">
                  {/* Commission & Owner Assignment */}
                  <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3.5 space-y-3">
                    <span className="text-xs font-bold text-zinc-300 block">
                      إعدادات العمولة وربط المالك
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">
                          العمولة لكل ساعة (ج.م)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={commVal}
                          onChange={(e) =>
                            setCommInputs((prev) => ({
                              ...prev,
                              [venue.id]: Number(e.target.value),
                            }))
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">
                          ربط بحساب المالك
                        </label>
                        <select
                          value={ownerVal}
                          onChange={(e) =>
                            setOwnerSelects((prev) => ({
                              ...prev,
                              [venue.id]: e.target.value,
                            }))
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-2.5 text-xs font-bold text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">— غير مربوط —</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} ({u.email || u.phone})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey === `save-${venue.id}`}
                      onClick={() => handleSaveCommissionAndOwner(venue)}
                      className="w-full min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-primary hover:text-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      {busyKey === `save-${venue.id}` ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                      <span>حفظ العمولة والمالك</span>
                    </button>
                  </div>

                  {/* Manual Balance Adjustment */}
                  <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3.5 space-y-3">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Wallet
                        className="h-3.5 w-3.5 text-primary"
                        strokeWidth={1.5}
                      />
                      تعديل الرصيد يدوياً (+ إضافة / - خصم)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="number"
                        dir="ltr"
                        value={balanceDeltas[venue.id] || ""}
                        onChange={(e) =>
                          setBalanceDeltas((prev) => ({
                            ...prev,
                            [venue.id]: e.target.value,
                          }))
                        }
                        placeholder="+150 أو -50"
                        className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white text-center placeholder:text-zinc-600 focus:outline-none focus:border-primary tabular-nums"
                      />
                      <input
                        type="text"
                        value={balanceReasons[venue.id] || ""}
                        onChange={(e) =>
                          setBalanceReasons((prev) => ({
                            ...prev,
                            [venue.id]: e.target.value,
                          }))
                        }
                        placeholder="سبب التعديل (إلزامي عند الخصم)"
                        className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busyKey === `bal-${venue.id}`}
                      onClick={() => handleAdjustBalance(venue)}
                      className="w-full min-h-[44px] rounded-xl bg-primary/15 hover:bg-primary hover:text-black border border-primary/30 text-primary text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                    >
                      {busyKey === `bal-${venue.id}` ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Wallet className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                      <span>تطبيق تعديل الرصيد</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wallet Ledger History with Filters & CSV Export */}
      <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <History className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span>
              سجل حركات محافظ الملاعب ({filteredTransactions.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={txVenueFilter}
              onChange={(e) => setTxVenueFilter(e.target.value)}
              className="min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
            >
              <option value="all">كل الملاعب</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
              className="min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
            >
              <option value="all">كل الأنواع</option>
              <option value="welcome_bonus">رصيد ترحيبي</option>
              <option value="recharge">شحن رصيد</option>
              <option value="commission_deduction">خصم عمولة حجز</option>
              <option value="admin_adjustment">تسوية إدارية</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 text-xs font-bold inline-flex items-center gap-2 transition-all"
            >
              <Download className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            لا توجد حركات مالية مطابقة للفلاتر الحالية.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-white/[0.08] text-zinc-400">
                  <th className="py-2.5 px-3 font-bold">الملعب</th>
                  <th className="py-2.5 px-3 font-bold">النوع</th>
                  <th className="py-2.5 px-3 font-bold">العملية</th>
                  <th className="py-2.5 px-3 font-bold">القيمة</th>
                  <th className="py-2.5 px-3 font-bold">الرصيد بعد</th>
                  <th className="py-2.5 px-3 font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {tx.venue_name}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {TX_TYPE_LABELS[tx.type] ?? tx.type}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">
                      {tx.description}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-black tabular-nums ${
                        tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                      dir="ltr"
                    >
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} ج.م
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white tabular-nums">
                      {tx.balance_after} ج.م
                    </td>
                    <td
                      className="py-2.5 px-3 text-zinc-400 tabular-nums"
                      dir="ltr"
                    >
                      {new Date(tx.created_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
