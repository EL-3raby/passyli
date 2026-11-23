import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة تحكم إدارة الملاعب والموظفين | باصيلي",
  description: "متابعة جدول الحجوزات الزمني لحظياً، مراجعة إيصالات التحويل، وقفل الساعات كاش لموظفي الاستقبال وأصحاب الملاعب.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {children}
    </div>
  );
}
