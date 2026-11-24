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
  signOut as apiSignOut,
  type UserProfile,
  type UserRole,
} from "@/lib/api/auth";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "signin" | "signup";
  authRedirectUrl?: string;
  openAuthModal: (tab?: "signin" | "signup", redirect?: string) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>(undefined);

  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (u: User) => {
    try {
      const p = await getUserProfile(u.id);
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
          role: "player",
          avatar_url: u.user_metadata?.avatar_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("fetchProfile error:", e);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!mounted) return;
      setUser(currentUser ?? null);
      if (currentUser) {
        fetchProfile(currentUser).finally(() => {
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
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const openAuthModal = useCallback(
    (tab: "signin" | "signup" = "signin", redirect?: string) => {
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
  }, []);

  const role: UserRole = profile?.role || "player";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        authRedirectUrl,
        openAuthModal,
        closeAuthModal,
        signOut,
        refreshProfile,
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
