"use client";

import { useState } from "react";
import { X, MessageCircle, Copy, Check, Share2 } from "lucide-react";
import type { MatchmakingPost } from "@/lib/api/matchmaking";
import { generateSquadWhatsAppMessage } from "@/lib/api/matchmaking";

interface ShareMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: MatchmakingPost | null;
}

export default function ShareMatchModal({
  isOpen,
  onClose,
  post,
}: ShareMatchModalProps) {
  const [copiedType, setCopiedType] = useState<"msg" | "link" | null>(null);

  if (!isOpen || !post) return null;

  const squadMessage = generateSquadWhatsAppMessage(post);
  const matchUrl = typeof window !== "undefined" ? `${window.location.origin}/matchmaking?post=${post.id}` : "";

  const handleCopy = (text: string, type: "msg" | "link") => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleWhatsAppBroadcast = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(squadMessage)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-[#141418] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Share2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                مشاركة التقسيمة وإكمال الفرقة
              </h3>
              <p className="text-xs text-zinc-400">
                انشر رسالة الماتش في جروبات الكورة والواتساب بدمنهور
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-zinc-400 block font-bold">
            معاينة رسالة الجروبات الجاهزة:
          </span>
          <div className="p-3.5 rounded-xl bg-[#1c1c1f] border border-white/[0.06] font-mono text-xs text-zinc-300 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
            {squadMessage}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* Primary WhatsApp Share */}
          <button
            type="button"
            onClick={handleWhatsAppBroadcast}
            className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-4 text-xs sm:text-sm font-black text-black transition-all active:scale-[0.98] shadow-sm"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
            <span>إرسال مباشر إلى مجموعات واتساب</span>
          </button>

          {/* Copy Message Button */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleCopy(squadMessage, "msg")}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all"
            >
              {copiedType === "msg" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                  <span>تم نسخ الرسالة!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>نسخ نص الرسالة</span>
                </>
              )}
            </button>

            {/* Copy Link Button */}
            <button
              type="button"
              onClick={() => handleCopy(matchUrl, "link")}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all"
            >
              {copiedType === "link" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                  <span>تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>نسخ الرابط فقط</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
