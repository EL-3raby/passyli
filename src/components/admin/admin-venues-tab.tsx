"use client";

import { useState } from "react";
import {
  Building2,
  ShieldCheck,
  Wallet,
  Check,
  Loader2,
  UserCheck,
  Power,
  History,
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
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleToggleActive = async (venue: AdminVenueItem) => {
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

    setBusyKey(`bal-${venue.id}`);
    const res = await adjustVenueBalance({
      venueId: venue.id,
      delta: Math.round(raw),
      reason: balanceReasons[venue.id] || "تسوية رصيد من المشرف العام",
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

  return (
    <div className="space-y-6">
      {/* Venues Management Grid */}
      <div className="space-y-4">
        {venues.map((venue) => {
          const commVal = commInputs[venue.id] ?? venue.commission_per_slot;
          const ownerVal = ownerSelects[venue.id] ?? venue.owner_id ?? "";

          return (
            <div
              key={venue.id}
              className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <h3 className="font-display text-base sm:text-lg font-black text-white">
                      {venue.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        venue.is_active
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {venue.is_active ? "نشط" : "متوقف"}
                    </span>
                    {venue.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                        موثق
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-1">
                    {venue.district} • {venue.address} • {venue.courts_count} ملاعب •{" "}
                    <span className="tabular-nums">{venue.bookings_count} حجز مؤكد</span>
                  </p>
                  {venue.owner_name && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>
                        المالك المربوط: {venue.owner_name} ({venue.owner_email || venue.owner_phone})
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl bg-[#0e0e11] border border-white/[0.06] px-4 py-2 text-center">
                    <span className="text-[10px] text-zinc-500 block">
                      الرصيد مسبق الدفع
                    </span>
                    <span
                      className={`font-display text-lg font-black tabular-nums ${
                        venue.prepaid_balance <= 30 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {venue.prepaid_balance} ج.م
                    </span>
                  </div>

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
                    <span>{venue.is_active ? "إيقاف مؤقت" : "تفعيل للجمهور"}</span>
                  </button>
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
                        className="w-full h-10 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
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
                        className="w-full h-10 rounded-xl bg-[#141418] border border-white/10 px-2.5 text-xs font-bold text-white focus:outline-none focus:border-primary"
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
                    className="w-full min-h-[40px] rounded-xl bg-white/[0.06] hover:bg-primary hover:text-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    {busyKey === `save-${venue.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    <span>حفظ العمولة والمالك</span>
                  </button>
                </div>

                {/* Manual Balance Adjustment */}
                <div className="rounded-xl bg-[#0e0e11] border border-white/[0.05] p-3.5 space-y-3">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
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
                      className="w-full h-10 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white text-center placeholder:text-zinc-600 focus:outline-none focus:border-primary tabular-nums"
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
                      placeholder="سبب التعديل (مكافأة / تسوية)"
                      className="w-full h-10 rounded-xl bg-[#141418] border border-white/10 px-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busyKey === `bal-${venue.id}`}
                    onClick={() => handleAdjustBalance(venue)}
                    className="w-full min-h-[40px] rounded-xl bg-primary/15 hover:bg-primary hover:text-black border border-primary/30 text-primary text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                  >
                    {busyKey === `bal-${venue.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
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

      {/* Recent Wallet Ledger History */}
      <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <History className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span>سجل حركات محافظ الملاعب (أحدث 60 حركة)</span>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            لا توجد حركات مالية مسجلة حتى الآن.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-white/[0.08] text-zinc-400">
                  <th className="py-2.5 px-3 font-bold">الملعب</th>
                  <th className="py-2.5 px-3 font-bold">العملية</th>
                  <th className="py-2.5 px-3 font-bold">القيمة</th>
                  <th className="py-2.5 px-3 font-bold">الرصيد بعد</th>
                  <th className="py-2.5 px-3 font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-bold text-white">{tx.venue_name}</td>
                    <td className="py-2.5 px-3 text-zinc-300">{tx.description}</td>
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
                    <td className="py-2.5 px-3 text-zinc-400 tabular-nums" dir="ltr">
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
