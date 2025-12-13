'use client';

import { useState } from 'react';
import { FileText, Plus, X, Save, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Document {
  id: string;
  name: string;
  type: 'md' | 'txt' | 'pdf';
}

const INITIAL_DOCUMENTS: Document[] = [
  { id: '1', name: 'DOC_Objections.md', type: 'md' },
  { id: '2', name: 'DOC_Pricing.md', type: 'md' },
  { id: '3', name: 'DOC_Services.md', type: 'md' },
  { id: '4', name: 'DOC_FAQ.md', type: 'md' },
  { id: '5', name: 'DOC_Company.md', type: 'md' },
];

export default function KnowledgebasePage() {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  function handleRemoveDocument(id: string) {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    setSuccess(false);
  }

  function handleAddDocument() {
    if (!newDocName.trim()) return;

    const name = newDocName.endsWith('.md') ? newDocName : `${newDocName}.md`;
    const newDoc: Document = {
      id: Date.now().toString(),
      name,
      type: 'md',
    };

    setDocuments((prev) => [...prev, newDoc]);
    setNewDocName('');
    setShowAddModal(false);
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    // Simulate save operation
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    setSuccess(true);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Knowledgebase</h1>
      <p className="text-sm text-gray-500">
        Manage documents that your AI assistant uses to answer questions and handle calls.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Document Grid */}
          <div className="flex flex-wrap gap-3 mb-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="relative group"
              >
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors min-w-[100px]">
                  <FileText className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-600 text-center max-w-[90px] truncate" title={doc.name}>
                    {doc.name}
                  </span>
                </div>
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  title="Remove document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Add Document Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 hover:bg-gray-100 transition-colors min-w-[100px] min-h-[100px]"
            >
              <Plus className="w-8 h-8 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Add</span>
            </button>
          </div>

          {/* Add Document Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Document</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      placeholder="DOC_NewDocument.md"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddDocument();
                        if (e.key === 'Escape') setShowAddModal(false);
                      }}
                      autoFocus
                    />
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Drag & drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supports .md, .txt files
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewDocName('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddDocument}
                    disabled={!newDocName.trim()}
                    className="flex-1"
                  >
                    Add Document
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {documents.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No documents in knowledgebase</p>
              <p className="text-sm text-gray-400 mt-1">
                Add documents to help your AI assistant
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          Knowledgebase saved successfully!
        </div>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} size="lg" className="w-full" loading={saving}>
        <Save className="w-5 h-5 mr-2" />
        Save
      </Button>
    </div>
  );
}
