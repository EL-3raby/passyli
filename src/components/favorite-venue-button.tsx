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
      ? "h-8 w-8 min-h-[32px] min-w-[32px]"
      : "h-9 w-9 min-h-[38px] min-w-[38px]";

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
      className={`rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shrink-0 ${sizeClasses} ${
        isFav
          ? "bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
          : "bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:border-white/30 shadow-md"
      } ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition-transform duration-200 ${
          isFav ? "fill-rose-400 scale-110 text-rose-400" : "stroke-white/90"
        }`}
        strokeWidth={1.75}
      />
    </button>
  );
}
