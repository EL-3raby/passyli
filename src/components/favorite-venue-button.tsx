"use client";

import { Heart } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

interface FavoriteVenueButtonProps {
  venueId: string;
  className?: string;
  size?: "sm" | "md";
}

export default function FavoriteVenueButton({
  venueId,
  className = "",
  size = "md",
}: FavoriteVenueButtonProps) {
  const { favoriteVenueIds, toggleFavoriteVenue } = useAuth();
  const isFav = favoriteVenueIds.includes(venueId);

  const sizeClasses =
    size === "sm"
      ? "h-9 w-9 min-h-[36px] min-w-[36px]"
      : "h-11 w-11 min-h-[44px] min-w-[44px]";

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
      className={`rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0 ${sizeClasses} ${
        isFav
          ? "bg-rose-500/25 border border-rose-500/50 text-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.4)]"
          : "bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 text-white/90 hover:text-white hover:border-white/30 shadow-md"
      } ${className}`}
    >
      <Heart
        className={`h-4.5 w-4.5 transition-transform duration-200 ${
          isFav ? "fill-rose-400 scale-110 text-rose-400" : "stroke-white"
        }`}
        strokeWidth={1.75}
      />
    </button>
  );
}
