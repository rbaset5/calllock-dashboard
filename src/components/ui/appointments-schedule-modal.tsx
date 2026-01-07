"use client";

import * as React from "react";
import { useRef, useEffect, useCallback } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Phone, MapPin, Clock } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { EventSlot } from "@/components/ui/calendar-with-event-slots";
import { Map, MapMarker, MarkerContent, MapControls, useMap } from "@/components/ui/map";

type ViewMode = "day" | "week";

interface AppointmentsScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventSlot[];
  initialDate?: Date;
  onEventClick?: (event: EventSlot) => void;
}

const DETROIT_AREA_COORDS: Record<string, [number, number]> = {
  'Detroit MI': [-83.0458, 42.3314],
  'Warren MI': [-83.0147, 42.4903],
  'Livonia MI': [-83.3527, 42.3684],
  'Southfield MI': [-83.2219, 42.4734],
  'Troy MI': [-83.1499, 42.6056],
  'Royal Oak MI': [-83.1449, 42.4895],
  'Farmington MI': [-83.3766, 42.4645],
  'Novi MI': [-83.4755, 42.4806],
};

function getCoordinatesFromAddress(address?: string): [number, number] {
  if (!address) return [-83.0458, 42.3314];
  
  for (const [city, coords] of Object.entries(DETROIT_AREA_COORDS)) {
    if (address.toLowerCase().includes(city.toLowerCase().split(' ')[0])) {
      const jitter = () => (Math.random() - 0.5) * 0.02;
      return [coords[0] + jitter(), coords[1] + jitter()];
    }
  }
  
  const jitter = () => (Math.random() - 0.5) * 0.05;
  return [-83.0458 + jitter(), 42.3314 + jitter()];
}

const AVATAR_COLORS = [
  "3b82f6", "8b5cf6", "ec4899", "ef4444", "f97316", "eab308",
  "22c55e", "14b8a6", "06b6d4", "6366f1", "a855f7", "d946ef",
];

const getColorIndex = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
};

const getDiceBearAvatarUrl = (name?: string): string => {
  const baseUrl = "https://api.dicebear.com/7.x";
  if (name && name.trim()) {
    const seed = encodeURIComponent(name.trim());
    const bgColor = AVATAR_COLORS[getColorIndex(name.trim())];
    return `${baseUrl}/initials/svg?seed=${seed}&backgroundColor=${bgColor}&textColor=ffffff&fontSize=40&fontWeight=600`;
  }
  return `${baseUrl}/thumbs/svg?seed=anonymous&backgroundColor=e5e7eb&shapeColor=9ca3af`;
};

interface CarouselCardProps {
  event: EventSlot;
  isActive: boolean;
  onClick: () => void;
}

