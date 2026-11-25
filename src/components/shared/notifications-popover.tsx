"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  FileCheck2,
  Calendar,
  Building2,
  Wallet,
  Coins,
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  X,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";

export interface OperationalNotification {
  id: string;
  type: "receipt" | "booking" | "partner" | "recharge" | "wallet" | "dispute" | "system";
  title: string;
  description: string;
  timestamp: string; // ISO date or formatted text
  isRead: boolean;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  priority?: "normal" | "urgent" | "success";
}

interface NotificationsPopoverProps {
  notifications: OperationalNotification[];
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
  title?: string;
  emptyMessage?: string;
  align?: "left" | "right";
}

function getRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return date.toLocaleDateString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

function getNotificationIcon(type: OperationalNotification["type"]) {
  switch (type) {
    case "receipt":
      return <FileCheck2 className="h-4 w-4 text-amber-400" strokeWidth={1.5} />;
    case "booking":
      return <Calendar className="h-4 w-4 text-primary" strokeWidth={1.5} />;
    case "partner":
      return <Building2 className="h-4 w-4 text-cyan-400" strokeWidth={1.5} />;
    case "recharge":
      return <Wallet className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />;
    case "wallet":
      return <Coins className="h-4 w-4 text-rose-400" strokeWidth={1.5} />;
    case "dispute":
      return <AlertTriangle className="h-4 w-4 text-rose-400" strokeWidth={1.5} />;
    case "system":
    default:
      return <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />;
  }
}

export default function NotificationsPopover({
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onClearAll,
  title = "الإشعارات والتنبيهات",
  emptyMessage = "كل الماتشات وإيصالات العربون متراجعة ومفيش حاجة معلقة دلوقتي",
  align = "left",
}: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Filter notifications based on tab
  const displayedNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="عرض التنبيهات والإشعارات"
        aria-expanded={isOpen}
        title="مركز الإشعارات والتنبيهات"
        className={`relative min-h-[38px] min-w-[38px] px-2.5 rounded-xl border transition-all inline-flex items-center justify-center gap-1.5 ${
          isOpen
            ? "bg-primary/15 border-primary/40 text-primary shadow-sm shadow-primary/20"
            : unreadCount > 0
            ? "bg-white/[0.06] hover:bg-white/10 border-white/[0.12] text-white"
            : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-400 hover:text-white"
        }`}
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-black text-[10px] font-black tabular-nums shadow-sm shadow-amber-500/30">
            {unreadCount > 99 ? "+99" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Flyout */}
      {isOpen && (
        <div
          dir="rtl"
          className={`absolute top-full mt-2.5 z-50 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] rounded-3xl bg-[#141418] border border-white/[0.12] shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden flex flex-col transition-all duration-200 ${
            align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08] bg-[#18181c]/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bell className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-black text-white leading-none">
                    {title}
                  </h3>
                  <span className="text-[11px] text-zinc-400 font-bold mt-1 block">
                    {unreadCount > 0 ? (
                      <span className="text-amber-300">
                        فيه {unreadCount} إشعارات جديدة محتاجة تأكيدك
                      </span>
                    ) : (
                      "مفيش إشعارات جديدة دلوقتي"
                    )}
                  </span>
                </div>
              </div>

              {/* Mark all as read button */}
              {unreadCount > 0 && onMarkAllAsRead && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-[11px] font-bold text-primary hover:text-white transition-colors inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20"
                >
                  <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>علم على كله مقروء</span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`flex-1 min-h-[30px] rounded-lg text-xs font-bold transition-all ${
                  filter === "all"
                    ? "bg-white/[0.08] text-white shadow-sm font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                الكل ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`flex-1 min-h-[30px] rounded-lg text-xs font-bold transition-all ${
                  filter === "unread"
                    ? "bg-white/[0.08] text-white shadow-sm font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                الجديد بس ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04] scrollbar-thin scrollbar-thumb-white/10">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">
                    {filter === "unread" ? "مفيش إشعارات جديدة" : "مفيش أي إشعارات دلوقتي"}
                  </p>
                  <p className="text-[11px] text-zinc-500 leading-relaxed px-4">
                    {emptyMessage}
                  </p>
                </div>
              </div>
            ) : (
              displayedNotifications.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.isRead && onMarkAsRead) {
                        onMarkAsRead(item.id);
                      }
                    }}
                    className={`p-3.5 transition-colors relative flex items-start gap-3 cursor-pointer ${
                      item.isRead
                        ? "hover:bg-white/[0.02]"
                        : "bg-primary/[0.03] hover:bg-primary/[0.06]"
                    }`}
                  >
                    {/* Unread indicator bar */}
                    {!item.isRead && (
                      <span
                        className="absolute right-0 top-3 bottom-3 w-1 rounded-l-full bg-primary"
                        aria-hidden="true"
                      />
                    )}

                    {/* Icon container */}
                    <div className="h-8 w-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-black text-white leading-tight">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-zinc-500 shrink-0 font-medium tabular-nums flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />
                          <span>{getRelativeTime(item.timestamp)}</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                        {item.description}
                      </p>

                      {/* Quick Action CTA */}
                      {(item.actionHref || item.onAction) && (
                        <div className="pt-1">
                          {item.actionHref ? (
                            <Link
                              href={item.actionHref}
                              onClick={() => {
                                setIsOpen(false);
                                if (!item.isRead && onMarkAsRead) {
                                  onMarkAsRead(item.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:text-white transition-colors"
                            >
                              <span>{item.actionLabel || "عرض التفاصيل"}</span>
                              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                if (!item.isRead && onMarkAsRead) {
                                  onMarkAsRead(item.id);
                                }
                                item.onAction?.();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-black text-primary hover:text-white transition-colors"
                            >
                              <span>{item.actionLabel || "عرض التفاصيل"}</span>
                              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {onClearAll && notifications.length > 0 && (
            <div className="p-2.5 border-t border-white/[0.08] bg-[#18181c]/50 flex items-center justify-end text-[11px] text-zinc-400">
              <button
                type="button"
                onClick={onClearAll}
                className="hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.04]"
              >
                مسح سجل الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
