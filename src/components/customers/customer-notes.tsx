'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

interface CustomerNote {
  id: string;
  phone_number: string;
  note: string;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

interface CustomerNotesProps {
  phone: string;
}

export function CustomerNotes({ phone }: CustomerNotesProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/customer-notes?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/customer-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          note: newNote.trim(),
        }),
      });

      if (response.ok) {
        setNewNote('');
        setShowAddForm(false);
        fetchNotes();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (note: CustomerNote) => {
    try {
      const response = await fetch(`/api/customer-notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !note.is_active }),
      });

      if (response.ok) {
        fetchNotes();
      }
    } catch (error) {
      console.error('Error toggling note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const response = await fetch(`/api/customer-notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Customer Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-16 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  const activeNotes = notes.filter(n => n.is_active);
  const inactiveNotes = notes.filter(n => !n.is_active);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Customer Updates
            <span className="text-xs font-normal text-gray-500">
              (AI reads these to customer)
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add Note Form */}
        {showAddForm && (
          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="e.g., Tech is running 30 min late, Parts on order..."
              className="w-full p-2 text-sm border rounded-md resize-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNote('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={saving || !newNote.trim()}
              >
                {saving ? 'Saving...' : 'Add Update'}
              </Button>
            </div>
          </div>
        )}

        {/* Active Notes */}
        {activeNotes.length > 0 && (
          <div className="space-y-2">
            {activeNotes.map((note) => (
              <div
                key={note.id}
                className="bg-green-50 border border-green-200 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-900 flex-1">{note.note}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-green-600"
                      onClick={() => handleToggleActive(note)}
                      title="Deactivate"
                    >
                      <ToggleRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={() => handleDelete(note.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Added {formatRelativeTime(note.created_at)}
                  {note.created_by && ` by ${note.created_by.split('@')[0]}`}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Inactive Notes */}
        {inactiveNotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Inactive</p>
            {inactiveNotes.map((note) => (
              <div
                key={note.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-60"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-600 flex-1">{note.note}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400"
                      onClick={() => handleToggleActive(note)}
                      title="Activate"
                    >
                      <ToggleLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400"
                      onClick={() => handleDelete(note.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {notes.length === 0 && !showAddForm && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">
              No updates for this customer
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Update
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
