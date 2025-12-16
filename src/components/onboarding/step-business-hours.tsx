'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface StepBusinessHoursProps {
  initialData: {
    businessHours?: DaySchedule[];
  };
  onNext: (data: { businessHours: DaySchedule[] }) => void;
  onBack: () => void;
}

const DEFAULT_HOURS: DaySchedule[] = [
  { dayOfWeek: 0, dayName: 'Sunday', isOpen: false, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 1, dayName: 'Monday', isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 2, dayName: 'Tuesday', isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 3, dayName: 'Wednesday', isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 4, dayName: 'Thursday', isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 5, dayName: 'Friday', isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 6, dayName: 'Saturday', isOpen: false, openTime: '08:00', closeTime: '18:00' },
];

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function StepBusinessHours({ initialData, onNext, onBack }: StepBusinessHoursProps) {
  const [hours, setHours] = useState<DaySchedule[]>(
    initialData.businessHours || DEFAULT_HOURS
  );

  const toggleDay = (dayOfWeek: number) => {
    setHours((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, isOpen: !day.isOpen } : day
      )
    );
  };

  const updateTime = (dayOfWeek: number, field: 'openTime' | 'closeTime', value: string) => {
    setHours((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ businessHours: hours });
  };

  const applyToAll = (openTime: string, closeTime: string) => {
    setHours((prev) =>
      prev.map((day) => ({
        ...day,
        openTime: day.isOpen ? openTime : day.openTime,
        closeTime: day.isOpen ? closeTime : day.closeTime,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy-800">Business Hours</h2>
        <p className="text-gray-600 mt-2">
          When are you available for appointments?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Apply */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <span className="text-sm text-gray-600">Quick apply:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyToAll('08:00', '17:00')}
              className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
            >
              8-5
            </button>
            <button
              type="button"
              onClick={() => applyToAll('09:00', '18:00')}
              className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
            >
              9-6
            </button>
            <button
              type="button"
              onClick={() => applyToAll('07:00', '19:00')}
              className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
            >
              7-7
            </button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="space-y-2">
          {hours.map((day) => (
            <div
              key={day.dayOfWeek}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                day.isOpen ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
              )}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day.dayOfWeek)}
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors',
                  day.isOpen
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                )}
              >
                {day.isOpen && <Check className="w-4 h-4" />}
              </button>

              {/* Day Name */}
              <span
                className={cn(
                  'w-20 text-sm font-medium',
                  day.isOpen ? 'text-gray-900' : 'text-gray-400'
                )}
              >
                {day.dayName.slice(0, 3)}
              </span>

              {/* Time Selectors */}
              {day.isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={day.openTime}
                    onChange={(e) => updateTime(day.dayOfWeek, 'openTime', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={`open-${time}`} value={time}>
                        {formatTime(time)}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400">to</span>
                  <select
                    value={day.closeTime}
                    onChange={(e) => updateTime(day.dayOfWeek, 'closeTime', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={`close-${time}`} value={time}>
                        {formatTime(time)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-gray-400 flex-1">Closed</span>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center">
          This determines when AI can book appointments. Emergency calls are always forwarded.
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}
