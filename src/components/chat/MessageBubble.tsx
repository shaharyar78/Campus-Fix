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
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} mb-4`}>
      <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">
          {isSelf ? 'You' : message.sender?.full_name || 'Campus Member'}
        </span>
        {isAdmin && (
          <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
            Staff Admin
          </span>
        )}
        <span>{formatRelativeTime(message.created_at)}</span>
      </div>

      <div
        className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
          isSelf
            ? 'bg-blue-600 text-white rounded-tr-none'
            : isAdmin
            ? 'bg-amber-50 text-slate-800 border border-amber-200 rounded-tl-none'
            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
      </div>
    </div>
  );
};
