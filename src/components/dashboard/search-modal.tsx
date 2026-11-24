"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  User,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  ExternalLink,
} from "lucide-react";
import { searchBookings, type DashboardBooking } from "@/lib/api/dashboard";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId?: string;
  onSelectBookingDate?: (date: string) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  venueId,
  onSelectBookingDate,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DashboardBooking[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchBookings(trimmed, venueId);
      setResults(res);
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, venueId]);

  if (!isOpen) return null;

  const handleCopyRef = (ref: string, id: string) => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(ref);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimeArabic = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const period = h >= 12 ? "م" : "ص";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${period}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        dir="rtl"
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" strokeWidth={1.5} />
            <input
              type="text"
              autoFocus
              placeholder="ابحث برقم هاتف الكابتن، الاسم، أو كود الحجز (PAS-... / WALK-...)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl bg-[#1c1c1f] border border-white/10 px-4 py-3 pr-11 text-sm font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all shrink-0"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isSearching ? (
            <div className="text-center py-12 text-xs text-zinc-500">
              جاري البحث في قاعدة البيانات...
            </div>
          ) : query.trim().length < 2 ? (
            <div className="text-center py-12 text-xs text-zinc-500">
              اكتب حرفين أو رقمين على الأقل للبحث السريع عن أي حجز في المنصة.
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto" strokeWidth={1.5} />
              <p className="text-xs font-bold text-zinc-400">لا توجد حجوزات مطابقة لنص البحث</p>
              <p className="text-[11px] text-zinc-600">
                تأكد من رقم التليفون أو الحروف الأولى من كود الحجز
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <span className="text-[11px] text-zinc-400 font-bold block">
                نتائج البحث ({results.length}):
              </span>
              {results.map((booking) => (
                <div
                  key={booking.id}
                  className="p-3.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] hover:border-primary/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">{booking.booker_name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          booking.status === "confirmed"
                            ? "bg-primary/10 text-primary"
                            : booking.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : booking.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {booking.status === "confirmed"
                          ? "مؤكد"
                          : booking.status === "completed"
                          ? "مكتمل وحضر"
                          : booking.status === "cancelled"
                          ? "ملغي"
                          : "معلق"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      <span className="flex items-center gap-1 font-bold text-zinc-300">
                        <Building2 className="h-3 w-3 text-primary" strokeWidth={1.5} />
                        {booking.court?.venue?.name || "الملعب"} • {booking.court?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {booking.booking_date}
                      </span>
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" strokeWidth={1.5} />
                        {formatTimeArabic(booking.start_time)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="text-zinc-500">كود الحجز:</span>
                      <span className="font-mono text-zinc-300 font-bold bg-black/40 px-1.5 py-0.5 rounded">
                        {booking.booking_reference}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyRef(booking.booking_reference, booking.id)}
                        className="text-zinc-400 hover:text-white"
                        title="نسخ"
                      >
                        {copiedId === booking.id ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions / Financials */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 border-white/[0.04] pt-2 sm:pt-0">
                    <div className="text-left sm:text-right text-xs">
                      <span className="text-zinc-400 block text-[10px]">المتبقي كاش:</span>
                      <span
                        className={`font-bold tabular-nums ${
                          booking.cash_remaining === 0 ? "text-zinc-500" : "text-amber-400"
                        }`}
                      >
                        {booking.cash_remaining} ج.م
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${booking.booker_phone}`}
                        className="h-8 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3 text-primary" strokeWidth={1.5} />
                        <span dir="ltr" className="tabular-nums">
                          {booking.booker_phone}
                        </span>
                      </a>

                      {onSelectBookingDate && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBookingDate(booking.booking_date);
                            onClose();
                          }}
                          className="h-8 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary flex items-center gap-1"
                        >
                          <span>عرض اليوم</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-white/[0.08] pt-3 text-[11px] text-zinc-500 text-center">
          البحث يشمل الحجوزات السابقة والحالية والمستقبلية لجميع الملاعب.
        </div>
      </div>
    </div>
  );
}
