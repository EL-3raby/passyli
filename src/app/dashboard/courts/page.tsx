"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Building2,
  ShieldCheck,
} from "lucide-react";
import {
  updateCourtSettings,
  addVenueCourt,
  toggleCourtMaintenance,
  type DashboardCourt,
} from "@/lib/api/dashboard";
import { useDashboard } from "@/components/dashboard/dashboard-provider";

interface CourtEditState {
  name: string;
  priceMorning: number;
  priceEvening: number;
  peakHourStart: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export default function DashboardCourtsPage() {
  const {
    venues,
    selectedVenue,
    allCourts,
    isLoadingVenues,
    isStaffMode,
    setStaffMode,
    triggerRealtimeRefresh,
  } = useDashboard();

  const [edits, setEdits] = useState<Record<string, CourtEditState>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSport, setNewSport] = useState<"football" | "padel">("football");
  const [newSurface, setNewSurface] = useState<
    "turf_3g" | "panoramic_glass" | "covered_padel" | "natural_grass"
  >("turf_3g");
  const [newMorning, setNewMorning] = useState(180);
  const [newEvening, setNewEvening] = useState(260);
  const [newPeak, setNewPeak] = useState("17:00");
  const [newDuration, setNewDuration] = useState(60);

  const getCourtState = (court: DashboardCourt): CourtEditState => {
    return (
      edits[court.id] ?? {
        name: court.name,
        priceMorning: court.price_morning,
        priceEvening: court.price_evening,
        peakHourStart: court.peak_hour_start.slice(0, 5),
        slotDurationMinutes: court.slot_duration_minutes,
        isActive: court.is_active,
      }
    );
  };

  const setCourtField = <K extends keyof CourtEditState>(
    court: DashboardCourt,
    key: K,
    value: CourtEditState[K]
  ) => {
    const current = getCourtState(court);
    setEdits((prev) => ({
      ...prev,
      [court.id]: { ...current, [key]: value },
    }));
  };

