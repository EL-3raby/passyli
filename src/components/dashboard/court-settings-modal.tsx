"use client";

import { useState } from "react";
import {
  X,
  Sliders,
  Plus,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  updateCourtSettings,
  addVenueCourt,
  type DashboardCourt,
  type DashboardVenue,
} from "@/lib/api/dashboard";

interface CourtSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: DashboardVenue | null;
  onSuccess: () => void;
}

export default function CourtSettingsModal({
  isOpen,
  onClose,
  venue,
  onSuccess,
}: CourtSettingsModalProps) {
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        name: string;
        priceMorning: number;
        priceEvening: number;
        peakHourStart: string;
        slotDurationMinutes: number;
        isActive: boolean;
      }
    >
  >({});

  const [newName, setNewName] = useState("");
  const [newSport, setNewSport] = useState<"football" | "padel">("football");
  const [newSurface, setNewSurface] = useState<
    "turf_3g" | "panoramic_glass" | "covered_padel" | "natural_grass"
  >("turf_3g");
  const [newMorning, setNewMorning] = useState(180);
  const [newEvening, setNewEvening] = useState(260);
  const [newPeak, setNewPeak] = useState("17:00");
  const [newDuration, setNewDuration] = useState(60);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !venue) return null;

  const getCourtState = (court: DashboardCourt) => {
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

  const setCourtField = <K extends keyof ReturnType<typeof getCourtState>>(
    court: DashboardCourt,
    key: K,
    value: ReturnType<typeof getCourtState>[K]
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

    setSuccessMsg(`تم تحديث أسعار وإعدادات "${state.name}" بنجاح.`);
    onSuccess();
  };

  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newName.trim()) {
      setErrorMsg("يرجى إدخال اسم الملعب الفرعي الجديد.");
      return;
    }

    setBusyId("add-new");
    const res = await addVenueCourt({
      venueId: venue.id,
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
    setSuccessMsg("تمت إضافة الملعب الفرعي الجديد وتفعيله للحجز فوراً.");
    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
              <Sliders className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-black text-white">
                إدارة الملاعب الفرعية والأسعار
              </h3>
              <p className="text-xs text-zinc-400">
                {venue.name} — تعديل أسعار الصباح والمساء ووقت الذروة أو إضافة أرضية جديدة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 flex items-center justify-center"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
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

        {/* Existing Courts List */}
        <div className="space-y-3">
          {venue.courts.map((court) => {
            const st = getCourtState(court);
            const isBusy = busyId === court.id;
            return (
              <div
                key={court.id}
                className="rounded-2xl bg-[#0e0e11] border border-white/[0.08] p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="lg:col-span-2">
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      اسم الملعب
                    </label>
                    <input
                      type="text"
                      value={st.name}
                      onChange={(e) => setCourtField(court, "name", e.target.value)}
                      className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      سعر الصباح (ج.م)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={10}
                      value={st.priceMorning}
                      onChange={(e) =>
                        setCourtField(court, "priceMorning", Number(e.target.value))
                      }
                      className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      سعر المساء (ج.م)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={10}
                      value={st.priceEvening}
                      onChange={(e) =>
                        setCourtField(court, "priceEvening", Number(e.target.value))
                      }
                      className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      بداية الذروة
                    </label>
                    <input
                      type="time"
                      value={st.peakHourStart}
                      onChange={(e) =>
                        setCourtField(court, "peakHourStart", e.target.value)
                      }
                      className="w-full min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={st.slotDurationMinutes}
                      onChange={(e) =>
                        setCourtField(
                          court,
                          "slotDurationMinutes",
                          Number(e.target.value)
                        )
                      }
                      className="min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white"
                    >
                      <option value={60}>مدة الساعة: 60 دقيقة</option>
                      <option value={90}>مدة الفترة: 90 دقيقة</option>
                      <option value={120}>مدة الفترة: 120 دقيقة</option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setCourtField(court, "isActive", !st.isActive)
                      }
                      className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 ${
                        st.isActive
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          st.isActive ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <span>{st.isActive ? "متاح للحجز" : "في الصيانة"}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSaveCourt(court)}
                    className="min-h-[44px] px-4 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-xs inline-flex items-center gap-1.5 transition-all"
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    ) : (
                      <Check className="h-4 w-4" strokeWidth={2} />
                    )}
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Court Section */}
        <form
          onSubmit={handleAddCourt}
          className="rounded-2xl bg-[#0e0e11] border border-primary/20 p-4 space-y-3"
        >
          <span className="text-xs font-black text-primary flex items-center gap-1.5">
            <Plus className="h-4 w-4" strokeWidth={2} />
            إضافة ملعب فرعي جديد للنادي
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم الملعب (مثال: ملعب 3 الخماسي)"
              className="min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
            />

            <select
              value={newSport}
              onChange={(e) => {
                const s = e.target.value as "football" | "padel";
                setNewSport(s);
                setNewSurface(s === "padel" ? "panoramic_glass" : "turf_3g");
                setNewDuration(s === "padel" ? 90 : 60);
              }}
              className="min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white"
            >
              <option value="football">كرة قدم خماسي / سباعي</option>
              <option value="padel">بادل (Padel)</option>
            </select>

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
              className="min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white"
            >
              <option value="turf_3g">نجيل صناعي 3G</option>
              <option value="natural_grass">نجيل طبيعي</option>
              <option value="panoramic_glass">زجاج بانوراما</option>
              <option value="covered_padel">بادل مغطى</option>
            </select>

            <input
              type="number"
              min={50}
              step={10}
              value={newMorning}
              onChange={(e) => setNewMorning(Number(e.target.value))}
              placeholder="سعر الصباح"
              className="min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums"
            />

            <input
              type="number"
              min={50}
              step={10}
              value={newEvening}
              onChange={(e) => setNewEvening(Number(e.target.value))}
              placeholder="سعر المساء"
              className="min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums"
            />

            <input
              type="time"
              value={newPeak}
              onChange={(e) => setNewPeak(e.target.value)}
              className="min-h-[44px] rounded-xl bg-[#141418] border border-white/10 px-3 text-xs font-bold text-white tabular-nums"
            />
          </div>

          <button
            type="submit"
            disabled={busyId === "add-new"}
            className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-primary/15 hover:bg-primary hover:text-black border border-primary/35 text-primary font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
          >
            {busyId === "add-new" ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2} />
            )}
            <span>إضافة الملعب الفرعي</span>
          </button>
        </form>
      </div>
    </div>
  );
}