function CarouselCard({ event, isActive, onClick }: CarouselCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-[280px] bg-white rounded-2xl p-4 shadow-lg cursor-pointer transition-all",
        isActive ? "ring-2 ring-blue-500 scale-[1.02]" : "opacity-90"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0">
          <img
            src={getDiceBearAvatarUrl(event.author)}
            alt={event.author || ""}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 text-sm truncate">
            {event.title}
          </h4>
          <p className="text-xs text-gray-500 truncate">
            {event.author}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <Clock size={10} />
            <span>{format(event.from, "h:mm a")}</span>
          </div>
          {event.address && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
              <MapPin size={10} />
              <span className="truncate">{event.address}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (event.phone) window.open(`tel:${event.phone}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Phone size={12} />
          Call
        </button>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <MapPin size={12} />
          Navigate
        </button>
      </div>
    </div>
  );
}

interface MapContentProps {
  events: EventSlot[];
  activeEventId: string | null;
  onMarkerClick: (eventId: string) => void;
}

function MapContent({ events, activeEventId, onMarkerClick }: MapContentProps) {
  const { map, isLoaded } = useMap();
  
  const flyToEvent = useCallback((event: EventSlot) => {
    if (!map || !isLoaded) return;
    const coords = getCoordinatesFromAddress(event.address);
    map.flyTo({
      center: coords,
      zoom: 14,
      duration: 1000,
    });
  }, [map, isLoaded]);

  useEffect(() => {
    if (activeEventId && isLoaded) {
      const event = events.find(e => e.id === activeEventId);
      if (event) {
        flyToEvent(event);
      }
    }
  }, [activeEventId, events, flyToEvent, isLoaded]);

  return (
    <>
      <MapControls position="top-right" showZoom showLocate />
      {events.map((event) => {
        const coords = getCoordinatesFromAddress(event.address);
        const isActive = event.id === activeEventId;
        
        return (
          <MapMarker
            key={event.id}
            longitude={coords[0]}
            latitude={coords[1]}
            onClick={() => onMarkerClick(event.id)}
          >
            <MarkerContent>
              <div 
                className={cn(
                  "relative transition-all duration-200",
                  isActive && "scale-125 z-10"
                )}
              >
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden",
                    isActive ? "ring-2 ring-blue-500" : ""
                  )}
                >
                  <img
                    src={getDiceBearAvatarUrl(event.author)}
                    alt={event.author || ""}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                )}
              </div>
            </MarkerContent>
          </MapMarker>
        );
      })}
    </>
  );
}

export function AppointmentsScheduleModal({
  isOpen,
  onClose,
  events,
  initialDate,
  onEventClick,
}: AppointmentsScheduleModalProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = React.useState<Date>(initialDate ?? new Date());
  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<globalThis.Map<string, HTMLDivElement>>(new globalThis.Map());

  const filteredEvents = React.useMemo(() => {
    if (viewMode === "day") {
      return events.filter((event) => 
        isSameDay(new Date(event.from), selectedDate)
      );
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return events.filter((event) => {
        const eventDate = new Date(event.from);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });
    }
  }, [events, viewMode, selectedDate]);

  useEffect(() => {
    if (isOpen && filteredEvents.length > 0 && !activeEventId) {
      setActiveEventId(filteredEvents[0].id);
    }
  }, [isOpen, filteredEvents, activeEventId]);

  useEffect(() => {
    if (!isOpen) {
      setActiveEventId(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && initialDate) {
      setSelectedDate(initialDate);
    }
  }, [isOpen, initialDate]);

  const handlePrev = () => {
    if (viewMode === "day") {
      setSelectedDate(addDays(selectedDate, -1));
    } else {
      setSelectedDate(subWeeks(selectedDate, 1));
    }
    setActiveEventId(null);
  };

  const handleNext = () => {
    if (viewMode === "day") {
      setSelectedDate(addDays(selectedDate, 1));
    } else {
      setSelectedDate(addWeeks(selectedDate, 1));
    }
    setActiveEventId(null);
  };

  const handleCardClick = useCallback((eventId: string) => {
    setActiveEventId(eventId);
  }, []);

  const handleMarkerClick = useCallback((eventId: string) => {
    setActiveEventId(eventId);
    const cardElement = cardRefs.current.get(eventId);
    if (cardElement && carouselRef.current) {
      const containerRect = carouselRef.current.getBoundingClientRect();
      const cardRect = cardElement.getBoundingClientRect();
      const scrollLeft = cardElement.offsetLeft - containerRect.width / 2 + cardRect.width / 2;
      carouselRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, []);

  const mapCenter = React.useMemo((): [number, number] => {
    if (filteredEvents.length === 0) return [-83.0458, 42.3314];
    
    const coords = filteredEvents.map(e => getCoordinatesFromAddress(e.address));
    const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    return [avgLng, avgLat];
  }, [filteredEvents]);

  const getDateLabel = () => {
    if (viewMode === "day") {
      return format(selectedDate, "EEE, MMM d");
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;
    }
  };

  return (
    <DrawerPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/40" />
        <DrawerPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-[200] flex h-[92vh] flex-col rounded-t-[20px] bg-black overflow-hidden"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/30" />
          
          <div className="relative flex-1 flex flex-col overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-3 left-4 z-[220] p-2 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[220] flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-2 py-1">
              <button
                onClick={handlePrev}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-xs font-medium text-gray-900 min-w-[90px] text-center">
                {getDateLabel()}
              </span>

              <button
                onClick={handleNext}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={16} />
              </button>

              <div className="w-px h-4 bg-gray-200" />

              <div className="flex items-center bg-gray-100 rounded-full p-0.5">
                <button
                  onClick={() => setViewMode("day")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                    viewMode === "day" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <CalendarDays size={10} />
                  Day
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                    viewMode === "week" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <CalendarRange size={10} />
                  Week
                </button>
              </div>
            </div>

            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[220]">
              <span className="text-[10px] text-white/80 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                {filteredEvents.length} appointment{filteredEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="absolute inset-0 top-0">
              <Map center={mapCenter} zoom={11}>
                <MapContent 
                  events={filteredEvents} 
                  activeEventId={activeEventId} 
                  onMarkerClick={handleMarkerClick}
                />
              </Map>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-[210] pb-6 pt-4 bg-gradient-to-t from-black/60 to-transparent">
              {filteredEvents.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
                    <p className="text-gray-600 text-sm">No appointments for this {viewMode}</p>
                    <p className="text-gray-400 text-xs mt-1">Try selecting a different date</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={carouselRef}
                  className="flex gap-3 px-4 overflow-x-auto no-scrollbar scroll-smooth"
                >
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(event.id, el);
                      }}
                    >
                      <CarouselCard
                        event={event}
                        isActive={event.id === activeEventId}
                        onClick={() => handleCardClick(event.id)}
                      />
                    </div>
                  ))}
                  <div className="w-4 shrink-0" />
                </div>
              )}
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

export default AppointmentsScheduleModal;
