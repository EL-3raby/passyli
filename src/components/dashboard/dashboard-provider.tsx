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

  useEffect(() => {
    setSoundEnabled(isDashboardSoundEnabled());
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingReceipts();
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
        () => {
          setRealtimeTick((n) => n + 1);
          void refreshPendingCount();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
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
