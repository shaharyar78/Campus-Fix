import React from 'react';
import { ChatMessage } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSelf }) => {
  const isAdmin = message.sender?.role === 'admin' || message.sender?.role === 'super_admin';

  return (
    <div className={`mb-4 flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
        <span className="font-medium text-neutral-800">
          {isSelf ? 'You' : message.sender?.full_name || 'Campus Member'}
        </span>
        {isAdmin && (
          <>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span className="font-medium text-blue-600">Staff Admin</span>
          </>
        )}
        <span aria-hidden="true" className="text-neutral-300">·</span>
        <span>{formatRelativeTime(message.created_at)}</span>
      </div>

      <div
        className={`max-w-md rounded-xl px-4 py-2.5 text-sm ${
          isSelf
            ? 'rounded-tr-xs bg-neutral-950 text-white'
            : isAdmin
              ? 'rounded-tl-xs border border-blue-200 bg-blue-50/40 text-neutral-900'
              : 'rounded-tl-xs border border-neutral-200 bg-white text-neutral-900'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
      </div>
    </div>
  );
};
