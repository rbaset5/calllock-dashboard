"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface DropDrawerContextValue {
  isMobile: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

const DropDrawerContext = React.createContext<DropDrawerContextValue | null>(null)

function useDropDrawer() {
  const context = React.useContext(DropDrawerContext)
  if (!context) {
    throw new Error("useDropDrawer must be used within a DropDrawer")
  }
  return context
}

interface DropDrawerProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function DropDrawer({ children, open: controlledOpen, onOpenChange }: DropDrawerProps) {
  const isMobile = useIsMobile()
  const [internalOpen, setInternalOpen] = React.useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  return (
    <DropDrawerContext.Provider value={{ isMobile, open, setOpen }}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          {children}
        </Drawer>
      ) : (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          {children}
        </DropdownMenu>
      )}
    </DropDrawerContext.Provider>
  )
}

interface DropDrawerTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

function DropDrawerTrigger({ children, asChild, className }: DropDrawerTriggerProps) {
  const { isMobile } = useDropDrawer()

  if (isMobile) {
    return (
      <DrawerTrigger asChild={asChild} className={className}>
        {children}
      </DrawerTrigger>
    )
  }

  return (
    <DropdownMenuTrigger asChild={asChild} className={className}>
      {children}
    </DropdownMenuTrigger>
  )
}

interface DropDrawerContentProps {
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
  title?: string
  description?: string
}

function DropDrawerContent({
  children,
  className,
  align = "end",
  title,
  description
}: DropDrawerContentProps) {
  const { isMobile } = useDropDrawer()

  if (isMobile) {
    return (
      <DrawerContent className={className}>
        {(title || description) && (
          <DrawerHeader className="text-left">
            {title && <DrawerTitle>{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        <div className="px-4 pb-4">
          {children}
        </div>
      </DrawerContent>
    )
  }

  return (
    <DropdownMenuContent align={align} className={cn("w-56", className)}>
      {children}
    </DropdownMenuContent>
  )
}

interface DropDrawerItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
}

function DropDrawerItem({
  children,
  className,
  onClick,
  destructive,
  disabled
}: DropDrawerItemProps) {
  const { isMobile, setOpen } = useDropDrawer()

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    setOpen(false)
  }

  if (isMobile) {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
          "hover:bg-muted focus:bg-muted focus:outline-none",
          destructive && "text-destructive hover:bg-destructive/10",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <DropdownMenuItem
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "cursor-pointer",
        destructive && "text-destructive focus:text-destructive",
        className
      )}
    >
      {children}
    </DropdownMenuItem>
  )
}

interface DropDrawerLabelProps {
  children: React.ReactNode
  className?: string
}

function DropDrawerLabel({ children, className }: DropDrawerLabelProps) {
  const { isMobile } = useDropDrawer()

  if (isMobile) {
    return (
      <div className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}>
        {children}
      </div>
    )
  }

  return (
    <DropdownMenuLabel className={className}>
      {children}
    </DropdownMenuLabel>
  )
}

interface DropDrawerSeparatorProps {
  className?: string
}

function DropDrawerSeparator({ className }: DropDrawerSeparatorProps) {
  const { isMobile } = useDropDrawer()

  if (isMobile) {
    return <div className={cn("my-2 h-px bg-border", className)} />
  }

  return <DropdownMenuSeparator className={className} />
}

interface DropDrawerFooterProps {
  children: React.ReactNode
  className?: string
}

function DropDrawerFooter({ children, className }: DropDrawerFooterProps) {
  const { isMobile } = useDropDrawer()

  if (isMobile) {
    return (
      <DrawerFooter className={className}>
        {children}
      </DrawerFooter>
    )
  }

  // On desktop, footer items are just regular items
  return <>{children}</>
}

function DropDrawerClose({ children }: { children: React.ReactNode }) {
  const { isMobile } = useDropDrawer()

  if (isMobile) {
    return <DrawerClose asChild>{children}</DrawerClose>
  }

  // On desktop, clicking any item closes the menu automatically
  return <>{children}</>
}

export {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerSeparator,
  DropDrawerFooter,
  DropDrawerClose,
  useDropDrawer,
}
