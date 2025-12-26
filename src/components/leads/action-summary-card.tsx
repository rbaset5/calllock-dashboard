'use client';

import * as React from 'react';
import Link from 'next/link';
import { RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageTabs } from '@/components/ui/page-tabs';
import { PriorityColor } from '@/types/database';

interface ActionSummaryCardProps {
    totalCount: number;
    bookedCount: number;
    activeFilter: PriorityColor | 'all';
    onFilterChange: (filter: PriorityColor | 'all') => void;
    onRefresh: () => void;
    refreshing: boolean;
    counts: {
        total: number;
        red: number;
        green: number;
        blue: number;
        gray: number;
    };
    todayDate: Date;
}

const PRIORITY_FILTERS: { value: PriorityColor | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
    { value: 'red', label: 'Callback Risk', color: 'bg-red-100 text-red-700' },
    { value: 'green', label: 'Commercial', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'blue', label: 'New Leads', color: 'bg-blue-100 text-blue-700' },
    { value: 'gray', label: 'Spam', color: 'bg-gray-100 text-gray-500' },
];

export function ActionSummaryCard({
    totalCount,
    bookedCount,
    activeFilter,
    onFilterChange,
    onRefresh,
    refreshing,
    counts,
    todayDate,
}: ActionSummaryCardProps) {
    return (
        <Card className="w-full max-w-lg mx-auto mb-6 overflow-hidden bg-white shadow-sm border border-gray-200 rounded-xl">
            <CardContent className="p-4 space-y-4">
                {/* Header - Identical to ActionPage.tsx */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-navy-800">Action</h1>
                        <span className="text-lg text-navy-400">({totalCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onRefresh}
                            disabled={refreshing}
                            aria-label="Refresh"
                        >
                            <RefreshCw className={cn('w-5 h-5', refreshing && 'animate-spin')} />
                        </Button>
                        <Link href="/history">
                            <Button variant="ghost" size="icon" aria-label="History">
                                <Clock className="w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Page Tabs - Identical to ActionPage.tsx */}
                <PageTabs
                    activeTab="action"
                    actionCount={totalCount}
                    bookedCount={bookedCount}
                />

                {/* Priority Filter Pills - Identical to ActionPage.tsx */}
                <div className="overflow-x-auto pb-1 -mx-2 px-2">
                    <div className="flex items-center justify-between gap-2 min-w-full">
                        {PRIORITY_FILTERS.map((filter) => {
                            const count = filter.value === 'all'
                                ? counts.total
                                : counts[filter.value as PriorityColor];

                            const isActive = activeFilter === filter.value;

                            return (
                                <Button
                                    key={filter.value}
                                    variant={isActive ? "default" : "outline"}
                                    className={cn(
                                        "flex-1 h-auto py-2 px-3 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all",
                                        isActive
                                            ? "border-navy-900 bg-navy-50 text-navy-900 hover:bg-navy-100 shadow-sm"
                                            : "border-gray-200 text-gray-600 hover:bg-slate-50 hover:text-navy-700"
                                    )}
                                    onClick={() => onFilterChange(filter.value)}
                                >
                                    <span className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors",
                                        isActive ? "bg-navy-900 text-white" : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
                                    )}>
                                        {count}
                                    </span>
                                    <span className="text-xs font-medium">{filter.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
