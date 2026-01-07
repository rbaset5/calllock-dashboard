'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { X, Phone, Calendar, MapPin } from 'lucide-react';
import { useOnClickOutside } from 'usehooks-ts';
import { Map, MapMarker, MarkerContent, MapControls, useMap } from '@/components/ui/map';
import { TileCardData } from '@/components/ui/expandable-tile-card';
import { cn } from '@/lib/utils';

interface MapViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: TileCardData[];
  title?: string;
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
  card: TileCardData;
  isActive: boolean;
  onClick: () => void;
  onExpand: () => void;
}

function CarouselCard({ card, isActive, onClick, onExpand }: CarouselCardProps) {
  return (
    <div
      onClick={() => {
        onClick();
        onExpand();
      }}
      className={cn(
        "flex-shrink-0 w-[280px] bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl cursor-pointer transition-all border border-white/10",
        isActive ? "ring-2 ring-blue-500 scale-[1.02]" : "opacity-90"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0">
          <img
            src={getDiceBearAvatarUrl(card.author)}
            alt={card.author}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm truncate">
            {card.title}
          </h4>
          <p className="text-xs text-white/50 truncate">
            {card.author}
          </p>
          {card.address && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <MapPin size={10} />
              <span className="truncate">{card.address}</span>
            </div>
          )}
        </div>
      </div>

      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.tags.slice(0, 2).map((tag, i) => (
            <span
              key={i}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded-full',
                tag.color === 'blue' && 'bg-blue-100 text-blue-700',
                tag.color === 'red' && 'bg-red-100 text-red-700',
                tag.color === 'amber' && 'bg-amber-100 text-amber-700',
                tag.color === 'green' && 'bg-green-100 text-green-700',
                tag.color === 'teal' && 'bg-teal-100 text-teal-700',
                tag.color === 'gray' && 'bg-gray-100 text-gray-600'
              )}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (card.phone) window.open(`tel:${card.phone}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Phone size={12} />
          Call
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 text-white text-xs font-semibold py-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          <Calendar size={12} />
          Book
        </button>
      </div>
    </div>
  );
}

interface ExpandedCardProps {
  card: TileCardData;
  onClose: () => void;
}

function ExpandedCard({ card, onClose }: ExpandedCardProps) {
  const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  useOnClickOutside(ref, onClose);

  useEffect(() => {
    function onKeyDown(event: { key: string }) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-[230] grid place-items-center p-6 bg-black/60 backdrop-blur-sm">
      <div
        ref={ref}
        className="bg-zinc-900 w-full max-w-[340px] rounded-2xl p-5 shadow-2xl border border-white/10"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 shrink-0">
            <img
              src={getDiceBearAvatarUrl(card.author)}
              alt={card.author}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-base">
              {card.title}
            </h4>
            <p className="text-sm text-white/60">
              {card.author}
            </p>
            {card.address && (
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500">
                <MapPin size={12} />
                <span>{card.address}</span>
              </div>
            )}
          </div>
        </div>

        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {card.tags.map((tag, i) => (
              <span
                key={i}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full',
                  tag.color === 'blue' && 'bg-blue-100 text-blue-700',
                  tag.color === 'red' && 'bg-red-100 text-red-700',
                  tag.color === 'amber' && 'bg-amber-100 text-amber-700',
                  tag.color === 'green' && 'bg-green-100 text-green-700',
                  tag.color === 'teal' && 'bg-teal-100 text-teal-700',
                  tag.color === 'gray' && 'bg-gray-100 text-gray-600'
                )}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {(card.aiSummary || card.preview) && (
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            {card.aiSummary || card.preview}
          </p>
        )}

        {card.keyDetails && card.keyDetails.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {card.keyDetails.map((detail, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500 mt-0.5">•</span>
                {detail}
              </li>
            ))}
          </ul>
        )}

        {card.phone && (
          <p className="flex items-center gap-2 text-sm text-gray-500 mt-4">
            <Phone size={14} />
            {card.phone}
          </p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (card.phone) window.open(`tel:${card.phone}`);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white text-sm font-semibold py-3 rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Phone size={16} />
            Call Now
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white text-sm font-semibold py-3 rounded-xl hover:bg-white/20 transition-colors"
          >
            <Calendar size={16} />
            Book
          </button>
        </div>
      </div>
    </div>
  );
}

interface MapContentProps {
  cards: TileCardData[];
  activeCardId: string | null;
  onMarkerClick: (cardId: string) => void;
}

function MapContent({ cards, activeCardId, onMarkerClick }: MapContentProps) {
  const { map, isLoaded } = useMap();

  const flyToCard = useCallback((card: TileCardData) => {
    if (!map || !isLoaded) return;
    const coords = getCoordinatesFromAddress(card.address);
    map.flyTo({
      center: coords,
      zoom: 14,
      duration: 1000,
    });
  }, [map, isLoaded]);

  useEffect(() => {
    if (activeCardId && isLoaded) {
      const card = cards.find(c => c.id === activeCardId);
      if (card) {
        flyToCard(card);
      }
    }
  }, [activeCardId, cards, flyToCard, isLoaded]);

  return (
    <>
      <MapControls position="top-right" showZoom showLocate />
      {cards.map((card) => {
        const coords = getCoordinatesFromAddress(card.address);
        const isActive = card.id === activeCardId;

        return (
          <MapMarker
            key={card.id}
            longitude={coords[0]}
            latitude={coords[1]}
            onClick={() => onMarkerClick(card.id)}
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
                    src={getDiceBearAvatarUrl(card.author)}
                    alt={card.author}
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

export function MapViewModal({ isOpen, onClose, cards, title }: MapViewModalProps) {
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null);
  const [expandedCard, setExpandedCard] = React.useState<TileCardData | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<globalThis.Map<string, HTMLDivElement>>(new globalThis.Map());

  useEffect(() => {
    if (isOpen && cards.length > 0 && !activeCardId) {
      setActiveCardId(cards[0].id);
    }
  }, [isOpen, cards, activeCardId]);

  useEffect(() => {
    if (!isOpen) {
      setActiveCardId(null);
      setExpandedCard(null);
    }
  }, [isOpen]);

  const handleCardClick = useCallback((cardId: string) => {
    setActiveCardId(cardId);
  }, []);

  const handleCardExpand = useCallback((card: TileCardData) => {
    setExpandedCard(card);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedCard(null);
  }, []);

  const handleMarkerClick = useCallback((cardId: string) => {
    setActiveCardId(cardId);
    const cardElement = cardRefs.current.get(cardId);
    if (cardElement && carouselRef.current) {
      const containerRect = carouselRef.current.getBoundingClientRect();
      const cardRect = cardElement.getBoundingClientRect();
      const scrollLeft = cardElement.offsetLeft - containerRect.width / 2 + cardRect.width / 2;
      carouselRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, []);

  const mapCenter = React.useMemo((): [number, number] => {
    if (cards.length === 0) return [-83.0458, 42.3314];

    const coords = cards.map(c => getCoordinatesFromAddress(c.address));
    const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    return [avgLng, avgLat];
  }, [cards]);

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
              className="absolute top-3 left-4 z-[220] p-2 bg-black/60 backdrop-blur rounded-full shadow-lg border border-white/10 text-white hover:bg-black/80 transition-colors"
            >
              <X size={18} />
            </button>

            {title && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[220] px-4 py-1.5 bg-black/60 backdrop-blur rounded-full shadow-lg border border-white/10">
                <span className="text-sm font-semibold text-white">{title}</span>
                <span className="text-sm text-white/50 ml-2">{cards.length}</span>
              </div>
            )}

            <div className="absolute inset-0 top-0">
              <Map center={mapCenter} zoom={11}>
                <MapContent
                  cards={cards}
                  activeCardId={activeCardId}
                  onMarkerClick={handleMarkerClick}
                />
              </Map>
            </div>

            {expandedCard && (
              <ExpandedCard card={expandedCard} onClose={handleCloseExpanded} />
            )}

            <div className="absolute bottom-0 left-0 right-0 z-[210] pb-6 pt-4 bg-gradient-to-t from-black/60 to-transparent">
              <div
                ref={carouselRef}
                className="flex gap-3 px-4 overflow-x-auto no-scrollbar scroll-smooth"
              >
                {cards.map((card) => (
                  <div
                    key={card.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(card.id, el);
                    }}
                  >
                    {expandedCard?.id !== card.id && (
                      <CarouselCard
                        card={card}
                        isActive={card.id === activeCardId}
                        onClick={() => handleCardClick(card.id)}
                        onExpand={() => handleCardExpand(card)}
                      />
                    )}
                    {expandedCard?.id === card.id && (
                      <div className="w-[280px] h-[140px]" />
                    )}
                  </div>
                ))}
                <div className="w-4 shrink-0" />
              </div>
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

export default MapViewModal;
