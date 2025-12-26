'use client';

/**
 * HazardCard Component
 * 
 * For HAZARD archetype (safety emergencies)
 * Implements the premium design provided by the user with 1:1 parity.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { buildInlineNarrative } from '@/lib/narrative-engine';
import { buildSmartTags } from '@/lib/smart-tags';
import { formatDollarEstimate } from '@/lib/velocity';
import type { VelocityCardProps } from './types';

import { Mail, Phone } from 'lucide-react';
import { ProfileAvatar } from '@/components/ui/profile-avatar';

// Helper to format relative time since call
function formatTimeSinceCall(createdAt: string): { text: string; urgencyLevel: 'low' | 'medium' | 'high' } {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) {
        return {
            text: `${diffMins} min ago`,
            urgencyLevel: diffMins < 15 ? 'high' : diffMins < 30 ? 'medium' : 'low'
        };
    } else if (diffHours < 24) {
        return {
            text: `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`,
            urgencyLevel: diffHours < 2 ? 'medium' : 'low'
        };
    } else {
        const diffDays = Math.floor(diffHours / 24);
        return {
            text: `${diffDays} day${diffDays > 1 ? 's' : ''} ago`,
            urgencyLevel: 'low'
        };
    }
}

// Helper to extract neighborhood from address
function extractNeighborhood(address: string | null): string {
    if (!address) return 'Unknown Location';
    // Try to extract city/neighborhood - typically after first comma
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
        return parts[1]; // City/neighborhood typically second part
    }
    return address;
}

// Build category breadcrumbs from urgency and service type
function buildCategoryBreadcrumbs(urgency: string, serviceType: string, issueDescription: string | null): string[] {
    const categories: string[] = ['Hazard'];

    // Determine emergency type based on urgency
    if (urgency === 'emergency') {
        categories.push('Emergency');
    } else if (urgency === 'high') {
        categories.push('Urgent');
    } else {
        categories.push('Alert');
    }

    // Determine specific hazard type from issue description or service type
    const desc = (issueDescription || '').toLowerCase();
    if (desc.includes('gas') || desc.includes('rotten egg')) {
        categories.push('Gas Leak');
    } else if (desc.includes('co') || desc.includes('carbon monoxide') || desc.includes('detector')) {
        categories.push('CO Alarm');
    } else if (desc.includes('smoke') || desc.includes('fire')) {
        categories.push('Fire/Smoke');
    } else if (desc.includes('no heat') && urgency === 'emergency') {
        categories.push('No Heat');
    } else if (desc.includes('no cool') || desc.includes('no ac')) {
        categories.push('No Cooling');
    } else if (serviceType === 'hvac') {
        categories.push('HVAC');
    } else if (serviceType === 'plumbing') {
        categories.push('Plumbing');
    } else if (serviceType === 'electrical') {
        categories.push('Electrical');
    } else {
        categories.push('Service');
    }

    return categories;
}

export function HazardCard({
    data,
    onCall,
    onAddNote,
    className,
}: VelocityCardProps) {
    const [expanded, setExpanded] = useState(false);

    const customerName = data.customer_name || 'Unknown Customer';
    const customerPhone = data.customer_phone || '';
    const address = data.customer_address || '';
    const neighborhood = extractNeighborhood(address);
    const firstLetter = customerName.charAt(0).toUpperCase();

    // Get issue description
    const issueDescription = (data as any).issue_description || (data as any).ai_summary || 'No description available';

    // Get time since call
    const timeSinceCall = useMemo(() =>
        formatTimeSinceCall(data.created_at),
        [data.created_at]
    );

    // Build category breadcrumbs
    const categoryBreadcrumbs = useMemo(() =>
        buildCategoryBreadcrumbs(
            (data as any).urgency || 'medium',
            (data as any).service_type || 'general',
            issueDescription
        ),
        [(data as any).urgency, (data as any).service_type, issueDescription]
    );

    // Get dollar estimate
    const estimate = formatDollarEstimate(
        (data as any).estimated_value,
        (data as any).revenue_tier,
        (data as any).estimated_value_low,
        (data as any).estimated_value_high
    );

    // Service history hint - build from available data
    const serviceHistoryHint = useMemo(() => {
        const equipmentAge = (data as any).equipment_age;
        const equipmentType = (data as any).equipment_type;
        const problemPattern = (data as any).problem_pattern;

        if (problemPattern) {
            return problemPattern;
        }
        if (equipmentType && equipmentAge) {
            return `${equipmentType} – ${equipmentAge}`;
        }
        if (equipmentType) {
            return `Has ${equipmentType} on file`;
        }
        return 'New customer';
    }, [(data as any).equipment_age, (data as any).equipment_type, (data as any).problem_pattern]);

    // Build inline narrative (kept for expanded section)
    const narrative = buildInlineNarrative(data, 'HAZARD');

    const handleCall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onCall) {
            onCall(customerPhone);
        } else {
            window.location.href = `tel:${customerPhone}`;
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddNote) {
            onAddNote(data);
        }
    };

    return (
        <div
            className={cn(
                "w-full max-w-[480px] mx-auto bg-white dark:bg-[#1F2937] rounded-[2.5rem] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border border-white dark:border-gray-700 transition-all duration-300 relative cursor-pointer overflow-hidden flex flex-col",
                className
            )}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="p-6 pb-2">
                {/* Top Section: Category Breadcrumbs and Time Since Call */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-1.5 flex-wrap">
                        {categoryBreadcrumbs.map((cat, idx) => (
                            <span key={idx} className="flex items-center">
                                <span className="px-2.5 py-1 bg-[#F3F4F6] dark:bg-[#374151] rounded-full text-[11px] font-semibold text-gray-700 dark:text-gray-200 transition-colors">
                                    {cat}
                                </span>
                                {idx < categoryBreadcrumbs.length - 1 && (
                                    <span className="text-gray-400 dark:text-gray-500 text-xs mx-0.5">›</span>
                                )}
                            </span>
                        ))}
                    </div>
                    <div className={cn(
                        "flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full border shadow-sm",
                        timeSinceCall.urgencyLevel === 'high'
                            ? "border-red-500/30 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                            : timeSinceCall.urgencyLevel === 'medium'
                                ? "border-orange-500/30 text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400"
                                : "border-gray-300/50 text-gray-600 bg-white dark:bg-gray-800 dark:text-gray-400"
                    )}>
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            schedule
                        </span>
                        <span className="text-xs font-bold whitespace-nowrap">{timeSinceCall.text}</span>
                    </div>
                </div>

                {/* Avatar and Title Section */}
                <div className="flex items-center gap-4 mb-6">
                    <ProfileAvatar
                        name={customerName}
                        style="burst"
                        size={56}
                        className="shrink-0 shadow-md ring-4 ring-gray-50 dark:ring-gray-700/30"
                    />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-0.5">
                            {customerName}
                        </h1>
                        <p className="text-gray-400 dark:text-gray-400 font-medium text-sm">
                            {neighborhood}
                        </p>
                    </div>
                </div>

                <div className="border-b border-gray-100 dark:border-gray-700 mb-5"></div>

                {/* Issue Description */}
                <p className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed mb-8">
                    {issueDescription}
                </p>

                {/* Info Grid - 2x2 Layout from Mockup */}
                {/* Info Grid - 2x2 Layout */}
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-6">
                    {/* Estimated Value */}
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-green-500 dark:text-green-400 text-[22px]">
                            payments
                        </span>
                        <span className="text-[15px] font-medium text-gray-700 dark:text-gray-200">
                            {estimate.display || 'Est. pending'}
                        </span>
                    </div>
                    {/* Service History Hint */}
                    <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                        <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-[22px]">
                            history
                        </span>
                        <span className="text-[14px] font-medium text-gray-600 dark:text-gray-300 truncate">
                            {serviceHistoryHint}
                        </span>
                    </div>
                    {/* Full Address */}
                    <div className="flex items-center gap-3 col-span-2">
                        <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-[22px]">
                            near_me
                        </span>
                        <span className="text-[14px] font-medium text-gray-600 dark:text-gray-300 truncate">
                            {address || 'Address not available'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Buttons - Restore 3-Column Layout from Mockup */}
            <div className="p-6 pt-0">
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={handleShare}
                        className="flex flex-col items-center justify-center gap-2 bg-[#F3F4F6] dark:bg-[#374151] hover:bg-[#E5E7EB] dark:hover:bg-[#4B5563] active:scale-[0.98] py-4 rounded-2xl transition-all duration-200 group"
                    >
                        <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors transform scale-x-[-1]">
                            reply
                        </span>
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            Share
                        </span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="flex flex-col items-center justify-center gap-2 bg-[#F3F4F6] dark:bg-[#374151] hover:bg-[#E5E7EB] dark:hover:bg-[#4B5563] active:scale-[0.98] py-4 rounded-2xl transition-all duration-200 group"
                    >
                        <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                            explore
                        </span>
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            See resource
                        </span>
                    </button>
                    <button
                        onClick={handleCall}
                        className="flex flex-col items-center justify-center gap-2 bg-[#F3F4F6] dark:bg-[#374151] hover:bg-[#E5E7EB] dark:hover:bg-[#4B5563] active:scale-[0.98] py-4 rounded-2xl transition-all duration-200 group"
                    >
                        <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                            gesture
                        </span>
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            Apply
                        </span>
                    </button>
                </div>
            </div>

            {/* Expanded Content (Standard project behavior) */}
            {expanded && (
                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                        Details
                    </p>
                    <div className="space-y-3">
                        {/* Subtext from narrative if exists */}
                        {narrative.subtext && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                    {narrative.subtext}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Phone: {customerPhone}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {data.id.substring(0, 8)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
