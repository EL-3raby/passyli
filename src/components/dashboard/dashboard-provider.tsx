"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getDashboardVenues,
  getPendingReceipts,
  type DashboardReceipt,
  type DashboardBooking,
  type DashboardCourt,
  type DashboardVenue,
} from "@/lib/api/dashboard";
import { createClient } from "@/lib/supabase/client";
import {
  isDashboardSoundEnabled,
  playReceiptChime,
  setDashboardSoundEnabled,
} from "@/lib/sound";
import { type OperationalNotification } from "@/components/shared/notifications-popover";
import WalkinModal from "@/components/dashboard/walkin-modal";
import SearchModal from "@/components/dashboard/search-modal";
import RecurringBookingModal from "@/components/dashboard/recurring-booking-modal";
import DailyRunningSheetModal from "@/components/dashboard/daily-running-sheet-modal";

interface WalkinModalOptions {
  courtId?: string;
  startTime?: string;
  date?: string;
}

interface RunningSheetOptions {
  date: string;
  bookings: DashboardBooking[];
}

interface DashboardContextValue {
  venues: DashboardVenue[];
  selectedVenueId: string;
  setSelectedVenueId: (id: string) => void;
  selectedVenue: DashboardVenue | null;
  allCourts: DashboardCourt[];
  pendingCount: number;
  isLoadingVenues: boolean;
  venuesError: string | null;
  isStaffMode: boolean;
  toggleStaffMode: () => void;
  setStaffMode: (val: boolean) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  realtimeTick: number;
  newReceiptBanner: boolean;
  dismissReceiptBanner: () => void;
  refreshVenues: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  triggerRealtimeRefresh: () => void;
  openWalkinModal: (opts?: WalkinModalOptions) => void;
  openSearchModal: () => void;
  openRecurringModal: () => void;
  openRunningSheetModal: (opts: RunningSheetOptions) => void;
  notifications: OperationalNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotificationsHistory: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(true);
  const [venuesError, setVenuesError] = useState<string | null>(null);

