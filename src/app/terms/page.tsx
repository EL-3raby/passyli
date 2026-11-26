import Link from "next/link";
import { ShieldCheck, FileText, ChevronLeft, Scale, Clock, AlertTriangle, Users } from "lucide-react";

export const metadata = {
  title: "شروط وأحكام الحجز والاستخدام | باصيلي",
  description: "الشروط والأحكام الرسمية لاستخدام منصة باصيلي وحجز ملاعب كرة القدم الخماسي والبادل.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-10 pb-24 px-4 sm:px-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3 border-b border-white/[0.08] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold">
            <Scale className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>الميثاق القانوني والتشغيلي</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            شروط وأحكام الحجز والاستخدام — باصي&zwj;<span className="text-primary">&zwj;لي</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            تاريخ آخر تحديث: نوفمبر 2026. تسري هذه الشروط على جميع اللاعبين، الفرق، والمنشآت الرياضية الشريكة المسجلة على المنصة.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* Section 1 */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>1. طبيعة الخدمة ودور المنصة</span>
            </h2>
            <p>
              منصة «باصيلي (Passyli)» هي منصة تقنية سحابية تعمل كوسيط رقمي لتنظيم وحجز الملاعب الرياضية (كرة القدم الخماسي وملاعب البادل) في جمهورية مصر العربية. تتيح المنصة للمستخدمين البحث، المقارنة، قفل المواعيد، وسداد العربون للمنشآت الرياضية مباشرة دون أي تضارب أو حجز مزدوج.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>2. قواعد الحجز وقفل الموعد المؤقت (8 دقائق)</span>
            </h2>
            <p>
              عند اختيار ميعاد والبدء في إجراءات السداد، تقوم المنصة بحجز الموعد مؤقتاً لصالحك لمدة <strong>8 دقائق كاملة</strong> لمنع أي مستخدم آخر من حجز نفس الساعة. يتعين على المستخدم خلال هذه المدة تحويل العربون المطلوب ورفع إيصال التحويل وتسجيل الرقم المرجعي. في حال انتهاء الـ 8 دقائق دون تأكيد، يتم تحرير الساعة تلقائياً لجميع المستخدمين.
            </p>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>3. التحويلات المالية والإيصالات</span>
            </h2>
            <p>
              يتم تحويل مبالغ العربون مباشرة لحسابات إنستاباي (InstaPay) أو محافظ فودافون كاش المعتمدة الخاصة بالملعب. يُلزم المستخدم بإدخال الرقم المرجعي الصحيح للعملية. أي محاولة لرفع إيصالات مكررة أو مزورة تؤدي للإدراج التلقائي في <strong>القائمة السوداء (Fraud Blacklist)</strong> وحظر الرقم نهائياً من الحجز على المنصة.
            </p>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>4. التزامات اللاعبين والمنشأة الرياضية</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 text-xs sm:text-sm">
              <li>التواجد بالملعب قبل الموعد بـ 15 دقيقة للتسخين وتفادي استهلاك وقت المباراة.</li>
              <li>الالتزام بالأحذية الرياضية المخصصة للنجيل الصناعي والترتان للحفاظ على السلامة.</li>
              <li>سداد المبلغ المتبقي كاش لإدارة الملعب فور الحضور وقبل بدء المباراة.</li>
              <li>تلتزم المنشأة الرياضية بتجهيز الملعب والإنارة والكرة في الموعد المحدد دون أي تأخير.</li>
            </ul>
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
            href="/cancellation"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>الاطلاع على سياسة الإلغاء واسترداد العربون</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
