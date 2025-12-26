'use client';

import * as React from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from '@/components/ui/drawer';
import { TranscriptViewer } from '@/components/ui/transcript-viewer';
import { Button } from '@/components/ui/button';
import { X, FileText, MessageSquare } from 'lucide-react';
import type { VelocityItem } from './types';

interface DetailsDrawerProps {
    item: VelocityItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function parseTranscript(raw: any): any[] | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // Not JSON, handle as plain text
        }
        return [{ role: 'agent', content: raw }];
    }
    return null;
}

export function DetailsDrawer({ item, open, onOpenChange }: DetailsDrawerProps) {
    if (!item) return null;

    const aiSummary = item.ai_summary;
    const transcript = parseTranscript(item.call_transcript);

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="border-b pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <DrawerTitle className="text-xl font-bold">
                                {item.customer_name || 'Service Request'}
                            </DrawerTitle>
                            <DrawerDescription>
                                Full details and call transcript
                            </DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* AI SUMMARY SECTION */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <h3>AI Assessment</h3>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {aiSummary || 'No summary available.'}
                            </p>
                        </div>
                    </section>

                    {/* TRANSCRIPT SECTION */}
                    <section className="pb-10">
                        <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold">
                            <MessageSquare className="h-5 w-5 text-blue-500" />
                            <h3>Call Transcript</h3>
                        </div>
                        {transcript ? (
                            <TranscriptViewer
                                transcript={transcript}
                                className="border-none shadow-none p-0"
                            />
                        ) : (
                            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                                <p className="text-sm italic">No transcript available for this call.</p>
                            </div>
                        )}
                    </section>
                </div>

                <div className="p-4 border-t bg-slate-50">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => onOpenChange(false)}
                    >
                        Close Details
                    </Button>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
