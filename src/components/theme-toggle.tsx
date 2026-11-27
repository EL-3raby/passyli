"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

interface ThemeToggleProps {
  variant?: "button" | "segmented" | "dropdown";
  className?: string;
}

export default function ThemeToggle({
  variant = "button",
  className = "",
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Loading skeleton placeholder to prevent Layout Shift (CLS: 0) and Hydration Mismatch
  if (!mounted) {
    if (variant === "segmented") {
      return (
        <div
          className={`h-11 w-48 rounded-full bg-surface border border-border animate-pulse ${className}`}
          aria-hidden="true"
        />
      );
    }
    return (
      <div
        className={`h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-surface border border-border animate-pulse shrink-0 ${className}`}
        aria-hidden="true"
      />
    );
  }

  // 1. Segmented Control Variant (Light / Dark / System)
  if (variant === "segmented") {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-full bg-surface border border-border gap-1 text-xs font-bold ${className}`}
        role="group"
        aria-label="اختيار مظهر التطبيق"
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full transition-all ${
            theme === "light"
              ? "bg-primary text-black font-black shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={theme === "light"}
        >
          <Sun className="h-4 w-4" strokeWidth={1.5} />
          <span>نهاري</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full transition-all ${
            theme === "dark"
              ? "bg-primary text-black font-black shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={theme === "dark"}
        >
          <Moon className="h-4 w-4" strokeWidth={1.5} />
          <span>ليلي</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("system")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full transition-all ${
            theme === "system"
              ? "bg-primary text-black font-black shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={theme === "system"}
        >
          <Monitor className="h-4 w-4" strokeWidth={1.5} />
          <span>تلقائي</span>
        </button>
      </div>
    );
  }

  // 2. Dropdown Menu Variant
  if (variant === "dropdown") {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full bg-surface hover:bg-muted border border-border text-foreground transition-all active:scale-95 shadow-sm"
          aria-label="تغيير مظهر الصفحة"
          aria-expanded={isOpen}
          title="تغيير مظهر الصفحة (نهاري / ليلي / تلقائي)"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
          ) : (
            <Sun className="h-4.5 w-4.5 text-amber-500" strokeWidth={1.5} />
          )}
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-44 rounded-2xl bg-surface border border-border p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setTheme("light");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                theme === "light"
                  ? "bg-primary/15 text-primary font-black"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                <span>الوضع النهاري</span>
              </div>
              {theme === "light" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme("dark");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                theme === "dark"
                  ? "bg-primary/15 text-primary font-black"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
                <span>الوضع الليلي</span>
              </div>
              {theme === "dark" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme("system");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                theme === "system"
                  ? "bg-primary/15 text-primary font-black"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                <span>تلقائي (حسب الجهاز)</span>
              </div>
              {theme === "system" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. Compact Icon Toggle Button Variant (Default for Top Navbar)
  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => {
    // If currently dark, switch to light; if light, switch to dark
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full bg-surface hover:bg-muted border border-border text-foreground transition-all duration-200 active:scale-90 shadow-sm shrink-0 ${className}`}
      aria-label={isDark ? "التحويل إلى الوضع النهاري" : "التحويل إلى الوضع الليلي"}
      title={
        isDark
          ? `الوضع الحالي: ليلي (${theme === "system" ? "تلقائي" : "مثبت"}) — انقر للتحويل للنهاري`
          : `الوضع الحالي: نهاري (${theme === "system" ? "تلقائي" : "مثبت"}) — انقر للتحويل لليلي`
      }
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-zinc-300 hover:text-amber-400 transition-colors" strokeWidth={1.5} />
      ) : (
        <Moon className="h-4.5 w-4.5 text-zinc-700 hover:text-primary transition-colors" strokeWidth={1.5} />
      )}
    </button>
  );
}
