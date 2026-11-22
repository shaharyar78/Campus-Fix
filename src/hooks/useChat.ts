'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage } from '@/types';
import { createClient } from '@/lib/supabase/client';

export function useChat(reportId?: string | null, collegeId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchMessages = useCallback(async () => {
    if (!collegeId) {
      setMessages([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id, full_name, email, role)')
        .order('created_at', { ascending: true });
      query = reportId ? query.eq('report_id', reportId) : query.is('report_id', null);
      if (collegeId) query = query.eq('college_id', collegeId);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setMessages((data || []) as unknown as ChatMessage[]);
    } catch (err) {
      setMessages([]);
      setError(err instanceof Error ? err.message : 'Could not load messages.');
    } finally {
      setIsLoading(false);
    }
  }, [reportId, collegeId, supabase]);

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
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert([{
          college_id: collegeId,
          report_id: reportId || null,
          sender_id: senderId,
          body: body.trim(),
        }])
        .select('*, sender:profiles!sender_id(id, full_name, email, role)')
        .single();
      if (insertError) throw insertError;
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as unknown as ChatMessage]);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send this message.';
      setError(message);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isLoading, isSending, error, sendMessage, refreshMessages: fetchMessages };
}
