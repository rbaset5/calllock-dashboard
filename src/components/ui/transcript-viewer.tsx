'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp, Copy, Check, User, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';
import type { TranscriptMessage } from '@/types/database';

interface TranscriptViewerProps {
  transcript: TranscriptMessage[] | null;
  className?: string;
  defaultExpanded?: boolean;
  maxCollapsedMessages?: number;
}

export function TranscriptViewer({
  transcript,
  className,
  defaultExpanded = false,
  maxCollapsedMessages = 4,
}: TranscriptViewerProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [copied, setCopied] = React.useState(false);

  if (!transcript || transcript.length === 0) {
    return null;
  }

  const displayedMessages = isExpanded
    ? transcript
    : transcript.slice(0, maxCollapsedMessages);

  const hasMore = transcript.length > maxCollapsedMessages;

  // Convert to plain text for copying
  const copyToClipboard = async () => {
    const plainText = transcript
      .map((msg) => `${msg.role === 'agent' ? 'Agent' : 'Customer'}: ${msg.content}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Call Transcript
            <span className="text-sm font-normal text-gray-500">
              ({transcript.length} messages)
            </span>
          </CardTitle>
          <button
            onClick={copyToClipboard}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="Copy transcript"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedMessages.map((message, index) => (
          <TranscriptBubble key={index} message={message} />
        ))}

        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show {transcript.length - maxCollapsedMessages} more messages
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function TranscriptBubble({ message }: { message: TranscriptMessage }) {
  const isAgent = message.role === 'agent';

  return (
    <div
      className={cn(
        'flex gap-2',
        isAgent ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isAgent ? 'bg-blue-100' : 'bg-gray-100'
        )}
      >
        {isAgent ? (
          <Bot className="w-4 h-4 text-blue-600" />
        ) : (
          <User className="w-4 h-4 text-gray-600" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isAgent
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-900 rounded-tl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

// Compact inline version for use in lists/cards
interface TranscriptPreviewProps {
  transcript: TranscriptMessage[] | null;
  maxMessages?: number;
  className?: string;
}

export function TranscriptPreview({
  transcript,
  maxMessages = 2,
  className,
}: TranscriptPreviewProps) {
  if (!transcript || transcript.length === 0) {
    return null;
  }

  const preview = transcript.slice(0, maxMessages);

  return (
    <div className={cn('space-y-1', className)}>
      {preview.map((message, index) => (
        <div key={index} className="flex items-start gap-2 text-xs">
          <span
            className={cn(
              'font-medium shrink-0',
              message.role === 'agent' ? 'text-blue-600' : 'text-gray-600'
            )}
          >
            {message.role === 'agent' ? 'Agent:' : 'Customer:'}
          </span>
          <span className="text-gray-700 line-clamp-1">{message.content}</span>
        </div>
      ))}
      {transcript.length > maxMessages && (
        <span className="text-xs text-gray-400">
          +{transcript.length - maxMessages} more messages
        </span>
      )}
    </div>
  );
}
