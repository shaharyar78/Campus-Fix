'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { MessageBubble } from './MessageBubble';
import { Spinner } from '@/components/ui/Spinner';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  isLoading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
        <Spinner size="md" />
        <p className="mt-2 text-xs text-slate-500">Loading conversation history...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No messages yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Start the conversation by posting an inquiry or issue update below.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isSelf={msg.sender_id === currentUserId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
