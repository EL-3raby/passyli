"use client";

import { useMemo, useState } from "react";
import {
  Users,
  ShieldBan,
  Search,
  Plus,
  Trash2,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import {
  updateUserRoleAdmin,
  manageBlacklist,
  type AdminUserItem,
  type AdminBlacklistItem,
} from "@/lib/api/admin";
import type { UserRole } from "@/lib/supabase/types";

interface AdminUsersBlacklistTabProps {
  users: AdminUserItem[];
  blacklist: AdminBlacklistItem[];
  onRefresh: () => Promise<void>;
  onFeedback: (msg: string, isError?: boolean) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  player: "لاعب",
  venue_owner: "صاحب ملعب",
  receptionist: "موظف استقبال",
  super_admin: "مشرف عام",
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  player: "bg-zinc-500/10 text-zinc-300 border-zinc-500/25",
  venue_owner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  receptionist: "bg-sky-500/10 text-sky-300 border-sky-500/25",
  super_admin: "bg-amber-500/10 text-amber-300 border-amber-500/25",
};

export default function AdminUsersBlacklistTab({
  users,
  blacklist,
  onRefresh,
  onFeedback,
}: AdminUsersBlacklistTabProps) {
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [blockPhone, setBlockPhone] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockingBusy, setBlockingBusy] = useState(false);
  const [removingPhone, setRemovingPhone] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.phone?.toLowerCase().includes(q) ?? false)
    );
  }, [users, search]);

  const handleRoleChange = async (user: AdminUserItem, newRole: UserRole) => {
    if (user.role === newRole) return;
    setUpdatingUserId(user.id);
    const res = await updateUserRoleAdmin(user.id, newRole);
    setUpdatingUserId(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر تحديث صلاحية المستخدم", true);
      return;
    }

    onFeedback(
      `تم تحديث دور "${user.full_name}" إلى ${ROLE_LABELS[newRole]} بنجاح.`
    );
    await onRefresh();
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = blockPhone.trim();
    if (!cleanedPhone) {
      onFeedback("يرجى إدخال رقم الهاتف المراد حظره.", true);
      return;
    }

    setBlockingBusy(true);
    const res = await manageBlacklist({
      action: "add",
      phone: cleanedPhone,
      reason: blockReason.trim() || "مخالفة شروط الحجز والالتزام",
    });
    setBlockingBusy(false);

    if (!res.success) {
      onFeedback(res.error || "تعذر إضافة الرقم إلى القائمة السوداء", true);
      return;
    }

    setBlockPhone("");
    setBlockReason("");
    onFeedback(`تم إدراج الرقم ${cleanedPhone} في القائمة السوداء.`);
    await onRefresh();
  };

  const handleRemoveBlacklist = async (phone: string) => {
    setRemovingPhone(phone);
    const res = await manageBlacklist({
      action: "remove",
      phone,
    });
    setRemovingPhone(null);

    if (!res.success) {
      onFeedback(res.error || "تعذر رفع الحظر عن الرقم", true);
      return;
    }

    onFeedback(`تم رفع الحظر عن الرقم ${phone}.`);
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Users & Roles Management */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-primary">
              <Users className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display text-base font-black text-white">
                إدارة المستخدمين والصلاحيات
              </h3>
              <p className="text-xs text-zinc-400">
                إجمالي الحسابات المسجلة:{" "}
                <span className="font-bold text-white tabular-nums">
                  {users.length}
                </span>
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="h-4 w-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، البريد، أو رقم الموبايل..."
              className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/[0.08] pr-10 pl-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-8 text-center space-y-2">
            <Users className="h-7 w-7 text-zinc-500 mx-auto" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white">
              لا توجد حسابات مطابقة لنتيجة البحث
            </p>
            <p className="text-xs text-zinc-400">
              جرب البحث باسم آخر أو رقم موبايل مختلف.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredUsers.map((user) => {
              const isUpdating = updatingUserId === user.id;
              return (
                <div
                  key={user.id}
                  className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="h-11 w-11 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-display font-black text-sm text-white shrink-0">
                        {user.full_name.trim().charAt(0) || "م"}
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-black text-white truncate">
                          {user.full_name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${ROLE_BADGE_CLASSES[user.role]}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          <span>{ROLE_LABELS[user.role]}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                        {user.email && (
                          <span className="inline-flex items-center gap-1.5 truncate">
                            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                            <span className="truncate">{user.email}</span>
                          </span>
                        )}
                        {user.phone && (
                          <span className="inline-flex items-center gap-1.5 tabular-nums">
                            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                            <span dir="ltr">{user.phone}</span>
                          </span>
                        )}
                        <span className="tabular-nums text-zinc-300">
                          الحجوزات: {user.bookings_count}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <label
                      htmlFor={`role-${user.id}`}
                      className="text-xs text-zinc-400 font-bold"
                    >
                      الصلاحية:
                    </label>
                    <select
                      id={`role-${user.id}`}
                      disabled={isUpdating}
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user, e.target.value as UserRole)
                      }
                      className="min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.12] px-3 text-xs font-bold text-white focus:outline-none focus:border-primary/60 disabled:opacity-50"
                    >
                      <option value="player">لاعب</option>
                      <option value="venue_owner">صاحب ملعب</option>
                      <option value="receptionist">موظف استقبال</option>
                      <option value="super_admin">مشرف عام</option>
                    </select>
                    {isUpdating && (
                      <Loader2
                        className="h-4 w-4 text-primary animate-spin shrink-0"
                        strokeWidth={2}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Fraud Blacklist */}
      <section className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
            <ShieldBan className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display text-base font-black text-white">
              القائمة السوداء لمنع التلاعب
            </h3>
            <p className="text-xs text-zinc-400">
              أرقام الهواتف المحظورة من إنشاء حجوزات جديدة أو رفع إيصالات وهمية ({blacklist.length})
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAddBlacklist}
          className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          <input
            type="tel"
            dir="ltr"
            value={blockPhone}
            onChange={(e) => setBlockPhone(e.target.value)}
            placeholder="010xxxxxxxx"
            className="md:col-span-4 min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-500 tabular-nums text-right focus:outline-none focus:border-rose-500/50"
          />
          <input
            type="text"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="سبب الحظر (مثل: إيصال تحويل مزيف أو عدم الحضور المتكرر)"
            className="md:col-span-5 min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/50"
          />
          <button
            type="submit"
            disabled={blockingBusy}
            className="md:col-span-3 min-h-[44px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-50 border border-rose-500/30 text-rose-300 font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
          >
            {blockingBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2} />
            )}
            <span>إدراج في القائمة السوداء</span>
          </button>
        </form>

        {blacklist.length === 0 ? (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-8 text-center space-y-2">
            <ShieldBan className="h-7 w-7 text-zinc-500 mx-auto" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white">
              القائمة السوداء فارغة حالياً
            </p>
            <p className="text-xs text-zinc-400">
              لا توجد أرقام محظورة من الحجز على المنصة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blacklist.map((item) => {
              const isRemoving = removingPhone === item.phone;
              return (
                <div
                  key={item.phone}
                  className="rounded-2xl bg-[#141418] border border-rose-500/20 p-4 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                      <span
                        dir="ltr"
                        className="font-display text-sm font-black text-white tabular-nums"
                      >
                        {item.phone}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      {item.reason}
                    </p>
                    <p className="text-[11px] text-zinc-500 tabular-nums">
                      {new Date(item.created_at).toLocaleDateString("ar-EG", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={() => handleRemoveBlacklist(item.phone)}
                    className="min-h-[44px] px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-50 border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-all"
                  >
                    {isRemoving ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    ) : (
                      <Trash2 className="h-4 w-4 text-rose-400" strokeWidth={1.5} />
                    )}
                    <span>رفع الحظر</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
