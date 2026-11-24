'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MessageInputProps {
  onSendMessage: (body: string) => Promise<boolean | void>;
  isSending?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isSending = false,
  placeholder = 'Type your message here...',
}) => {
  const [text, setText] = useState('');

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSending) return;

    const sent = await onSendMessage(text);
    if (sent !== false) setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <form
      onSubmit={handleSend}
      className="flex items-end gap-2.5 border-t border-neutral-200 bg-white p-3.5"
    >
      <div className="relative flex-1">
        <label htmlFor="chat-message-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-message-input"
          rows={1}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="block max-h-32 w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={isSending}
        disabled={!text.trim()}
        leftIcon={<Send className="h-3.5 w-3.5" />}
        className="shrink-0"
        aria-label="Send message"
      >
        Send
      </Button>
    </form>
  );
};
