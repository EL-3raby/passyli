import Link from "next/link";
import { Lock, ShieldCheck, Database, EyeOff, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "سياسة الخصوصية وسرية البيانات | باصيلي",
  description: "بيان حماية وخصوصية بيانات اللاعبين والمنشآت الرياضية في منصة باصيلي الرياضية.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-10 pb-24 px-4 sm:px-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3 border-b border-white/[0.08] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>حماية وسرية البيانات</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            سياسة الخصوصية وسرية البيانات — باصي&zwj;<span className="text-primary">&zwj;لي</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            نلتزم في باصيلي بحماية بياناتك الشخصية ومحادثاتك ومعلوماتك البنكية بأعلى معايير الأمان والتشفير.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* Section 1 */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Database className="h-5 w-5" strokeWidth={1.5} />
              <h2 className="font-display text-base sm:text-lg text-white">
                1. البيانات التي نجمعها
              </h2>
            </div>
            <p>
              نجمع فقط البيانات الأساسية الضرورية لإتمام عمليات الحجز والتواصل:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 text-xs sm:text-sm">
              <li>الاسم ورقم الهاتف المصري المعتمد للتحقق من هوية الحاجز.</li>
              <li>البريد الإلكتروني لإرسال التذاكر الرقمية والفواتير الرسمية.</li>
              <li>صور إيصالات التحويل البنكي (إنستاباي / فودافون كاش) وتُخزن على خوادم مشفرة.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <EyeOff className="h-5 w-5" strokeWidth={1.5} />
              <h2 className="font-display text-base sm:text-lg text-white">
                2. عدم مشاركة البيانات مع أي طرف ثالث
              </h2>
            </div>
            <p>
              نتعهد بعدم بيع أو تأجير أو مشاركة بياناتك الشخصية أو أرقام هواتفك مع أي شركات تسويقية أو أطراف خارجية. تُشارك بيانات الحجز (الاسم ورقم الهاتف) فقط مع إدارة الملعب المحجوز لتنسيق استلام الملعب وتسجيل الحضور.
            </p>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl bg-[#121316] border border-white/[0.06] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h2 className="font-display text-base sm:text-lg text-white">
                3. التشفير وأمان الجلسات
              </h2>
            </div>
            <p>
              تتم إدارة المصادقة والجلسات عبر خوادم Supabase الآمنة والمشفرة ببروتوكولات SSL/TLS الحديثة. جميع كلمات المرور مشفرة بخوارزميات غير قابلة للعكس، ولا يمكن لأي موظف في المنصة الاطلاع على كلمات المرور الخاصة بالمستخدمين.
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
