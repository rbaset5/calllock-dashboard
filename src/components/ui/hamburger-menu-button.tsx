"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

interface HamburgerMenuButtonProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  iconColor?: string
}

function HamburgerMenuButton({ 
  open: controlledOpen, 
  onOpenChange, 
  className,
  iconColor = "currentColor"
}: HamburgerMenuButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  
  const handleClick = () => {
    const newState = !open
    if (!isControlled) {
      setInternalOpen(newState)
    }
    onOpenChange?.(newState)
  }

  return (
    <Button
      className={`group ${className}`}
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
    >
      <svg
        className="pointer-events-none"
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 12L20 12"
          className="origin-center -translate-y-[7px] transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
        />
        <path
          d="M4 12H20"
          className="origin-center transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
        />
        <path
          d="M4 12H20"
          className="origin-center translate-y-[7px] transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
        />
      </svg>
    </Button>
  )
}

export { HamburgerMenuButton }
