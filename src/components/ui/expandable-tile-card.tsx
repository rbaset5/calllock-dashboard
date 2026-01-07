"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useOnClickOutside } from "usehooks-ts"
import { Phone, Calendar, Mail, LucideIcon, MapPin, MoreHorizontal, Sparkles, StickyNote, Archive, Star } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import {
    DropDrawer,
    DropDrawerTrigger,
    DropDrawerContent,
    DropDrawerItem,
} from "@/components/ui/dropdrawer"
import { cn } from "@/lib/utils"


export interface TileCardTag {
    label: string
    color: "blue" | "red" | "amber" | "green" | "gray" | "teal"
}

export interface TileCardNote {
    id: string
    note_text: string
    created_at: string
    created_by?: string | null
}

export interface TileCardData {
    id: string
    leadId?: string
    category: string
    title: string
    preview: string
    author: string
    timestamp: Date
    avatarUrl?: string
    isActive?: boolean
    tags?: TileCardTag[]
    phone?: string
    address?: string
    aiSummary?: string
    keyDetails?: string[]
    notes?: TileCardNote[]
}

export interface ExpandableTileCardsProps {
    cards: TileCardData[]
    className?: string
    sectionId?: string
    starredIds?: Set<string>
    onCardClick?: (card: TileCardData) => void
    onCall?: (card: TileCardData) => void
    onBook?: (card: TileCardData) => void
    onAddNote?: (card: TileCardData) => void
    onArchive?: (card: TileCardData) => void
    onStar?: (card: TileCardData) => void
}

const AVATAR_COLORS = [
    "3b82f6", "8b5cf6", "ec4899", "ef4444", "f97316", "eab308",
    "22c55e", "14b8a6", "06b6d4", "6366f1", "a855f7", "d946ef",
]

const getColorIndex = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % AVATAR_COLORS.length
}

const getDiceBearAvatarUrl = (name?: string): string => {
    const baseUrl = "https://api.dicebear.com/7.x"
    if (name && name.trim()) {
        const seed = encodeURIComponent(name.trim())
        const bgColor = AVATAR_COLORS[getColorIndex(name.trim())]
        return `${baseUrl}/initials/svg?seed=${seed}&backgroundColor=${bgColor}&textColor=ffffff&fontSize=40&fontWeight=600`
    }
    return `${baseUrl}/thumbs/svg?seed=anonymous&backgroundColor=e5e7eb&shapeColor=9ca3af`
}

const CategoryIcon = ({
    icon: Icon,
    color = "grey",
    size = 14,
    variant = "naked"
}: {
    icon: LucideIcon
    color?: "blue" | "grey" | "black" | "red" | "teal" | "amber"
    size?: number
    variant?: "circular" | "naked"
}) => {
    const iconColor =
        color === "blue" ? "text-blue-500" :
            color === "red" ? "text-red-500" :
                color === "teal" ? "text-teal-500" :
                    color === "amber" ? "text-amber-500" :
                        color === "black" ? "text-black" :
                            "text-gray-500"

    if (variant === "circular") {
        return (
            <div className={`bg-white ${iconColor} w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 shadow-sm border border-black/5`}>
                <Icon size={size} strokeWidth={3.5} />
            </div>
        )
    }

    return (
        <div className={`${iconColor} flex items-center justify-center shrink-0`}>
            <Icon size={size} strokeWidth={3} />
        </div>
    )
}

const formatCardTime = (date: Date) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMins = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMins / 60)
    const diffInDaysTotal = differenceInDays(now, date)

    if (diffInDaysTotal < 1) {
        if (diffInMins < 60) return `${diffInMins}m ago`
        return `${diffInHours}h ago`
    } else if (diffInDaysTotal < 14) {
        return format(date, "MMM d")
    }
    return format(date, "MMM d")
}

const getCategoryIcon = (category: string) => {
    if (category.toLowerCase().includes("call")) return Phone
    if (category.toLowerCase().includes("appointment") || category.toLowerCase().includes("booked") || category.toLowerCase().includes("scheduled")) return Calendar
    return Mail
}

