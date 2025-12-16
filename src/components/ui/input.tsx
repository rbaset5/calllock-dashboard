import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - 44px min height for touch
          "flex min-h-[44px] w-full rounded-lg border bg-white px-4 py-3 text-base transition-colors",
          // Border & focus states
          "border-navy-200 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none",
          // Placeholder
          "placeholder:text-navy-300",
          // Disabled state
          "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400",
          // File input styling
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
