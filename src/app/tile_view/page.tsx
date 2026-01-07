"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Map as MapIcon, Calendar, Phone, AlertTriangle, RotateCcw, DollarSign, Truck, LucideIcon, LayoutGrid, List, Star } from "lucide-react";
import { Tabs as ArkTabs } from "@ark-ui/react/tabs";

import ExpandableTileCards, { TileCardData, TileCardTag } from "@/components/ui/expandable-tile-card";
import { MessageListCard, MessageListItem } from "@/components/ui/message-list-card";
import { MapViewModal } from "@/components/ui/map-view-modal";
import { AddNoteModal } from "@/components/leads/add-note-modal";
import { BookingModal } from "@/components/ui/booking-modal";
import { VelocityResponse, VelocityItemWithType } from "@/app/api/velocity/route";
import { BookedResponse } from "@/app/api/booked/route";
import { determineArchetype } from "@/lib/velocity";
import { Lead, Job, OperatorNote } from "@/types/database";
import clsx from "clsx";

type LeadWithNotes = Lead & { notes?: OperatorNote[] };

function jobToTileCard(job: Job): TileCardData {
    const tags: TileCardTag[] = [];

    if (job.service_type) {
        tags.push({ label: job.service_type.toUpperCase(), color: 'blue' });
    }

    if (job.revenue_tier_label) {
        tags.push({ label: job.revenue_tier_label, color: 'amber' });
    }

    if (job.urgency === 'emergency' || job.urgency === 'high') {
        tags.push({ label: 'Urgent', color: 'red' });
    }

    if (job.is_ai_booked) {
        tags.push({ label: 'AI Booked', color: 'green' });
    }

    return {
        id: job.id,
        category: job.is_ai_booked ? "AI Booked" : "Manual Booking",
        title: job.service_type ? `${job.service_type.charAt(0).toUpperCase() + job.service_type.slice(1)} Service` : "Service Appointment",
        preview: job.ai_summary || job.needs_action_note || "Scheduled appointment",
        author: job.customer_name || "Unknown",
        timestamp: job.scheduled_at ? new Date(job.scheduled_at) : new Date(),
        phone: job.customer_phone,
        address: job.customer_address || undefined,
        aiSummary: job.ai_summary || undefined,
        isActive: job.needs_action || false,
        tags,
    };
}

function buildTagsFromItem(item: VelocityItemWithType, archetype: string): TileCardTag[] {
    const tags: TileCardTag[] = [];

    if (item.service_type) {
        tags.push({ label: item.service_type.toUpperCase(), color: 'blue' });
    }

    if (archetype === 'HAZARD') {
        tags.push({ label: 'Urgent', color: 'red' });
    } else if (archetype === 'RECOVERY') {
        tags.push({ label: 'Frustrated', color: 'red' });
    } else if (archetype === 'REVENUE') {
        const lead = item as Lead;
        if (lead.revenue_tier === 'replacement') {
            tags.push({ label: 'Replacement', color: 'green' });
        }
        if (lead.revenue_tier_label) {
            tags.push({ label: lead.revenue_tier_label, color: 'amber' });
        }
    }

    return tags;
}

function getSmartLabel(item: VelocityItemWithType, archetype: string): string {
    if (archetype === 'HAZARD') return 'Urgent Callback';
    if (archetype === 'RECOVERY') return 'Customer Recovery';
    if (archetype === 'REVENUE') {
        return item.priority_color === 'green' ? 'Commercial Lead' : 'High Value Lead';
    }
    return 'Service Request';
}

function velocityItemToTileCard(item: VelocityItemWithType): TileCardData {
    const archetype = determineArchetype(item);
    const archetypeLabels: Record<string, string> = {
        'HAZARD': 'Emergency',
        'RECOVERY': 'Callback Risk',
        'REVENUE': 'Revenue Opportunity',
        'LOGISTICS': 'Follow-up'
    };

    const lead = item as LeadWithNotes;

    return {
        id: item.id,
        leadId: item.itemType === 'lead' ? item.id : undefined,
        category: archetypeLabels[archetype] || 'Call',
        title: getSmartLabel(item, archetype),
        preview: lead.issue_description || 'Service request',
        author: item.customer_name || 'Unknown',
        timestamp: new Date(item.created_at),
        phone: item.customer_phone,
        address: item.customer_address || undefined,
        aiSummary: lead.ai_summary || undefined,
        isActive: archetype === 'HAZARD' || archetype === 'RECOVERY',
        tags: buildTagsFromItem(item, archetype),
        notes: lead.notes?.map(n => ({
            id: n.id,
            note_text: n.note_text,
            created_at: n.created_at,
            created_by: n.created_by
        }))
    };
}

