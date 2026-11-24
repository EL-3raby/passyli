"use client";

import { Heart } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

interface FavoriteVenueButtonProps {
  venueId: string;
  className?: string;
}

export default function FavoriteVenueButton({
  venueId,
  className = "",
}: FavoriteVenueButtonProps) {
  const { favoriteVenueIds, toggleFavoriteVenue } = useAuth();
  const isFav = favoriteVenueIds.includes(venueId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavoriteVenue(venueId);
      }}
      aria-label={isFav ? "إزالة من المفضلة" : "حفظ في المفضلة"}
      title={isFav ? "إزالة من الملاعب المفضلة" : "حفظ في الملاعب المفضلة"}
      className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
        isFav
          ? "bg-rose-500/15 border-rose-500/35 text-rose-400"
          : "bg-[#1c1c1f]/90 border-white/10 text-zinc-300 hover:text-white hover:border-white/25"
      } ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition-transform ${isFav ? "fill-rose-400 scale-110" : ""}`}
        strokeWidth={1.5}
      />
    </button>
  );
}
