'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StickyNote, Plus, Trash2, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { OperatorNote } from '@/types/database';

interface OperatorNotesProps {
  customerPhone: string;
  customerName?: string | null;
  jobId?: string;
  leadId?: string;
  className?: string;
}

/**
 * OperatorNotes displays and manages notes for a customer
 * Fetches notes by phone number and allows adding new notes
 */
export function OperatorNotes({
  customerPhone,
  customerName,
  jobId,
  leadId,
  className,
}: OperatorNotesProps) {
  const [notes, setNotes] = useState<OperatorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [customerPhone, jobId, leadId]);

  async function fetchNotes() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customerPhone) params.set('phone', customerPhone);
      if (jobId) params.set('job_id', jobId);
      if (leadId) params.set('lead_id', leadId);

      const response = await fetch(`/api/operator-notes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!newNoteText.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/operator-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_phone: customerPhone,
          customer_name: customerName,
          note_text: newNoteText.trim(),
          job_id: jobId,
          lead_id: leadId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes([data.note, ...notes]);
        setNewNoteText('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      const response = await fetch(`/api/operator-notes?id=${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId));
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-yellow-500" />
            Operator Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-yellow-500" />
            Operator Notes
            {notes.length > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                {notes.length}
              </span>
            )}
          </CardTitle>
          {!showAddForm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Add Note Form */}
        {showAddForm && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 space-y-2">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add a note about this customer..."
              className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteText.trim() || saving}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNoteText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !showAddForm ? (
          <p className="text-sm text-gray-500 italic">No notes for this customer</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100 group"
              >
                <p className="text-sm text-gray-800">{note.note_text}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {note.created_by && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {note.created_by.split('@')[0]}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                    {note.expires_at && (
                      <span className="text-orange-600">
                        Expires {formatDistanceToNow(new Date(note.expires_at), { addSuffix: true })}
                      </span>
                    )}
                    {note.synced_from_backend && (
                      <span className="text-blue-500">Synced</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
