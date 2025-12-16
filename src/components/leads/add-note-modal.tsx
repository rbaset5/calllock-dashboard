'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lead } from '@/types/database';

interface AddNoteModalProps {
    lead: Lead | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddNoteModal({ lead, onClose, onSuccess }: AddNoteModalProps) {
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!lead || !note.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/leads/${lead.id}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ note }),
            });

            if (!response.ok) {
                throw new Error('Failed to save note');
            }

            onSuccess();
            onClose();
            setNote(''); // Reset form
        } catch (error) {
            console.error('Error adding note:', error);
            // Ideally show toast error here
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={!!lead} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Note</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        value={note}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                        placeholder="Enter note details..."
                        className="min-h-[100px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!note.trim() || isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Note'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
