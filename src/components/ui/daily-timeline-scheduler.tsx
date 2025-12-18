"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, MapPin, User } from "lucide-react";

export interface TimelineJob {
    id: string;
    title: string;
    scheduledTime: Date;
    endTime?: Date;
    customerName?: string;
    address?: string;
    status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    color?: string;
}

interface DailyTimelineSchedulerProps {
    jobs: TimelineJob[];
    selectedDate: Date;
    onJobClick?: (job: TimelineJob) => void;
}

const DailyTimelineScheduler: React.FC<DailyTimelineSchedulerProps> = ({
    jobs,
    selectedDate,
    onJobClick,
}) => {
    // Filter jobs for the selected date and sort by time
    const filteredJobs = React.useMemo(() => {
        return jobs
            .filter((job) => isSameDay(job.scheduledTime, selectedDate))
            .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    }, [jobs, selectedDate]);

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500';
            case 'in-progress':
                return 'bg-blue-500';
            case 'cancelled':
                return 'bg-red-500';
            default:
                return 'bg-gray-400';
        }
    };

    const getStatusBg = (status?: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-50 border-green-200';
            case 'in-progress':
                return 'bg-blue-50 border-blue-200';
            case 'cancelled':
                return 'bg-red-50 border-red-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    if (filteredJobs.length === 0) {
        return (
            <div className="text-center py-4 text-gray-500 text-sm">
                No jobs scheduled for {format(selectedDate, "MMMM d, yyyy")}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {format(selectedDate, "EEEE, MMMM d")}
            </h3>

            <div className="space-y-2">
                {filteredJobs.map((job, index) => (
                    <button
                        key={job.id}
                        onClick={() => onJobClick?.(job)}
                        className={cn(
                            "w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left",
                            getStatusBg(job.status),
                            "hover:shadow-sm"
                        )}
                    >
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                            <div className={cn("w-2.5 h-2.5 rounded-full", getStatusColor(job.status))} />
                            {index < filteredJobs.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-200 mt-1 min-h-[20px]" />
                            )}
                        </div>

                        {/* Job content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                    {job.title}
                                </span>
                                <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {format(job.scheduledTime, "h:mm a")}
                                    {job.endTime && ` - ${format(job.endTime, "h:mm a")}`}
                                </div>
                            </div>

                            {job.customerName && (
                                <div className="flex items-center text-xs text-gray-600 mt-1">
                                    <User className="w-3 h-3 mr-1" />
                                    {job.customerName}
                                </div>
                            )}

                            {job.address && (
                                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    <span className="truncate">{job.address}</span>
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DailyTimelineScheduler;