const CategoryIcon = ({
    icon: Icon,
    color = "grey",
    size = 14,
    variant = "naked"
}: {
    icon: LucideIcon;
    color?: "blue" | "grey" | "black" | "red" | "teal" | "amber";
    size?: number;
    variant?: "circular" | "naked";
}) => {
    const iconColor =
        color === "blue" ? "text-blue-500" :
            color === "red" ? "text-red-500" :
                color === "teal" ? "text-teal-500" :
                    color === "amber" ? "text-amber-500" :
                        color === "black" ? "text-black" :
                            "text-gray-500";

    if (variant === "circular") {
        return (
            <div className={`bg-white ${iconColor} w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 shadow-sm border border-black/5`}>
                <Icon size={size} strokeWidth={3.5} />
            </div>
        );
    }

    return (
        <div className={`${iconColor} flex items-center justify-center shrink-0`}>
            <Icon size={size} strokeWidth={3} />
        </div>
    );
};

interface SectionContainerProps {
    icon: LucideIcon;
    title: string;
    color: "blue" | "grey" | "black" | "starred";
    children: React.ReactNode;
    id?: string;
    viewMode?: "tile" | "list";
    onViewModeChange?: (mode: "tile" | "list") => void;
    listContent?: React.ReactNode;
    onMapClick?: () => void;
    count?: number;
}

const SectionContainer = ({
    icon: Icon,
    title,
    color,
    children,
    id,
    viewMode = "tile",
    onViewModeChange,
    listContent,
    onMapClick,
    count
}: SectionContainerProps) => {
    const bgColor = color === "blue" ? "bg-[#1A6FF6]" : color === "starred" ? "bg-[#FF4732]" : color === "black" ? "bg-black" : "bg-[#18102B]";
    const textColor = "text-white";
    const iconColor = "text-white/80";

    const getCategoryColor = (): "blue" | "grey" | "black" | "red" | "teal" | "amber" => {
        const t = title.toLowerCase();
        if (t.includes("hazard")) return "red";
        if (t.includes("recovery")) return "teal";
        if (t.includes("revenue")) return "amber";
        if (t.includes("call")) return "blue";
        if (t.includes("appointment")) return "black";
        if (t.includes("starred")) return "teal";
        return "grey";
    };

    return (
        <section id={id} className={clsx(
            "flex flex-col rounded-[28px] overflow-hidden transition-colors",
            viewMode === "list" ? "bg-white border border-gray-200" : bgColor
        )}>
            <div className={`flex items-center justify-between gap-2.5 px-6 py-5`}>
                <div className="flex items-center gap-2.5">
                    <CategoryIcon
                        icon={Icon}
                        color={getCategoryColor()}
                        size={14}
                        variant={(title === "Appointments" || title === "All Calls") ? "circular" : "naked"}
                    />
                    <div className="flex items-center gap-1.5">
                        <h2 className={clsx(
                            "text-[17px] font-bold",
                            viewMode === "list" ? "text-gray-900" : textColor
                        )}>
                            {title}
                            {count !== undefined && (
                                <span className="ml-1.5 opacity-70">({count})</span>
                            )}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onViewModeChange && (
                        <div className={clsx(
                            "flex items-center rounded-lg p-0.5",
                            viewMode === "list" ? "bg-gray-100" : "bg-black/20"
                        )}>
                            <button
                                onClick={() => onViewModeChange("tile")}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === "tile"
                                        ? "bg-white/20 text-white shadow-sm"
                                        : (viewMode === "list" ? "text-gray-500 hover:text-gray-700" : "text-white/60 hover:text-white")
                                )}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => onViewModeChange("list")}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === "list"
                                        ? "bg-white shadow-sm text-gray-900"
                                        : (color === "blue" || color === "black" ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-gray-700")
                                )}
                            >
                                <List size={16} />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={onMapClick}
                        className={clsx(
                            "p-1.5 rounded-md hover:bg-black/10 transition-colors",
                            viewMode === "list" ? "text-gray-700" : iconColor
                        )}
                    >
                        <MapIcon size={20} />
                    </button>
                </div>
            </div>

            {viewMode === "list" && listContent ? (
                <div className="px-5 pb-6">
                    {listContent}
                </div>
            ) : (
                <div className="px-5 pt-4 pb-8 overflow-hidden">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2">
                        {children}
                        <div className="min-w-[10px]" />
                    </div>
                </div>
            )}
        </section>
    );
};

