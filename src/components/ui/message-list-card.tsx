'use client';

import React from 'react';
import { Search, Star, Phone, MapPin, MoreHorizontal, Calendar, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { useOnClickOutside } from 'usehooks-ts';
import { format } from 'date-fns';
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerSeparator,
} from '@/components/ui/dropdrawer';
import { TileCardData } from '@/components/ui/expandable-tile-card';

export interface MessageListItem {
  id: string;
  avatar: string;
  name: string;
  text: string;
  date: string;
  phone?: string;
  address?: string;
  isFavorite?: boolean;
  isActive?: boolean;
  tags?: Array<{ label: string; color: 'blue' | 'red' | 'green' | 'amber' | 'teal' | 'gray' }>;
}

interface MessageListCardProps {
  title?: string;
  messages: MessageListItem[];
  cards?: TileCardData[];
  onMessageClick?: (id: string) => void;
  onFavoriteToggle?: (id: string) => void;
  onCallClick?: (phone: string) => void;
  onMenuAction?: (id: string, action: 'call' | 'book' | 'snooze' | 'archive') => void;
  showSearch?: boolean;
}

const tagColors = {
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  teal: 'bg-teal-100 text-teal-700',
  gray: 'bg-gray-100 text-gray-700',
};

const avatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-pink-500',
];

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

export const MessageListCard: React.FC<MessageListCardProps> = ({
  title = 'Messages',
  messages,
  cards,
  onMessageClick,
  onFavoriteToggle,
  onCallClick,
  onMenuAction,
  showSearch = true,
}) => {
  const [expandedCard, setExpandedCard] = React.useState<TileCardData | null>(null);
  const modalRef = React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  useOnClickOutside(modalRef, () => setExpandedCard(null));

  React.useEffect(() => {
    function onKeyDown(event: { key: string }) {
      if (event.key === "Escape") {
        setExpandedCard(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleItemClick = (messageId: string) => {
    if (cards) {
      const card = cards.find(c => c.id === messageId);
      if (card) {
        setExpandedCard(card);
        return;
      }
    }
    onMessageClick?.(messageId);
  };

  return (
    <>
      <AnimatePresence>
        {expandedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expandedCard && (
          <div className="fixed inset-0 z-[110] grid place-items-center p-4">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full max-w-[340px] cursor-pointer flex flex-col gap-4 overflow-hidden p-5 shadow-2xl border border-gray-100"
              style={{ borderRadius: 28 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-gray-900 tracking-tight">
                  {expandedCard.category}
                </span>
                <span className="text-[11px] font-medium text-gray-400">
                  {format(expandedCard.timestamp, "MMM d")}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-[18px] font-bold text-gray-900 leading-tight">
                  {expandedCard.title}
                </h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  {expandedCard.preview}
                </p>
              </div>

              {expandedCard.tags && expandedCard.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {expandedCard.tags.map((tag, i) => (
                    <span
                      key={i}
                      className={clsx(
                        'px-2.5 py-1 text-[12px] font-medium rounded-full',
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

              {expandedCard.aiSummary && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-blue-500" />
                    <span className="text-[12px] font-semibold text-blue-600 uppercase tracking-wide">AI Summary</span>
                  </div>
                  <p className="text-[13px] text-gray-700 leading-relaxed">
                    {expandedCard.aiSummary}
                  </p>
                  {expandedCard.keyDetails && expandedCard.keyDetails.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {expandedCard.keyDetails.map((detail, i) => (
                        <li key={i} className="text-[12px] text-gray-600 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                  <img
                    src={getDiceBearAvatarUrl(expandedCard.author)}
                    alt={expandedCard.author || "Anonymous"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold text-gray-900 leading-none truncate">
                    {expandedCard.author || "Anonymous"}
                  </span>
                  <span className="text-[12px] text-gray-500 mt-0.5">Customer</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 py-3 border-t border-gray-100">
                <div className="flex items-center">
                  <div className="flex items-center gap-2.5 w-[100px]">
                    <Calendar size={16} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] text-gray-500">Date</span>
                  </div>
                  <span className="text-[13px] text-gray-800 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                    {format(expandedCard.timestamp, "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center gap-2.5 w-[100px]">
                    <Phone size={16} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] text-gray-500">Phone</span>
                  </div>
                  <span className="text-[13px] text-gray-800 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                    {expandedCard.phone || "(555) 123-4567"}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center gap-2.5 w-[100px]">
                    <MapPin size={16} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] text-gray-500">Address</span>
                  </div>
                  <span className="text-[13px] text-gray-800 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                    {expandedCard.address || "123 Main St"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-blue-600 transition-colors text-sm">
                  Call Now
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm">
                  Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex flex-col bg-[#F5F3FF] rounded-[20px] overflow-hidden shadow-sm border border-gray-100">
        {(title || showSearch) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 capitalize">{title}</h2>
            {showSearch && (
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col divide-y divide-gray-100">
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex flex-col gap-3 px-5 py-4 cursor-pointer transition-colors',
                message.isActive
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'hover:bg-gray-50 border-l-4 border-l-transparent'
              )}
              onClick={() => handleItemClick(message.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-end h-12 shrink-0">
                  <DropDrawer>
                    <DropDrawerTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-400"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropDrawerTrigger>
                    <DropDrawerContent align="start" title="Actions">
                      <DropDrawerItem onClick={() => {
                        if (message.phone) onCallClick?.(message.phone);
                        onMenuAction?.(message.id, 'call');
                      }}>
                        Call Customer
                      </DropDrawerItem>
                      <DropDrawerItem onClick={() => onMenuAction?.(message.id, 'book')}>
                        Book Appointment
                      </DropDrawerItem>
                      <DropDrawerItem onClick={() => onMenuAction?.(message.id, 'snooze')}>
                        Snooze
                      </DropDrawerItem>
                      <DropDrawerSeparator />
                      <DropDrawerItem onClick={() => onMenuAction?.(message.id, 'archive')} destructive>
                        Archive
                      </DropDrawerItem>
                    </DropDrawerContent>
                  </DropDrawer>
                </div>

                <div className="relative shrink-0">
                  {message.avatar ? (
                    <img
                      src={message.avatar}
                      alt={message.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div
                      className={clsx(
                        'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm',
                        getAvatarColor(message.name)
                      )}
                    >
                      {getInitials(message.name)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-900 capitalize truncate">
                      {message.name}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 font-medium">
                        {message.date}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle?.(message.id);
                        }}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <Star
                          className={clsx(
                            'w-4 h-4 transition-colors',
                            message.isFavorite
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300 hover:text-gray-400'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {message.text}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {message.phone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCallClick?.(message.phone!);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        {message.phone}
                      </button>
                    )}
                    {message.address && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{message.address}</span>
                      </span>
                    )}
                    {message.tags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className={clsx(
                          'px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase',
                          tagColors[tag.color]
                        )}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <p>No messages</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageListCard;
