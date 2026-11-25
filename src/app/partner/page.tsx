"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  KeyRound,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { submitPartnerApplication } from "@/lib/api/dashboard";

const CITIES = [
  "دمنهور",
  "كفر الدوار",
  "إيتاي البارود",
  "رشيد",
  "المحمودية",
  "أبو المطامير",
  "كوم حمادة",
];

export default function PartnerOnboardingPage() {
  const [venueName, setVenueName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("دمنهور");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [sports, setSports] = useState<string[]>(["football"]);
  const [courtsCount, setCourtsCount] = useState<number>(2);
  const [morningPrice, setMorningPrice] = useState<number>(180);
  const [eveningPrice, setEveningPrice] = useState<number>(260);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const toggleSport = (sportKey: string) => {
    setSports((prev) =>
      prev.includes(sportKey)
        ? prev.length > 1
          ? prev.filter((s) => s !== sportKey)
          : prev
        : [...prev, sportKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!/^01[0125][0-9]{8}$/.test(phone.trim())) {
      setErrorMsg("يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً.");
      return;
    }

    const wa = whatsappNumber.trim() || phone.trim();
    if (!/^01[0125][0-9]{8}$/.test(wa)) {
      setErrorMsg("يرجى إدخال رقم واتساب مصري صحيح مكون من 11 رقماً.");
      return;
    }

    setSubmitting(true);
    const res = await submitPartnerApplication({
      venueName,
      applicantName,
      phone,
      whatsappNumber: wa,
      city,
      district,
      address,
      sports,
      courtsCount,
      basePriceMorning: morningPrice,
      basePriceEvening: eveningPrice,
    });
    setSubmitting(false);

    if (!res.success || !res.id) {
      setErrorMsg(res.error || "تعذر إرسال طلب الشراكة، حاول مرة أخرى.");
      return;
    }

    setSubmittedId(res.id);
  };

  if (submittedId) {
    return (
      <main className="min-h-screen bg-[#09090b] pt-24 pb-24 px-4" dir="rtl">
        <div className="max-w-lg mx-auto rounded-3xl bg-[#141418] border border-emerald-500/30 p-8 text-center space-y-5 shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-black text-white">
              تم استلام طلب انضمام ملعبك بنجاح
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              وصل طلب تسجيل <strong>{venueName}</strong> إلى إدارة منصة باصيلي. سيتواصل معك فريقنا خلال ساعات لتأكيد البيانات، ربط حسابك، وتفعيل الرصيد الترحيبي المجاني.
            </p>
          </div>

          <div className="rounded-xl bg-[#09090b] border border-white/[0.08] p-3.5 text-xs">
            <span className="text-zinc-400 block mb-1">رقم مرجع الطلب</span>
            <span dir="ltr" className="font-mono font-black text-primary tabular-nums">
              {submittedId.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/courts"
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
            >
              <span>تصفح الملاعب الحالية</span>
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-white font-bold text-xs inline-flex items-center justify-center"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] pt-24 pb-28 px-4 sm:px-6" dir="rtl">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Value Proposition Column */}
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>برنامج شركاء باصيلي</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-black text-white leading-tight">
              انضم إلى أكبر شبكة ملاعب في{" "}
              <span className="text-primary">دمنهور والبحيرة</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              تخلص من فوضى المكالمات وتضارب المواعيد، واستقبل حجوزات اللاعبين بعربون مباشر على حساباتك.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">
                  رصيد ترحيبي مجاني عند التفعيل
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  ابدأ برصيد هدية (150 ج.م افتراضياً) لاستقبال أول 10 حجوزات أونلاين مجاناً.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">
                  التحويل المباشر بدون تعليق أموال
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  العربون يتحول مباشرة إلى حساب إنستا باي أو فودافون كاش الخاص بملعبك دون وسطاء.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#141418] border border-white/[0.08] p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">
                  بوابة خاصة لموظف الدكة برمز PIN
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  يتابع الموظف جدول الساعات ويقفل حجوزات الكاش بنقرة واحدة مع إخفاء إجمالي الأرباح عنه.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Application Form Column */}
        <section className="lg:col-span-7 rounded-3xl bg-[#141418] border border-white/[0.08] p-5 sm:p-7 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4 mb-5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black text-white">
                استمارة تسجيل منشأة رياضية
              </h2>
              <p className="text-xs text-zinc-400">
                أكمل البيانات التالية وسيتواصل معك فريق الشراكات لتفعيل الملعب فوراً
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  اسم الملعب / النادي *
                </label>
                <input
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="مثال: ملاعب الأبطال دمنهور"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  اسم المالك / المسؤول *
                </label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="الاسم الثنائي أو الثلاثي"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  رقم الموبايل *
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white text-right tabular-nums placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  رقم الواتساب (لإشعارات الحجز)
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="نفس رقم الموبايل إن تُرك فارغاً"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white text-right tabular-nums placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  المدينة *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white focus:outline-none focus:border-primary"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  الحي / المنطقة *
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="مثال: أبو الريش / إفلاقة"
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                العنوان التفصيلي للملعب *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="الشارع وأقرب معلم مميز..."
                className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Sports selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                الرياضات المتوفرة بالمنشأة
              </label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { id: "football", label: "كرة قدم خماسي / سباعي" },
                  { id: "padel", label: "بادل (Padel)" },
                ].map((sp) => {
                  const selected = sports.includes(sp.id);
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => toggleSport(sp.id)}
                      className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-all ${
                        selected
                          ? "bg-primary/15 border-primary text-primary font-black"
                          : "bg-[#09090b] border-white/[0.1] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          selected ? "bg-primary" : "bg-zinc-600"
                        }`}
                      />
                      <span>{sp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  عدد الملاعب الفرعية
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={courtsCount}
                  onChange={(e) => setCourtsCount(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  سعر الساعة صباحاً (ج.م)
                </label>
                <input
                  type="number"
                  min={50}
                  step={10}
                  value={morningPrice}
                  onChange={(e) => setMorningPrice(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  سعر الساعة مساءً (ج.م)
                </label>
                <input
                  type="number"
                  min={50}
                  step={10}
                  value={eveningPrice}
                  onChange={(e) => setEveningPrice(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl bg-[#09090b] border border-white/[0.1] px-3.5 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-black font-black text-sm inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/15"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              )}
              <span>{submitting ? "جاري إرسال الطلب..." : "إرسال طلب الشراكة الآن"}</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
