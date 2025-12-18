import { cn } from "@/lib/utils";
import { useState } from "react";

export const Component = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full relative bg-[#E3C9A3]">
      {/* Corkboard Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1596230425515-3738914b5fb6?q=80&w=2670&auto=format&fit=crop"
          alt="Corkboard texture"
          className="h-full w-full object-cover opacity-90"
        />
        {/* Optional overlay to ensure text contrast if needed, or just let the cork show */}
        <div className="absolute inset-0 bg-black/5" />
      </div>
      <div className="relative z-10 text-slate-900">
        {children}
      </div>
    </div>
  );
};