type ViewMode = "tile" | "list";
type SectionId = "appointments" | "starred" | "all-calls" | "hazard" | "revenue" | "recovery" | "logistics";
type TabValue = "calls" | "appointments";

function convertToListItems(cards: TileCardData[]): MessageListItem[] {
    return cards.map(card => ({
        id: card.id,
        avatar: card.avatarUrl || "",
        name: card.author,
        text: card.preview,
        date: card.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        phone: card.phone,
        address: card.address,
        isFavorite: false,
        isActive: card.isActive,
        tags: card.tags,
    }));
}

export default function TileViewPage() {
    const [greeting, setGreeting] = React.useState("");
    const [now, setNow] = React.useState<Date | null>(null);
    const [activeTab, setActiveTab] = React.useState<TabValue>("calls");
    const [viewModes, setViewModes] = React.useState<Record<SectionId, ViewMode>>({
        "appointments": "tile",
        "starred": "tile",
        "all-calls": "tile",
        "hazard": "tile",
        "revenue": "tile",
        "recovery": "tile",
        "logistics": "tile",
    });
    const [mapModal, setMapModal] = React.useState<{ isOpen: boolean; cards: TileCardData[]; title: string }>({
        isOpen: false,
        cards: [],
        title: ""
    });
    const [loading, setLoading] = useState(true);
    const [velocityData, setVelocityData] = useState<VelocityResponse | null>(null);
    const [appointmentsData, setAppointmentsData] = useState<TileCardData[]>([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(true);
    const [noteModalLead, setNoteModalLead] = useState<Lead | null>(null);
    const [bookingModalCard, setBookingModalCard] = useState<TileCardData | null>(null);
    const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('/api/velocity');
            if (!response.ok) throw new Error('Failed to fetch');
            const data: VelocityResponse = await response.json();
            setVelocityData(data);
        } catch (err) {
            console.error('Error fetching velocity data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAppointments = useCallback(async () => {
        try {
            const response = await fetch('/api/booked?days=14&include_past=true');
            if (!response.ok) throw new Error('Failed to fetch appointments');
            const data: BookedResponse = await response.json();
            const allJobs = data.groups.flatMap(group => group.jobs);
            const cards = allJobs.map(jobToTileCard);
            setAppointmentsData(cards);
        } catch (err) {
            console.error('Error fetching appointments:', err);
        } finally {
            setAppointmentsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchAppointments();
        const interval = setInterval(() => {
            fetchData();
            fetchAppointments();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchData, fetchAppointments]);

    const { hazardData, revenueData, recoveryData, logisticsData, allCallsData } = useMemo(() => {
        if (!velocityData) return { hazardData: [], revenueData: [], recoveryData: [], logisticsData: [], allCallsData: [] };

        const hazard: TileCardData[] = [];
        const revenue: TileCardData[] = [];
        const recovery: TileCardData[] = [];
        const logistics: TileCardData[] = [];
        const allCalls: TileCardData[] = [];

        velocityData.items.forEach(item => {
            const card = velocityItemToTileCard(item);
            const archetype = determineArchetype(item);

            allCalls.push(card);

            switch (archetype) {
                case 'HAZARD': hazard.push(card); break;
                case 'REVENUE': revenue.push(card); break;
                case 'RECOVERY': recovery.push(card); break;
                default: logistics.push(card);
            }
        });

        return { hazardData: hazard, revenueData: revenue, recoveryData: recovery, logisticsData: logistics, allCallsData: allCalls };
    }, [velocityData]);

    const handleCall = (card: TileCardData) => {
        if (card.phone) {
            window.location.href = `tel:${card.phone}`;
        }
    };

    const handleBook = (card: TileCardData) => {
        setBookingModalCard(card);
    };

    const handleBookingSuccess = () => {
        setBookingModalCard(null);
        fetchData();
    };

    const handleAddNote = (card: TileCardData) => {
        if (card.leadId && velocityData) {
            const lead = velocityData.items.find(
                item => item.itemType === 'lead' && item.id === card.leadId
            ) as Lead | undefined;

            if (lead) {
                setNoteModalLead(lead);
            }
        }
    };

    const handleArchive = async (card: TileCardData) => {
        if (!card.leadId) return;

        try {
            const response = await fetch(`/api/leads/${card.leadId}/archive`, {
                method: 'POST'
            });
            if (response.ok) {
                fetchData();
            }
        } catch (err) {
            console.error('Error archiving:', err);
        }
    };

    const handleStar = (card: TileCardData) => {
        setStarredIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(card.id)) {
                newSet.delete(card.id);
            } else {
                newSet.add(card.id);
            }
            return newSet;
        });
    };

    const starredData = useMemo(() => {
        return allCallsData.filter(card => starredIds.has(card.id));
    }, [allCallsData, starredIds]);

    const handleNoteSuccess = () => {
        setNoteModalLead(null);
        fetchData();
    };

    const handleViewModeChange = (sectionId: SectionId, mode: ViewMode) => {
        setViewModes(prev => ({ ...prev, [sectionId]: mode }));
    };

    const openMapModal = (cards: TileCardData[], title: string) => {
        setMapModal({ isOpen: true, cards, title });
    };

    const closeMapModal = () => {
        setMapModal(prev => ({ ...prev, isOpen: false }));
    };

    const navItems = [
        { id: 'calls', icon: <Phone />, label: 'Calls' },
        { id: 'appointments', icon: <Calendar />, label: 'Appointments' },
    ];



    React.useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting("Good Morning");
        else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
        setNow(new Date());
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32 relative bg-white">
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            <div className="max-w-[400px] mx-auto px-6 pt-16 flex flex-col gap-6">



                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex flex-col gap-6 -mt-1"
                    >
                        {activeTab === "appointments" && (
                            <div className="flex flex-col gap-4">
                                {appointmentsLoading ? (
                                    <div className="bg-white/5 rounded-[28px] border border-white/10 p-8 shadow-sm flex items-center justify-center">
                                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                                    </div>
                                ) : appointmentsData.length === 0 ? (
                                    <div className="bg-white/5 rounded-[28px] border border-white/10 p-8 shadow-sm text-center">
                                        <Calendar className="w-12 h-12 mx-auto text-white/20 mb-3" />
                                        <p className="text-white/60 font-medium">No upcoming appointments</p>
                                        <p className="text-white/40 text-sm mt-1">AI-booked appointments will appear here</p>
                                    </div>
                                ) : (
                                    <SectionContainer
                                        id="appointments"
                                        icon={Calendar}
                                        title="Upcoming Appointments"
                                        color="black"
                                        viewMode={viewModes["appointments"]}
                                        onViewModeChange={(mode) => handleViewModeChange("appointments", mode)}
                                        onMapClick={() => openMapModal(appointmentsData, "Appointments")}
                                        count={appointmentsData.length}
                                        listContent={
                                            <MessageListCard
                                                title=""
                                                messages={convertToListItems(appointmentsData)}
                                                cards={appointmentsData}
                                                showSearch={false}
                                                onCallClick={(phone) => window.open(`tel:${phone}`)}
                                            />
                                        }
                                    >
                                        <ExpandableTileCards
                                            cards={appointmentsData}
                                            sectionId="appointments"
                                            starredIds={starredIds}
                                            onCall={handleCall}
                                            onBook={handleBook}
                                            onAddNote={handleAddNote}
                                            onArchive={handleArchive}
                                            onStar={handleStar}
                                        />
                                    </SectionContainer>
                                )}
                            </div>
                        )}

                        {activeTab === "calls" && (
                            <>
                                {starredData.length > 0 && (
                                    <SectionContainer
                                        id="starred"
                                        icon={Star}
                                        title="Starred"
                                        color="starred"
                                        viewMode={viewModes["starred"]}
                                        onViewModeChange={(mode) => handleViewModeChange("starred", mode)}
                                        onMapClick={() => openMapModal(starredData, "Starred")}
                                        count={starredData.length}
                                        listContent={
                                            <MessageListCard
                                                title=""
                                                messages={convertToListItems(starredData)}
                                                cards={starredData}
                                                showSearch={false}
                                                onCallClick={(phone) => window.open(`tel:${phone}`)}
                                            />
                                        }
                                    >
                                        <ExpandableTileCards
                                            cards={starredData}
                                            sectionId="starred"
                                            starredIds={starredIds}
                                            onCall={handleCall}
                                            onBook={handleBook}
                                            onAddNote={handleAddNote}
                                            onArchive={handleArchive}
                                            onStar={handleStar}
                                        />
                                    </SectionContainer>
                                )}

                                <SectionContainer
                                    id="all-calls"
                                    icon={Phone}
                                    title="All Calls"
                                    color="blue"
                                    viewMode={viewModes["all-calls"]}
                                    onViewModeChange={(mode) => handleViewModeChange("all-calls", mode)}
                                    onMapClick={() => openMapModal(allCallsData, "All Calls")}
                                    count={allCallsData.length}
                                    listContent={
                                        <MessageListCard
                                            title=""
                                            messages={convertToListItems(allCallsData)}
                                            cards={allCallsData}
                                            showSearch={false}
                                            onCallClick={(phone) => window.open(`tel:${phone}`)}
                                        />
                                    }
                                >
                                    <ExpandableTileCards
                                        cards={allCallsData}
                                        sectionId="all-calls"
                                        starredIds={starredIds}
                                        onCall={handleCall}
                                        onBook={handleBook}
                                        onAddNote={handleAddNote}
                                        onArchive={handleArchive}
                                        onStar={handleStar}
                                    />
                                </SectionContainer>

                                <SectionContainer
                                    id="hazard"
                                    icon={AlertTriangle}
                                    title="Hazard"
                                    color="grey"
                                    viewMode={viewModes["hazard"]}
                                    onViewModeChange={(mode) => handleViewModeChange("hazard", mode)}
                                    onMapClick={() => openMapModal(hazardData, "Hazard")}
                                    count={hazardData.length}
                                    listContent={
                                        <MessageListCard
                                            title=""
                                            messages={convertToListItems(hazardData)}
                                            cards={hazardData}
                                            showSearch={false}
                                            onCallClick={(phone) => window.open(`tel:${phone}`)}
                                        />
                                    }
                                >
                                    <ExpandableTileCards
                                        cards={hazardData}
                                        sectionId="hazard"
                                        starredIds={starredIds}
                                        onCall={handleCall}
                                        onBook={handleBook}
                                        onAddNote={handleAddNote}
                                        onArchive={handleArchive}
                                        onStar={handleStar}
                                    />
                                </SectionContainer>

                                <SectionContainer
                                    id="revenue"
                                    icon={DollarSign}
                                    title="Revenue"
                                    color="grey"
                                    viewMode={viewModes["revenue"]}
                                    onViewModeChange={(mode) => handleViewModeChange("revenue", mode)}
                                    onMapClick={() => openMapModal(revenueData, "Revenue")}
                                    count={revenueData.length}
                                    listContent={
                                        <MessageListCard
                                            title=""
                                            messages={convertToListItems(revenueData)}
                                            cards={revenueData}
                                            showSearch={false}
                                            onCallClick={(phone) => window.open(`tel:${phone}`)}
                                        />
                                    }
                                >
                                    <ExpandableTileCards
                                        cards={revenueData}
                                        sectionId="revenue"
                                        starredIds={starredIds}
                                        onCall={handleCall}
                                        onBook={handleBook}
                                        onAddNote={handleAddNote}
                                        onArchive={handleArchive}
                                        onStar={handleStar}
                                    />
                                </SectionContainer>

                                <SectionContainer
                                    id="recovery"
                                    icon={RotateCcw}
                                    title="Recovery"
                                    color="grey"
                                    viewMode={viewModes["recovery"]}
                                    onViewModeChange={(mode) => handleViewModeChange("recovery", mode)}
                                    onMapClick={() => openMapModal(recoveryData, "Recovery")}
                                    count={recoveryData.length}
                                    listContent={
                                        <MessageListCard
                                            title=""
                                            messages={convertToListItems(recoveryData)}
                                            cards={recoveryData}
                                            showSearch={false}
                                            onCallClick={(phone) => window.open(`tel:${phone}`)}
                                        />
                                    }
                                >
                                    <ExpandableTileCards
                                        cards={recoveryData}
                                        sectionId="recovery"
                                        starredIds={starredIds}
                                        onCall={handleCall}
                                        onBook={handleBook}
                                        onAddNote={handleAddNote}
                                        onArchive={handleArchive}
                                        onStar={handleStar}
                                    />
                                </SectionContainer>

                                <SectionContainer
                                    id="logistics"
                                    icon={Truck}
                                    title="Logistics"
                                    color="grey"
                                    viewMode={viewModes["logistics"]}
                                    onViewModeChange={(mode) => handleViewModeChange("logistics", mode)}
                                    onMapClick={() => openMapModal(logisticsData, "Logistics")}
                                    count={logisticsData.length}
                                    listContent={
                                        <MessageListCard
                                            title=""
                                            messages={convertToListItems(logisticsData)}
                                            cards={logisticsData}
                                            showSearch={false}
                                        />
                                    }
                                >
                                    <ExpandableTileCards
                                        cards={logisticsData}
                                        sectionId="logistics"
                                        starredIds={starredIds}
                                        onCall={handleCall}
                                        onBook={handleBook}
                                        onAddNote={handleAddNote}
                                        onArchive={handleArchive}
                                        onStar={handleStar}
                                    />
                                </SectionContainer>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] z-[100] pb-6 px-4">
                <ArkTabs.Root
                    value={activeTab}
                    onValueChange={(e) => setActiveTab(e.value as "calls" | "appointments")}
                    className="w-full flex justify-center"
                >
                    <ArkTabs.List className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-xl overflow-hidden">
                        {[
                            { value: "calls", label: "Calls", icon: Phone },
                            { value: "appointments", label: "Appointments", icon: Calendar },
                        ].map((tab, index, array) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.value;

                            return (
                                <ArkTabs.Trigger
                                    key={tab.value}
                                    value={tab.value}
                                    className={clsx(
                                        "flex flex-col items-center gap-1 w-32 py-3 text-sm font-medium transition-all relative border-b-2",
                                        isActive
                                            ? "text-gray-900 border-b-gray-900 dark:text-gray-100 dark:border-b-gray-100 bg-gray-50/50 dark:bg-gray-700/50"
                                            : "text-gray-500 hover:text-gray-700 border-b-transparent dark:text-gray-400 dark:hover:text-gray-200",
                                        index !== array.length - 1 && "border-r border-gray-300 dark:border-gray-600"
                                    )}
                                >
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[11px] font-bold tracking-tight uppercase">
                                        {tab.label}
                                    </span>
                                </ArkTabs.Trigger>
                            );
                        })}
                    </ArkTabs.List>
                </ArkTabs.Root>
            </div>

            <MapViewModal
                isOpen={mapModal.isOpen}
                onClose={closeMapModal}
                cards={mapModal.cards}
                title={mapModal.title}
            />

            {noteModalLead && (
                <AddNoteModal
                    lead={noteModalLead}
                    onClose={() => setNoteModalLead(null)}
                    onSuccess={handleNoteSuccess}
                />
            )}

            <BookingModal
                isOpen={!!bookingModalCard}
                onClose={() => setBookingModalCard(null)}
                card={bookingModalCard}
                onSuccess={handleBookingSuccess}
            />
        </div>
    );
}