  const [isStaffMode, setIsStaffMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  const [realtimeTick, setRealtimeTick] = useState<number>(0);
  const [newReceiptBanner, setNewReceiptBanner] = useState<boolean>(false);

  // Global Modal states
  const [walkinKey, setWalkinKey] = useState<number>(0);
  const [isWalkinOpen, setIsWalkinOpen] = useState<boolean>(false);
  const [walkinOpts, setWalkinOpts] = useState<WalkinModalOptions>({});

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [recurringKey, setRecurringKey] = useState<number>(0);
  const [isRecurringOpen, setIsRecurringOpen] = useState<boolean>(false);

  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [sheetData, setSheetData] = useState<RunningSheetOptions>({
    date: new Date().toISOString().split("T")[0],
    bookings: [],
  });

  const [pendingReceipts, setPendingReceipts] = useState<DashboardReceipt[]>([]);
  const [realtimeAlerts, setRealtimeAlerts] = useState<OperationalNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = window.localStorage.getItem("passyli_read_notifications");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    setSoundEnabled(isDashboardSoundEnabled());
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingReceipts();
      setPendingReceipts(pending);
      setPendingCount(pending.length);
    } catch {
      // Non-fatal counter error
    }
  }, []);

  const refreshVenues = useCallback(async () => {
    try {
      setVenuesError(null);
      const list = await getDashboardVenues();
      setVenues(list);
      setSelectedVenueId((prev) => {
        if (prev && list.some((v) => v.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "تعذر تحميل بيانات المنشآت";
      setVenuesError(msg);
    } finally {
      setIsLoadingVenues(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([refreshVenues(), refreshPendingCount()]);
  }, [refreshVenues, refreshPendingCount]);

  // Global Cmd+K / Ctrl+K shortcut for quick booking search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Single global Realtime WebSocket channel for all dashboard routes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard_global_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const b = payload.new as {
              id?: string;
              booker_name?: string;
              total_price?: number;
              booking_date?: string;
            };
            const id = `booking-${b.id || Date.now()}`;
            setRealtimeAlerts((prev) => [
              {
                id,
                type: "booking",
                title: "حجز جديد على الملعب",
                description: `حجز جديد للكابتن ${b.booker_name || "لاعب"} بقيمة ${
                  b.total_price || 0
                } ج.م بتاريخ ${b.booking_date || ""}`,
                timestamp: new Date().toISOString(),
                isRead: false,
                actionLabel: "عرض الجدول ⬅",
                actionHref: "/dashboard",
                priority: "normal",
              },
              ...prev.slice(0, 15),
            ]);
            playReceiptChime();
          } else if (
            payload.eventType === "UPDATE" &&
            (payload.new as { status?: string })?.status === "cancelled"
          ) {
            const b = payload.new as { id?: string; booker_name?: string };
            const id = `cancel-${b.id || Date.now()}`;
            setRealtimeAlerts((prev) => [
              {
                id,
                type: "booking",
                title: "تم إلغاء حجز",
                description: `تم إلغاء حجز الكابتن ${
                  b.booker_name || "لاعب"
                } وأصبحت الساعة شاغرة مجدداً.`,
                timestamp: new Date().toISOString(),
                isRead: false,
                actionLabel: "عرض الجدول ⬅",
                actionHref: "/dashboard",
                priority: "urgent",
              },
              ...prev.slice(0, 15),
            ]);
          }
          setRealtimeTick((n) => n + 1);
          void refreshPendingCount();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as {
              id?: string;
              sender_name?: string;
              amount_paid?: number;
              payment_method?: string;
            };
            const id = `receipt-live-${r.id || Date.now()}`;
            setRealtimeAlerts((prev) => [
              {
                id,
                type: "receipt",
                title: "وصل إيصال دفع جديد الآن",
                description: `قام ${r.sender_name || "لاعب"} بتحويل ${
                  r.amount_paid || 0
                } ج.م عبر ${
                  r.payment_method === "instapay" ? "إنستاباي" : "فودافون كاش"
                } وبانتظار اعتمادك.`,
                timestamp: new Date().toISOString(),
                isRead: false,
                actionLabel: "مراجعة الإيصال ⬅",
                actionHref: "/dashboard/receipts",
                priority: "urgent",
              },
              ...prev.slice(0, 15),
            ]);
            playReceiptChime();
            setNewReceiptBanner(true);
            window.setTimeout(() => setNewReceiptBanner(false), 7000);
          }
          setRealtimeTick((n) => n + 1);
          void refreshPendingCount();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venues" },
        () => {
          void refreshVenues();
          setRealtimeTick((n) => n + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_wallet_transactions" },
        () => {
          void refreshVenues();
          setRealtimeTick((n) => n + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshPendingCount, refreshVenues]);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? venues[0] ?? null,
    [venues, selectedVenueId]
  );

  const allCourts = useMemo(
    () => selectedVenue?.courts ?? [],
    [selectedVenue]
  );

  const toggleStaffMode = useCallback(() => {
    setIsStaffMode((prev) => !prev);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setDashboardSoundEnabled(next);
      if (next) playReceiptChime();
      return next;
    });
  }, []);

  const openWalkinModal = useCallback((opts?: WalkinModalOptions) => {
    setWalkinOpts(opts ?? {});
    setWalkinKey((k) => k + 1);
    setIsWalkinOpen(true);
  }, []);

  const openSearchModal = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const openRecurringModal = useCallback(() => {
    setRecurringKey((k) => k + 1);
    setIsRecurringOpen(true);
  }, []);

  const openRunningSheetModal = useCallback((opts: RunningSheetOptions) => {
    setSheetData(opts);
    setIsSheetOpen(true);
  }, []);

  const triggerRealtimeRefresh = useCallback(() => {
    setRealtimeTick((n) => n + 1);
    void Promise.all([refreshVenues(), refreshPendingCount()]);
  }, [refreshPendingCount, refreshVenues]);

  const notifications = useMemo<OperationalNotification[]>(() => {
    const list: OperationalNotification[] = [];

    // 1. Pending Receipts
    pendingReceipts.forEach((r) => {
      const id = `receipt-${r.id}`;
      list.push({
        id,
        type: "receipt",
        title: "إيصال دفع بانتظار المراجعة",
        description: `قام ${r.sender_name} بتحويل ${r.amount_paid} ج.م عبر ${
          r.payment_method === "instapay" ? "إنستاباي" : "فودافون كاش"
        } (مرجع: ${r.reference_number || "—"})`,
        timestamp: r.created_at,
        isRead: readNotificationIds.has(id),
        actionLabel: "مراجعة الإيصال ⬅",
        actionHref: "/dashboard/receipts",
        priority: "urgent",
      });
    });

    // 2. Low prepaid balance warning (for venue owner)
    if (
      selectedVenue &&
      selectedVenue.prepaid_balance <=
        Math.max(30, (selectedVenue.commission_per_slot || 15) * 2)
    ) {
      const id = `wallet-low-${selectedVenue.id}`;
      list.push({
        id,
        type: "wallet",
        title: "تنبيه: رصيد المحفظة قارب على النفاد",
        description: `الرصيد المتبقي هو ${selectedVenue.prepaid_balance} ج.م. يرجى الشحن لضمان استمرار ظهور ملاعبك في الحجز الأونلاين.`,
        timestamp: new Date().toISOString(),
        isRead: readNotificationIds.has(id),
        actionLabel: "شحن المحفظة ⬅",
        actionHref: "/dashboard/wallet",
        priority: "urgent",
      });
    }

    // 3. Realtime pushed alerts (new bookings, cancellations)
    realtimeAlerts.forEach((a) => {
      if (!list.some((item) => item.id === a.id)) {
        list.push({
          ...a,
          isRead: a.isRead || readNotificationIds.has(a.id),
        });
      }
    });

    // Sort by timestamp descending
    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [pendingReceipts, selectedVenue, realtimeAlerts, readNotificationIds]);

  const markNotificationAsRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        window.localStorage.setItem(
          "passyli_read_notifications",
          JSON.stringify(Array.from(next))
        );
      } catch {}
      return next;
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      try {
        window.localStorage.setItem(
          "passyli_read_notifications",
          JSON.stringify(Array.from(next))
        );
      } catch {}
      return next;
    });
  }, [notifications]);

  const clearNotificationsHistory = useCallback(() => {
    setRealtimeAlerts([]);
    setReadNotificationIds(new Set());
    try {
      window.localStorage.removeItem("passyli_read_notifications");
    } catch {}
  }, []);

  const value: DashboardContextValue = {
    venues,
    selectedVenueId,
    setSelectedVenueId,
    selectedVenue,
    allCourts,
    pendingCount,
    isLoadingVenues,
    venuesError,
    isStaffMode,
    toggleStaffMode,
    setStaffMode: setIsStaffMode,
    soundEnabled,
    toggleSound,
    selectedDate,
    setSelectedDate,
    realtimeTick,
    newReceiptBanner,
    dismissReceiptBanner: () => setNewReceiptBanner(false),
    refreshVenues,
    refreshPendingCount,
    triggerRealtimeRefresh,
    openWalkinModal,
    openSearchModal,
    openRecurringModal,
    openRunningSheetModal,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotificationsHistory,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}

      {isWalkinOpen && (
        <WalkinModal
          key={`walkin-${walkinKey}`}
          isOpen={isWalkinOpen}
          onClose={() => setIsWalkinOpen(false)}
          courts={allCourts}
          initialCourtId={walkinOpts.courtId ?? allCourts[0]?.id}
          initialDate={walkinOpts.date ?? selectedDate}
          initialStartTime={walkinOpts.startTime ?? "18:00"}
          onBookingSuccess={triggerRealtimeRefresh}
        />
      )}

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        venueId={selectedVenue?.id}
        onSelectBookingDate={(d) => {
          setSelectedDate(d);
        }}
      />

      {isRecurringOpen && (
        <RecurringBookingModal
          key={`recurring-${recurringKey}`}
          isOpen={isRecurringOpen}
          onClose={() => setIsRecurringOpen(false)}
          courts={allCourts}
          initialDate={selectedDate}
          onSuccess={triggerRealtimeRefresh}
        />
      )}

      <DailyRunningSheetModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        venueName={selectedVenue?.name || "الملعب"}
        date={sheetData.date}
        bookings={sheetData.bookings}
        courts={allCourts}
      />
    </DashboardContext.Provider>
  );
}
