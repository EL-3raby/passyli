import Link from "next/link";
import { Clock, CalendarClock, RotateCcw, AlertTriangle, ShieldCheck, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "سياسة الإلغاء ونقل المواعيد واسترداد العربون | باصيلي",
  description: "القواعد والسياسات المعتمدة لنقل مواعيد المباريات، إلغاء الحجز، واسترداد مبالغ العربون في منصة باصيلي.",
};

export default function CancellationPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-10 pb-24 px-4 sm:px-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3 border-b border-white/[0.08] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold">
            <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>سياسات المواعيد والعربون</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            سياسة الإلغاء ونقل المواعيد واسترداد العربون
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            نهدف في منصة باصيلي إلى ضمان حقوق اللاعبين وأصحاب الملاعب بالتساوي، وتوفير مرونة عادلة لإعادة جدولة المباريات.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* Rule 1: 12-Hour Rescheduling */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold">
              <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
              <h2 className="font-display text-base sm:text-lg text-white">
                1. ميزة نقل الميعاد الفوري (Reschedule) قبل 12 ساعة مجاناً
              </h2>
            </div>
            <p>
              تتيح منصة باصيلي لجميع اللاعبين إمكانية <strong>نقل ميعاد الحجز مجاناً 100%</strong> لأي ساعة أو يوم آخر متاح في نفس الملعب، بشرط تقديم الطلب قبل انطلاق الموعد الأصلي بـ <strong>12 ساعة على الأقل</strong> من خلال صفحة التذكرة الرقمية بضغطة زر واحدة ودون أي خصومات مالية.
            </p>
          </section>

          {/* Rule 2: Late Cancellation */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Clock className="h-5 w-5" strokeWidth={1.5} />
              <h2 className="font-display text-base sm:text-lg text-white">
                2. الإلغاء المتأخر (أقل من 12 ساعة)
              </h2>
            </div>
            <p>
              في حال طلب الإلغاء في مدة تقل عن 12 ساعة من موعد المباراة، يُعد العربون غير قابل للاسترداد تلقائياً لتعويض الملعب عن ضياع فرصة تأجير الساعة لفريق آخر، إلا في الحالات الاستثنائية القهرية التي توافق عليها إدارة المنشأة الرياضية يدوياً.
            </p>
          </section>

          {/* Rule 3: Bad Weather & Emergencies */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
              <h2 className="font-display text-base sm:text-lg text-white">
                3. سوء الأحوال الجوية وإغلاق الملاعب القهري
              </h2>
            </div>
            <p>
              في حال سقوط أمطار غزيرة أو حدوث عطل طارئ في إنارة الملعب يجعل اللعب مستحيلاً أو خطراً على سلامة اللاعبين:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 text-xs sm:text-sm">
              <li>يتم نقل الموعد فوراً لأي وقت بديل يناسب الفريقين.</li>
              <li>في حال تعذر الاتفاق على موعد بديل، يتم استرداد العربون كاملاً دون خصم أي رسوم إدارية.</li>
            </ul>
          </section>

          {/* Rule 4: Instant 8-Minute Hold Cancellation */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <h2 className="font-display text-base sm:text-lg text-white">
                4. التراجع أثناء فترة القفل المؤقت (8 دقائق)
              </h2>
            </div>
            <p>
              إذا قمت بحجز ميعاد وتراجعت قبل إتمام التحويل المالي أو رفع الإيصال، يمكنك الضغط على زر "رجوع" أو إغلاق النافذة ليتم فك قفل الساعة فورياً لجميع اللاعبين الآخرين.
            </p>
          </section>
        </div>

        {/* Back CTA */}
        <div className="pt-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 px-5 text-xs font-bold text-white transition-all"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            <span>العودة للرئيسية</span>
          </Link>

          <Link
            href="/terms"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>شروط وأحكام الحجز والاستخدام</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
