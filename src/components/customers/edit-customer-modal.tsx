'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  X,
  User,
  Phone,
  MapPin,
  Loader2,
  Wrench,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Customer, CustomerEquipment } from '@/types/database';

interface EditCustomerModalProps {
  customer: Customer;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

interface FormData {
  name: string;
  phone: string;
  address: string;
  email: string;
  equipment: CustomerEquipment[];
}

export function EditCustomerModal({ customer, onClose, onSaved }: EditCustomerModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: customer.name,
    phone: customer.phone,
    address: customer.address || '',
    email: customer.email || '',
    equipment: customer.equipment || [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format phone number as user types
  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Name is required (min 2 characters)';
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      newErrors.phone = 'Valid phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim() || null,
          email: formData.email.trim() || null,
          equipment: formData.equipment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      onSaved(data.customer);
    } catch (err) {
      console.error('Update customer error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const addEquipment = () => {
    setFormData({
      ...formData,
      equipment: [...formData.equipment, { type: '' }],
    });
  };

  const updateEquipment = (index: number, field: keyof CustomerEquipment, value: string | number) => {
    const newEquipment = [...formData.equipment];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setFormData({ ...formData, equipment: newEquipment });
  };

  const removeEquipment = (index: number) => {
    const newEquipment = formData.equipment.filter((_, i) => i !== index);
    setFormData({ ...formData, equipment: newEquipment });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Edit Customer
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Customer Name *
            </Label>
            <Input
              id="name"
              placeholder="John Smith"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              Phone Number *
            </Label>
            <Input
              id="phone"
              placeholder="(512) 555-1234"
              value={formData.phone}
              onChange={handlePhoneChange}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Address
            </Label>
            <Input
              id="address"
              placeholder="1234 Oak St, Austin, TX 78701"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Wrench className="w-4 h-4" />
                Equipment on File
              </Label>
              <Button variant="ghost" size="sm" onClick={addEquipment}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {formData.equipment.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No equipment on file</p>
            ) : (
              <div className="space-y-3">
                {formData.equipment.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Type (e.g., AC)"
                          value={item.type}
                          onChange={(e) => updateEquipment(index, 'type', e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          placeholder="Brand"
                          value={item.brand || ''}
                          onChange={(e) => updateEquipment(index, 'brand', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 ml-2"
                        onClick={() => removeEquipment(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Model"
                        value={item.model || ''}
                        onChange={(e) => updateEquipment(index, 'model', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Year"
                        type="number"
                        value={item.year ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : undefined;
                          if (val !== undefined) {
                            updateEquipment(index, 'year', val);
                          }
                        }}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Location"
                        value={item.location || ''}
                        onChange={(e) => updateEquipment(index, 'location', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <span className="text-sm">{error}</span>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t p-4 space-y-2 shrink-0 bg-white">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
