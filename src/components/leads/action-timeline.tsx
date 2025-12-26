"use client";

import * as React from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Lead, PriorityColor } from "@/types/database";
import { LeadWithNotes } from "@/app/api/action/route";
import { LeadCardV4 } from "./lead-card-v4";

interface ActionTimelineProps {
    leads: LeadWithNotes[];
    onCall?: (lead: Lead) => void;
    onBook?: (lead: Lead) => void;
    onArchive?: (lead: Lead) => void;
    onAddNote?: (lead: Lead) => void;
    onMarkSpam?: (lead: Lead) => void;
    hidePriorityBadge?: boolean;
    hideFirstDateHeader?: boolean;
}

/** Group leads by date */
interface DateGroup {
    date: Date;
    leads: LeadWithNotes[];
}

const groupLeadsByDate = (leads: LeadWithNotes[]): DateGroup[] => {
    const groups: Map<string, DateGroup> = new Map();

    leads.forEach((lead) => {
        const createdDate = parseISO(lead.created_at);
        const dateKey = format(createdDate, "yyyy-MM-dd");

        if (groups.has(dateKey)) {
            groups.get(dateKey)!.leads.push(lead);
        } else {
            groups.set(dateKey, {
                date: createdDate,
                leads: [lead],
            });
        }
    });

    // Sort groups by date (most recent first)
    const sortedGroups = Array.from(groups.values()).sort(
        (a, b) => b.date.getTime() - a.date.getTime()
    );

    // Sort leads within each group by created_at descending (most recent first)
    sortedGroups.forEach(group => {
        group.leads.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    });

    return sortedGroups;
};

export const ActionTimeline: React.FC<ActionTimelineProps> = ({
    leads,
    onCall,
    onBook,
    onArchive,
    onAddNote,
    onMarkSpam,
    hidePriorityBadge = false,
    hideFirstDateHeader = false,
}) => {
    // Group leads by their created_at date (must be called before any returns per Rules of Hooks)
    const dateGroups = React.useMemo(() => groupLeadsByDate(leads), [leads]);

    if (leads.length === 0) {
        return null;
    }

    return (
        <div className="space-y-10">
            {dateGroups.map((group, index) => (
                <div key={format(group.date, "yyyy-MM-dd")} className="space-y-6">
                    {/* Date header */}
                    {!(hideFirstDateHeader && index === 0) && (
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider max-w-lg mx-auto px-1">
                            {format(group.date, "EEEE, MMMM d").toUpperCase()}
                        </h3>
                    )}

                    {/* Lead cards for this date */}
                    <div className="space-y-6">
                        {group.leads.map((lead) => (
                            <LeadCardV4
                                key={lead.id}
                                lead={lead}
                                onCall={onCall}
                                onBook={onBook}
                                onArchive={onArchive}
                                onAddNote={onAddNote}
                                onMarkSpam={onMarkSpam}
                                hidePriorityBadge={hidePriorityBadge}
                                className="max-w-lg mx-auto"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActionTimeline;