const getTagColorClasses = (color: TileCardTag["color"]) => {
    switch (color) {
        case "blue": return "bg-blue-100 text-blue-700"
        case "red": return "bg-red-100 text-red-700"
        case "amber": return "bg-amber-100 text-amber-700"
        case "green": return "bg-green-100 text-green-700"
        case "teal": return "bg-teal-100 text-teal-700"
        default: return "bg-gray-100 text-gray-600"
    }
}

const isAppointmentCard = (category: string) => {
    const lower = category.toLowerCase()
    return lower.includes("appointment") || lower.includes("booked") || lower.includes("scheduled") || lower.includes("ai booked")
}

export default function ExpandableTileCards({
    cards,
    className,
    sectionId = 'default',
    starredIds = new Set(),
    onCardClick,
    onCall,
    onBook,
    onAddNote,
    onArchive,
    onStar,
}: ExpandableTileCardsProps) {
    const [activeCard, setActiveCard] = useState<TileCardData | null>(null)
    const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>
    useOnClickOutside(ref, () => setActiveCard(null))

    // Create unique layoutId prefix to avoid conflicts when same cards appear in multiple sections
    const layoutPrefix = `${sectionId}-card`

    useEffect(() => {
        function onKeyDown(event: { key: string }) {
            if (event.key === "Escape") {
                setActiveCard(null)
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    return (
        <>
            <AnimatePresence>
                {activeCard && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeCard && (
                    <div className="fixed inset-0 z-[110] grid place-items-center p-4">
                        <motion.div
                            ref={ref}
                            layoutId={`${layoutPrefix}-${activeCard.id}`}
                            className={cn(
                                "bg-white w-full max-w-[340px] cursor-pointer flex flex-col gap-4 p-5 transition-all border border-black/5 shadow-2xl",
                                activeCard.isActive && "ring-4 ring-black/5"
                            )}
                            style={{ borderRadius: 28 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <motion.div layoutId={`${layoutPrefix}-icon-${activeCard.id}`}>
                                        <CategoryIcon
                                            icon={getCategoryIcon(activeCard.category)}
                                            color={activeCard.isActive ? "blue" : "grey"}
                                            size={12}
                                            variant={activeCard.isActive ? "circular" : "naked"}
                                        />
                                    </motion.div>
                                    <motion.span
                                        layoutId={`${layoutPrefix}-category-${activeCard.id}`}
                                        className="text-[14px] font-bold text-gray-900 tracking-tight"
                                    >
                                        {activeCard.category}
                                    </motion.span>
                                </div>
                                <motion.span
                                    layoutId={`${layoutPrefix}-time-${activeCard.id}`}
                                    className="text-[11px] font-medium text-gray-400"
                                >
                                    {formatCardTime(activeCard.timestamp)}
                                </motion.span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <motion.h3
                                    layoutId={`${layoutPrefix}-title-${activeCard.id}`}
                                    className="text-[18px] font-bold text-gray-900 leading-tight"
                                >
                                    {activeCard.title}
                                </motion.h3>
                                <motion.p
                                    layoutId={`${layoutPrefix}-preview-${activeCard.id}`}
                                    className="text-[14px] text-gray-600 leading-relaxed"
                                >
                                    {activeCard.preview}
                                </motion.p>
                            </div>

                            {activeCard.tags && activeCard.tags.length > 0 && (
                                <motion.div
                                    layoutId={`${layoutPrefix}-tags-${activeCard.id}`}
                                    className="flex flex-wrap gap-1.5"
                                >
                                    {activeCard.tags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className={`px-2.5 py-1 text-[12px] font-medium rounded-full ${getTagColorClasses(tag.color)}`}
                                        >
                                            {tag.label}
                                        </span>
                                    ))}
                                </motion.div>
                            )}

                            {activeCard.aiSummary && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.05 }}
                                    className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={14} className="text-blue-500" />
                                        <span className="text-[12px] font-semibold text-blue-600 uppercase tracking-wide">AI Summary</span>
                                    </div>
                                    <p className="text-[13px] text-gray-700 leading-relaxed">
                                        {activeCard.aiSummary}
                                    </p>
                                    {activeCard.keyDetails && activeCard.keyDetails.length > 0 && (
                                        <ul className="mt-3 space-y-1">
                                            {activeCard.keyDetails.map((detail, i) => (
                                                <li key={i} className="text-[12px] text-gray-600 flex items-start gap-2">
                                                    <span className="text-blue-400 mt-0.5">•</span>
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </motion.div>
                            )}

                            {activeCard.notes && activeCard.notes.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.08 }}
                                    className="bg-amber-50 rounded-xl p-4 border border-amber-200"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <StickyNote size={14} className="text-amber-600" />
                                        <span className="text-[12px] font-semibold text-amber-700 uppercase tracking-wide">
                                            Notes ({activeCard.notes.length})
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {activeCard.notes.map((note) => (
                                            <div key={note.id} className="text-[13px]">
                                                <p className="text-gray-700 leading-relaxed">{note.note_text}</p>
                                                <span className="text-[11px] text-amber-600/70">
                                                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                                                    {note.created_by && ` · ${note.created_by}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            <motion.div
                                layoutId={`${layoutPrefix}-author-${activeCard.id}`}
                                className="flex items-center gap-3 pt-2 border-t border-gray-100"
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                                    <img
                                        src={getDiceBearAvatarUrl(activeCard.author)}
                                        alt={activeCard.author || "Anonymous"}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[14px] font-bold text-gray-900 leading-none truncate">
                                        {activeCard.author || "Anonymous"}
                                    </span>
                                    <span className="text-[12px] text-gray-500 mt-0.5">Customer</span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.05 }}
                                className="flex flex-col gap-3 py-3 border-t border-gray-100"
                            >
                                <div className="flex items-center">
                                    <div className="flex items-center gap-2.5 w-[100px]">
                                        <Calendar size={16} className="text-gray-400 shrink-0" />
                                        <span className="text-[13px] text-gray-500">Date</span>
                                    </div>
                                    <span className="text-[13px] text-gray-800 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        {format(activeCard.timestamp, "MMM d, yyyy")}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className="flex items-center gap-2.5 w-[100px]">
                                        <Phone size={16} className="text-gray-400 shrink-0" />
                                        <span className="text-[13px] text-gray-500">Phone</span>
                                    </div>
                                    <span className="text-[13px] text-gray-800 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        {activeCard.phone || "(555) 123-4567"}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className="flex items-center gap-2.5 w-[100px]">
                                        <MapPin size={16} className="text-gray-400 shrink-0" />
                                        <span className="text-[13px] text-gray-500">Address</span>
                                    </div>
                                    <span className="text-[13px] text-gray-800 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        {activeCard.address || "123 Main St"}
                                    </span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center gap-2"
                            >
                                <button className="flex-1 bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-blue-600 transition-colors text-sm">
                                    Call Now
                                </button>
                                <button className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm">
                                    Schedule
                                </button>
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <>
                {cards.map((card) => (
                    <motion.div
                        key={card.id}
                        layoutId={`${layoutPrefix}-${card.id}`}
                        onClick={() => {
                            setActiveCard(card)
                            if (onCardClick) onCardClick(card)
                        }}
                        className={cn(
                            "min-w-[260px] max-w-[260px] bg-white p-5 flex flex-col gap-5 h-full cursor-pointer transition-all border border-black/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:-translate-y-1",
                            card.isActive && "border-blue-500/30"
                        )}
                        style={{ borderRadius: 28 }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <motion.div layoutId={`${layoutPrefix}-icon-${card.id}`}>
                                    <CategoryIcon
                                        icon={getCategoryIcon(card.category)}
                                        color={card.isActive ? "blue" : "grey"}
                                        size={12}
                                        variant={card.isActive ? "circular" : "naked"}
                                    />
                                </motion.div>
                                <motion.span
                                    layoutId={`${layoutPrefix}-category-${card.id}`}
                                    className="text-[14px] font-bold text-gray-900 tracking-tight"
                                >
                                    {card.category}
                                </motion.span>
                            </div>

                            <motion.span
                                layoutId={`${layoutPrefix}-time-${card.id}`}
                                className="text-[11px] font-medium text-gray-400"
                            >
                                {formatCardTime(card.timestamp)}
                            </motion.span>
                        </div>

                        <div className="flex flex-col gap-1.5 pr-1">
                            <motion.h3
                                layoutId={`${layoutPrefix}-title-${card.id}`}
                                className="text-[16px] font-bold text-gray-900 leading-[1.2] tracking-normal"
                            >
                                {card.title}
                            </motion.h3>
                            <motion.p
                                layoutId={`${layoutPrefix}-preview-${card.id}`}
                                className="text-[13px] text-gray-500 line-clamp-3 leading-snug"
                            >
                                {card.preview}
                            </motion.p>
                            {card.tags && card.tags.length > 0 && (
                                <motion.div
                                    layoutId={`${layoutPrefix}-tags-${card.id}`}
                                    className="flex flex-wrap gap-1.5 mt-2"
                                >
                                    {card.tags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getTagColorClasses(tag.color)}`}
                                        >
                                            {tag.label}
                                        </span>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {!isAppointmentCard(card.category) && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onCall?.(card)
                                    }}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[12px] font-semibold rounded-lg transition-all whitespace-nowrap shadow-sm"
                                >
                                    <Phone size={13} strokeWidth={2.5} />
                                    Call
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onBook?.(card)
                                    }}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-[12px] font-semibold rounded-lg border border-gray-200 transition-all whitespace-nowrap shadow-sm"
                                >
                                    <Calendar size={13} strokeWidth={2.5} />
                                    Book
                                </button>
                            </div>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-1">
                            <motion.div
                                layoutId={`${layoutPrefix}-author-${card.id}`}
                                className="flex items-center gap-2"
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                                    <img
                                        src={getDiceBearAvatarUrl(card.author)}
                                        alt={card.author || "Anonymous"}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-bold text-gray-900 leading-none truncate">
                                        {card.author || "Anonymous"}
                                    </span>
                                </div>
                            </motion.div>
                            {!isAppointmentCard(card.category) && (
                                <DropDrawer>
                                    <DropDrawerTrigger asChild>
                                        <button
                                            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </DropDrawerTrigger>
                                    <DropDrawerContent align="end" title="Actions">
                                        <DropDrawerItem onClick={() => onStar?.(card)}>
                                            <Star size={16} className={`mr-2 ${starredIds.has(card.id) ? "fill-amber-400 text-amber-400" : ""}`} />
                                            {starredIds.has(card.id) ? "Unstar" : "Star"}
                                        </DropDrawerItem>
                                        <DropDrawerItem onClick={() => onCall?.(card)}>
                                            <Phone size={16} className="mr-2" />
                                            Call Customer
                                        </DropDrawerItem>
                                        <DropDrawerItem onClick={() => onBook?.(card)}>
                                            <Calendar size={16} className="mr-2" />
                                            Book Appointment
                                        </DropDrawerItem>
                                        <DropDrawerItem onClick={() => onAddNote?.(card)}>
                                            <StickyNote size={16} className="mr-2" />
                                            Add Note
                                        </DropDrawerItem>
                                        <DropDrawerItem onClick={() => onArchive?.(card)}>
                                            <Archive size={16} className="mr-2" />
                                            Archive
                                        </DropDrawerItem>
                                    </DropDrawerContent>
                                </DropDrawer>
                            )}
                        </div>
                    </motion.div>
                ))}
            </>
        </>
    )
}
