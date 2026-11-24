"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  getUserProfile,
  getFavoriteVenueIds,
  toggleFavoriteVenueRecord,
  signOut as apiSignOut,
  type UserProfile,
  type UserRole,
} from "@/lib/api/auth";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  favoriteVenueIds: string[];
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "signin" | "signup" | "forgot";
  authRedirectUrl?: string;
  openAuthModal: (tab?: "signin" | "signup" | "forgot", redirect?: string) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggleFavoriteVenue: (venueId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>(undefined);

  const supabase = useMemo(() => createClient(), []);

  const fetchProfileAndFavorites = useCallback(async (u: User) => {
    try {
      const [p, favs] = await Promise.all([
        getUserProfile(u.id),
        getFavoriteVenueIds(u.id),
      ]);

      setFavoriteVenueIds(favs);

      if (p) {
        setProfile(p);
      } else {
        setProfile({
          id: u.id,
          full_name:
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "لاعب",
          email: u.email || null,
          phone: u.user_metadata?.phone || null,
          preferred_position: "أي مركز",
          role: "player",
          avatar_url: u.user_metadata?.avatar_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("fetchProfileAndFavorites error:", e);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfileAndFavorites(user);
    }
  }, [user, fetchProfileAndFavorites]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!mounted) return;
      setUser(currentUser ?? null);
      if (currentUser) {
        fetchProfileAndFavorites(currentUser).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfileAndFavorites(currentUser);
      } else {
        setProfile(null);
        setFavoriteVenueIds([]);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileAndFavorites]);

  const openAuthModal = useCallback(
    (tab: "signin" | "signup" | "forgot" = "signin", redirect?: string) => {
      setAuthModalTab(tab);
      setAuthRedirectUrl(redirect);
      setIsAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
    setProfile(null);
    setFavoriteVenueIds([]);
  }, []);

  const toggleFavoriteVenue = useCallback(
    async (venueId: string) => {
      if (!user) {
        openAuthModal("signin");
        return;
      }

      const isCurrentlyFav = favoriteVenueIds.includes(venueId);
      // Optimistic UI update
      setFavoriteVenueIds((prev) =>
        isCurrentlyFav ? prev.filter((id) => id !== venueId) : [...prev, venueId]
      );

      const res = await toggleFavoriteVenueRecord(user.id, venueId, isCurrentlyFav);
      if (!res.success) {
        // Revert on failure
        setFavoriteVenueIds((prev) =>
          isCurrentlyFav ? [...prev, venueId] : prev.filter((id) => id !== venueId)
        );
      }
    },
    [user, favoriteVenueIds, openAuthModal]
  );

  const role: UserRole = profile?.role || "player";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        favoriteVenueIds,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        authRedirectUrl,
        openAuthModal,
        closeAuthModal,
        signOut,
        refreshProfile,
        toggleFavoriteVenue,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
