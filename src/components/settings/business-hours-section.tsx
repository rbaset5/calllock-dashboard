'use client';

import { Clock, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export interface BusinessHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface BusinessHoursSectionProps {
  businessHours: BusinessHour[];
  loading: boolean;
  onToggleDay: (dayOfWeek: number) => void;
  onUpdateTime: (dayOfWeek: number, field: 'open_time' | 'close_time', value: string) => void;
  onApplyAll: (openTime: string, closeTime: string) => void;
}

export function BusinessHoursSection({
  businessHours,
  loading,
  onToggleDay,
  onUpdateTime,
  onApplyAll,
}: BusinessHoursSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Business Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-12 bg-navy-100 rounded" />
            ))}
          </div>
        ) : (
          <>
            {/* Quick Apply */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-600">Quick apply:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onApplyAll('08:00', '17:00')}
                  className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
                >
                  8-5
                </button>
                <button
                  type="button"
                  onClick={() => onApplyAll('09:00', '18:00')}
                  className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
                >
                  9-6
                </button>
                <button
                  type="button"
                  onClick={() => onApplyAll('07:00', '19:00')}
                  className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
                >
                  7-7
                </button>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="space-y-2">
              {businessHours.map((day) => (
                <div
                  key={day.day_of_week}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    day.is_open ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleDay(day.day_of_week)}
                    className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors',
                      day.is_open
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    )}
                  >
                    {day.is_open && <Check className="w-4 h-4" />}
                  </button>

                  <span
                    className={cn(
                      'w-20 text-sm font-medium',
                      day.is_open ? 'text-gray-900' : 'text-gray-400'
                    )}
                  >
                    {DAY_NAMES[day.day_of_week].slice(0, 3)}
                  </span>

                  {day.is_open ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={day.open_time}
                        onChange={(e) => onUpdateTime(day.day_of_week, 'open_time', e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={`open-${time}`} value={time}>
                            {formatTime(time)}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-400">to</span>
                      <select
                        value={day.close_time}
                        onChange={(e) => onUpdateTime(day.day_of_week, 'close_time', e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500"
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

            <p className="text-xs text-gray-500">
              This determines when AI can book appointments. Emergency calls are always forwarded.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