  const handleSaveCourt = async (court: DashboardCourt) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const state = getCourtState(court);
    setBusyId(court.id);
    const res = await updateCourtSettings({
      courtId: court.id,
      ...state,
    });
    setBusyId(null);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر حفظ إعدادات الملعب");
      return;
    }

    setSuccessMsg(`تم حفظ إعدادات وأسعار «${state.name}» بنجاح.`);
    triggerRealtimeRefresh();
  };

  const handleToggleMaintenance = async (court: DashboardCourt) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(`maint-${court.id}`);
    const res = await toggleCourtMaintenance(court.id, !court.is_active);
    setBusyId(null);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر تغيير حالة الصيانة للملعب");
      return;
    }

    setEdits((prev) => {
      if (!prev[court.id]) return prev;
      return {
        ...prev,
        [court.id]: { ...prev[court.id], isActive: !court.is_active },
      };
    });
    setSuccessMsg(
      !court.is_active
        ? `تمت إعادة تشغيل «${court.name}» وإتاحته للحجز.`
        : `تم تحويل «${court.name}» لوضع الصيانة وإيقاف حجوزاته مؤقتاً.`
    );
    triggerRealtimeRefresh();
  };

  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newName.trim()) {
      setErrorMsg("يرجى إدخال اسم الملعب الفرعي الجديد.");
      return;
    }

    setBusyId("add-new");
    const res = await addVenueCourt({
      venueId: selectedVenue.id,
      name: newName,
      sport: newSport,
      surface: newSurface,
      priceMorning: newMorning,
      priceEvening: newEvening,
      peakHourStart: newPeak,
      slotDurationMinutes: newDuration,
    });
    setBusyId(null);

    if (!res.success) {
      setErrorMsg(res.error || "تعذر إضافة الملعب الجديد");
      return;
    }

    setNewName("");
    setShowAddForm(false);
    setSuccessMsg("تمت إضافة الملعب الفرعي الجديد وتفعيله للحجز فوراً.");
    triggerRealtimeRefresh();
  };

  if (isLoadingVenues) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-44 rounded-2xl bg-[#141418]/70 animate-pulse border border-white/[0.06]"
          />
        ))}
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

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#141418] border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
            <Sliders className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-black text-white">
              إدارة ملاعب «{selectedVenue.name}» ({allCourts.length})
            </h2>
            <p className="text-xs text-zinc-400">
              تعديل أسعار الصباح والمساء ووقت الذروة أو إيقاف ملعب مؤقتاً للصيانة
            </p>
          </div>
        </div>

        {!isStaffMode && (
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="min-h-[44px] px-4 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs inline-flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span>{showAddForm ? "إغلاق نموذج الإضافة" : "إضافة ملعب فرعي جديد"}</span>
          </button>
        )}
      </div>

      {isStaffMode && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />
            <span>
              وضع موظف الاستقبال نشط — يمكنك إيقاف أو تشغيل الملاعب للصيانة، بينما تعديل الأسعار متاح للمالك فقط.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStaffMode(false)}
            className="text-xs font-black text-amber-300 underline"
          >
            التبديل لوضع المالك
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add New Court Panel */}
      {!isStaffMode && showAddForm && (
        <form
          onSubmit={handleAddCourt}
          className="rounded-2xl bg-[#141418] border border-primary/30 p-5 space-y-4 shadow-lg"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
            <Plus className="h-4 w-4 text-primary" strokeWidth={2} />
            <h3 className="text-sm font-black text-white">
              إضافة ملعب فرعي جديد إلى «{selectedVenue.name}»
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-400 block mb-1.5">
                اسم الملعب الجديد *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: ملعب 3 — بادل أو خماسي"
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1.5">
                الرياضة
              </label>
              <select
                value={newSport}
                onChange={(e) =>
                  setNewSport(e.target.value as "football" | "padel")
                }
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
              >
                <option value="football">كرة قدم خماسي</option>
                <option value="padel">بادل (Padel)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1.5">
                نوع الأرضية
              </label>
              <select
                value={newSurface}
                onChange={(e) =>
                  setNewSurface(
                    e.target.value as
                      | "turf_3g"
                      | "panoramic_glass"
                      | "covered_padel"
                      | "natural_grass"
                  )
                }
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
              >
                <option value="turf_3g">نجيل صناعي تركي</option>
                <option value="natural_grass">نجيل طبيعي</option>
                <option value="panoramic_glass">زجاج بانوراما</option>
                <option value="covered_padel">بادل مغطى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1.5">
                سعر الصباح (ج.م)
              </label>
              <input
                type="number"
                min={50}
                step={10}
                value={newMorning}
                onChange={(e) => setNewMorning(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1.5">
                سعر الذروة/المساء (ج.م)
              </label>
              <input
                type="number"
                min={50}
                step={10}
                value={newEvening}
                onChange={(e) => setNewEvening(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1.5">
                بداية وقت الذروة
              </label>
              <select
                value={newPeak}
                onChange={(e) => setNewPeak(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
              >
                <option value="16:00">04:00 م</option>
                <option value="17:00">05:00 م</option>
                <option value="18:00">06:00 م</option>
                <option value="19:00">07:00 م</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1.5">
                مدة الحجز
              </label>
              <select
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
              >
                <option value={60}>60 دقيقة (ساعة)</option>
                <option value={90}>90 دقيقة (ساعة ونصف)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] text-zinc-300 font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={busyId === "add-new"}
              className="min-h-[44px] px-6 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center gap-2 transition-all"
            >
              {busyId === "add-new" ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2} />
              )}
              <span>إضافة وتفعيل الملعب</span>
            </button>
          </div>
        </form>
      )}

      {/* Existing Courts Grid */}
      {allCourts.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-3">
          <Sliders
            className="h-10 w-10 text-zinc-500 mx-auto"
            strokeWidth={1.5}
          />
          <h3 className="text-base font-bold text-white">
            لا توجد ملاعب فرعية مسجلة حتى الآن
          </h3>
          <p className="text-xs text-zinc-400">
            استخدم زر «إضافة ملعب فرعي جديد» بالأعلى لإضافة أول ملعب وبدء الحجز.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {allCourts.map((court) => {
            const state = getCourtState(court);
            const isSaving = busyId === court.id;
            const isMaintBusy = busyId === `maint-${court.id}`;

            return (
              <div
                key={court.id}
                className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 sm:p-5 space-y-4"
              >
                {/* Court Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/[0.06] text-primary flex items-center justify-center font-black text-xs">
                      {court.sport === "football" ? "5V5" : "PAD"}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        {court.name}
                      </h3>
                      <span className="text-xs text-zinc-400">
                        {court.sport === "football" ? "كرة قدم" : "بادل"} •{" "}
                        {court.slot_duration_minutes} دقيقة للحجز
                      </span>
                    </div>
                  </div>

                  {/* Direct Maintenance Toggle */}
                  <button
                    type="button"
                    disabled={isMaintBusy}
                    onClick={() => void handleToggleMaintenance(court)}
                    className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-all disabled:opacity-50 ${
                      court.is_active
                        ? "bg-emerald-500/10 hover:bg-amber-500/15 border-emerald-500/25 hover:border-amber-500/30 text-emerald-400 hover:text-amber-300"
                        : "bg-amber-500/15 hover:bg-emerald-500/15 border-amber-500/35 hover:border-emerald-500/30 text-amber-300 hover:text-emerald-300"
                    }`}
                  >
                    {isMaintBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Wrench className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    <span>
                      {court.is_active
                        ? "نشط (اضغط لإيقافه للصيانة)"
                        : "متوقف للصيانة (اضغط لإعادة التشغيل)"}
                    </span>
                  </button>
                </div>

                {/* Pricing & Settings Form Fields */}
                {!isStaffMode && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="lg:col-span-2">
                        <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                          اسم الملعب
                        </label>
                        <input
                          type="text"
                          value={state.name}
                          onChange={(e) =>
                            setCourtField(court, "name", e.target.value)
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                          السعر الصباحي (ج.م)
                        </label>
                        <input
                          type="number"
                          min={50}
                          step={10}
                          value={state.priceMorning}
                          onChange={(e) =>
                            setCourtField(
                              court,
                              "priceMorning",
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                          السعر المسائي (ج.م)
                        </label>
                        <input
                          type="number"
                          min={50}
                          step={10}
                          value={state.priceEvening}
                          onChange={(e) =>
                            setCourtField(
                              court,
                              "priceEvening",
                              Number(e.target.value)
                            )
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                          ساعة الذروة
                        </label>
                        <select
                          value={state.peakHourStart}
                          onChange={(e) =>
                            setCourtField(court, "peakHourStart", e.target.value)
                          }
                          className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                        >
                          <option value="16:00">04:00 م</option>
                          <option value="17:00">05:00 م</option>
                          <option value="18:00">06:00 م</option>
                          <option value="19:00">07:00 م</option>
                          <option value="20:00">08:00 م</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-zinc-400">
                          مدة الساعة:
                        </label>
                        <select
                          value={state.slotDurationMinutes}
                          onChange={(e) =>
                            setCourtField(
                              court,
                              "slotDurationMinutes",
                              Number(e.target.value)
                            )
                          }
                          className="min-h-[40px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                        >
                          <option value={60}>60 دقيقة</option>
                          <option value={90}>90 دقيقة</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleSaveCourt(court)}
                        className="min-h-[44px] px-5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center gap-1.5 transition-all"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                        ) : (
                          <Check className="h-4 w-4" strokeWidth={2} />
                        )}
                        <span>حفظ تعديلات الملعب</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
