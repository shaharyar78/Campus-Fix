'use client';

import React, { useEffect, useRef } from 'react';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { ChatMessage } from '@/types';
import { MessageBubble } from './MessageBubble';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadOlder?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  error = null,
  onRetry,
  hasMore = false,
  isLoadingMore = false,
  onLoadOlder,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
        <Spinner size="md" />
        <p className="mt-2 text-xs text-neutral-500">Loading conversation history...</p>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center" role="alert">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h4 className="font-display text-sm font-semibold text-neutral-900">Unable to load messages</h4>
        <p className="mt-1 max-w-xs text-xs text-neutral-500">{error}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-4">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400">
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </div>
        <h4 className="font-display text-sm font-semibold text-neutral-900">No messages yet</h4>
        <p className="mt-1 max-w-xs text-xs text-neutral-500">
          Start the conversation by posting a question or maintenance update below.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/70 p-4 sm:p-6">
      {hasMore && onLoadOlder && (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={onLoadOlder}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading older messages...' : 'Load older messages'}
          </button>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} isSelf={msg.sender_id === currentUserId} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
