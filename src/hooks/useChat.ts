'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage } from '@/types';
import { createClient, getClientAuthHeaders } from '@/lib/supabase/client';

const CHAT_PAGE_SIZE = 20;

export function useChat(reportId?: string | null, collegeId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const buildChatQuery = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      params.set('limit', String(CHAT_PAGE_SIZE));
      params.set('offset', String(offset));
      if (collegeId) params.set('college_id', collegeId);
      if (reportId) params.set('report_id', reportId);
      return params.toString();
    },
    [collegeId, reportId]
  );

  const fetchMessages = useCallback(async () => {
    if (!collegeId) {
      setMessages([]);
      setHasMore(false);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat?${buildChatQuery(0)}`, {
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error?.message || 'Could not load messages.');
      }
      setMessages((result.data || []) as ChatMessage[]);
      setHasMore(Boolean(result.pagination?.hasMore));
    } catch (err) {
      setMessages([]);
      setHasMore(false);
      setError(err instanceof Error ? err.message : 'Could not load messages.');
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, buildChatQuery]);

  const loadOlder = useCallback(async () => {
    if (!collegeId || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/chat?${buildChatQuery(messages.length)}`, {
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error?.message || 'Could not load older messages.');
      }
      const older = (result.data || []) as ChatMessage[];
      setMessages((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const uniqueOlder = older.filter((item) => !existingIds.has(item.id));
        return [...uniqueOlder, ...current];
      });
      setHasMore(Boolean(result.pagination?.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load older messages.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [collegeId, hasMore, isLoadingMore, buildChatQuery, messages.length]);

  useEffect(() => {
    void Promise.resolve().then(fetchMessages);
    if (!collegeId) return;
    const channel = supabase
      .channel(`chat_${collegeId}_${reportId || 'general'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: reportId ? `report_id=eq.${reportId}` : `college_id=eq.${collegeId}`,
      }, (payload) => {
        setMessages((current) => current.some((item) => item.id === payload.new.id)
          ? current
          : [...current, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [collegeId, fetchMessages, reportId, supabase]);

  const sendMessage = async (body: string, senderId?: string) => {
    if (!body.trim() || isSending) return false;
    if (!senderId || !collegeId) {
      setError('Sign in with your approved college account to send a message.');
      return false;
    }

    setIsSending(true);
    setError(null);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({
          college_id: collegeId,
          report_id: reportId || null,
          body: body.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.data) {
        throw new Error(result.error?.message || 'Could not send this message.');
      }
      const saved = result.data as ChatMessage;
      setMessages((current) =>
        current.some((item) => item.id === saved.id) ? current : [...current, saved]
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send this message.';
      setError(message);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    error,
    sendMessage,
    loadOlder,
    refreshMessages: fetchMessages,
  };
}
