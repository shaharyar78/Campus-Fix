'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Spinner } from '@/components/ui/Spinner';
import { useChat } from '@/hooks/useChat';
import { useUser } from '@/hooks/useUser';
import { useCollege } from '@/hooks/useCollege';

function ChatContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('report');

  const { profile } = useUser();
  const { colleges, currentCollege, selectedCollegeId, setSelectedCollegeId } = useCollege(profile?.college_id);
  const isSuperAdmin = profile?.role === 'super_admin';
  const chatCollegeId = isSuperAdmin ? selectedCollegeId : profile?.college_id;

  useEffect(() => {
    if (!isSuperAdmin || !reportId) return;
    let active = true;
    void fetch(`/api/reports/${encodeURIComponent(reportId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && typeof result?.data?.college_id === 'string') setSelectedCollegeId(result.data.college_id);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [isSuperAdmin, reportId, setSelectedCollegeId]);

  const { messages, isLoading, isSending, error, sendMessage } = useChat(
    reportId,
    chatCollegeId
  );

  const handleSendMessage = async (text: string) => {
    return await sendMessage(text, profile?.id);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[20rem] max-h-[54rem] max-w-4xl flex-col px-4 py-4 sm:min-h-[24rem] sm:px-6 sm:py-6 lg:h-[75vh] lg:px-8">
      <Card className="!m-0 flex min-h-0 flex-1 flex-col overflow-hidden !p-0 shadow-xl">
        {/* Chat Header */}
        <CardHeader className="!mb-0 !space-y-0 shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">
                  {reportId ? `Ticket Discussion (${reportId.slice(0, 8)}...)` : `${currentCollege?.name || 'Campus'} Support`}
                  </CardTitle>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentCollege?.name || 'Your campus'}
              </p>
            </div>
          </div>
          {isSuperAdmin && (
            <div className="w-full sm:w-64">
              <label htmlFor="chat-campus" className="sr-only">Select campus for chat</label>
              <select
                id="chat-campus"
                value={selectedCollegeId || ''}
                onChange={(event) => setSelectedCollegeId(event.target.value)}
                disabled={colleges.length === 0}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {colleges.length === 0 && <option value="">No active campuses</option>}
                {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
              </select>
            </div>
          )}
        </CardHeader>

        {/* Message Stream */}
        <MessageList messages={messages} currentUserId={profile?.id} isLoading={isLoading} />

        {/* Message Input Box */}
        {chatCollegeId ? (
          <MessageInput onSendMessage={handleSendMessage} isSending={isSending} placeholder="Ask a question or provide maintenance details..." />
        ) : (
          <p role="status" className="border-t border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-600">Select an active campus to open its chat.</p>
        )}
        {error && <p role="alert" className="border-t border-rose-200 bg-rose-50/80 px-4 py-2 text-xs text-rose-700">{error}</p>}
      </Card>
    </div>
  );
}

export default function StudentChatPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
