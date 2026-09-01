"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/lib/store/theme";

export interface LogoProps {
  variant?: "dark" | "light" | "auto";
  showText?: boolean;
  iconOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
  subtext?: string;
}

const sizeConfig = {
  xs: { height: 20, width: 94, iconWidth: 36, iconHeight: 20 },
  sm: { height: 26, width: 122, iconWidth: 48, iconHeight: 26 },
  md: { height: 32, width: 150, iconWidth: 58, iconHeight: 32 },
  lg: { height: 42, width: 198, iconWidth: 76, iconHeight: 42 },
  xl: { height: 54, width: 254, iconWidth: 98, iconHeight: 54 },
  hero: { height: 72, width: 338, iconWidth: 130, iconHeight: 72 },
};

/**
 * M.SHOP Official Logo Component
 * Uses the exact original high-res logo assets uploaded by the user:
 * - `variant="dark"`: White SHOP lettering for dark/black backgrounds
 * - `variant="light"`: Original Royal Blue SHOP lettering for light/white backgrounds
 * - `variant="auto"`: Automatically picks the correct variant based on current theme
 * - `iconOnly={true}`: Just the iconic stylized M. mark
 */
export function Logo({
  variant = "light",
  showText = true,
  iconOnly = false,
  size = "md",
  className,
  subtext,
}: LogoProps) {
  const theme = useThemeStore((s) => s.theme);
  const dims = sizeConfig[size] || sizeConfig.md;

  // Resolve effective variant (defaults to light for white storefront)
  const effectiveVariant =
    variant === "auto" ? (theme === "dark" ? "dark" : "light") : variant;

  const isLight = effectiveVariant === "light";
  const logoSrc = isLight ? "/images/logo-light.png" : "/images/logo-dark.png";
  const subtitleColor = isLight ? "text-slate-600 border-slate-300" : "text-taupe border-white/20";

  if (iconOnly || !showText) {
    return (
      <div className={cn("inline-flex items-center select-none isolate", className)} style={{ mixBlendMode: "normal" }}>
        <Image
          src="/images/logo-icon.png"
          alt="M.SHOP"
          width={dims.iconWidth}
          height={dims.iconHeight}
          className="object-contain transition-transform duration-300 hover:scale-105"
          style={{ mixBlendMode: "normal" }}
          priority
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3 select-none isolate group", className)} style={{ mixBlendMode: "normal" }}>
      <Image
        src={logoSrc}
        alt="M.SHOP"
        width={dims.width}
        height={dims.height}
        className="object-contain transition-transform duration-300 group-hover:scale-105"
        style={{ mixBlendMode: "normal" }}
        priority
      />

      {subtext && (
        <span
          className={cn(
            "text-[10px] font-bold tracking-[0.2em] uppercase font-sans border-l pl-2.5 hidden sm:inline-block leading-tight",
            subtitleColor
          )}
        >
          {subtext}
        </span>
      )}
    </div>
  );
}
