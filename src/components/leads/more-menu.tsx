'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Archive, StickyNote, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoreMenuProps {
  onArchive: () => void;
  onAddNote: () => void;
  onMarkSpam: () => void;
  className?: string;
}

export function MoreMenu({ onArchive, onAddNote, onMarkSpam, className }: MoreMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("w-14 h-12 rounded-none text-gray-400 hover:bg-gray-50", className)}
          aria-label="More actions"
        >
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onArchive} className="cursor-pointer">
          <Archive className="w-4 h-4 mr-2" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddNote} className="cursor-pointer">
          <StickyNote className="w-4 h-4 mr-2" />
          Add Note
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onMarkSpam}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <Ban className="w-4 h-4 mr-2" />
          Mark Spam
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
