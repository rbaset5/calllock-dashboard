"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showImage?: boolean;
  className?: string;
  imageOnly?: boolean;
}

const sizes = {
  sm: { text: "text-lg", image: 24, gap: "gap-1.5" },
  md: { text: "text-xl", image: 32, gap: "gap-2" },
  lg: { text: "text-2xl", image: 40, gap: "gap-2.5" },
  xl: { text: "text-3xl", image: 48, gap: "gap-3" },
};

export function Logo({
  size = "md",
  showImage = true,
  className,
  imageOnly = false,
}: LogoProps) {
  const sizeConfig = sizes[size];

  if (imageOnly) {
    return (
      <Image
        src="/callseal-logo.jpg"
        alt="CallSeal Logo"
        width={sizeConfig.image}
        height={sizeConfig.image}
        className={cn("rounded", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center", sizeConfig.gap, className)}>
      <span
        className={cn(
          "font-display font-semibold text-primary-600 tracking-tight",
          sizeConfig.text
        )}
      >
        CallSeal
      </span>
      {showImage && (
        <Image
          src="/callseal-logo.jpg"
          alt="CallSeal Logo"
          width={sizeConfig.image}
          height={sizeConfig.image}
          className="rounded"
        />
      )}
    </div>
  );
}
