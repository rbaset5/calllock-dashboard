"use client";

import { cn } from "@/lib/utils";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showIcon?: boolean;
  className?: string;
  iconOnly?: boolean;
}

const sizes = {
  sm: { icon: "h-6 w-6", iconText: "text-[16px]", text: "text-lg" },
  md: { icon: "h-8 w-8", iconText: "text-[20px]", text: "text-xl" },
  lg: { icon: "h-10 w-10", iconText: "text-[24px]", text: "text-2xl" },
  xl: { icon: "h-12 w-12", iconText: "text-[28px]", text: "text-3xl" },
};

export function Logo({
  size = "md",
  showIcon = true,
  className,
  iconOnly = false,
}: LogoProps) {
  const sizeConfig = sizes[size];

  if (iconOnly) {
    return (
      <div
        className={cn(
          "bg-primary rounded-lg flex items-center justify-center text-white",
          sizeConfig.icon,
          className
        )}
      >
        <span className={cn("material-symbols-outlined", sizeConfig.iconText)}>
          lock_open
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <div
          className={cn(
            "bg-primary rounded-lg flex items-center justify-center text-white",
            sizeConfig.icon
          )}
        >
          <span className={cn("material-symbols-outlined", sizeConfig.iconText)}>
            lock_open
          </span>
        </div>
      )}
      <h1 className={cn("font-bold tracking-tight text-slate-900", sizeConfig.text)}>
        CallLock
      </h1>
    </div>
  );
}
