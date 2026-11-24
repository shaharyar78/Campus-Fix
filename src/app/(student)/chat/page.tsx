'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Spinner } from '@/components/ui/Spinner';
import { useChat } from '@/hooks/useChat';
import { useUser } from '@/hooks/useUser';
import { useCollege } from '@/hooks/useCollege';
import { getClientAuthHeaders } from '@/lib/supabase/client';

function ChatContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('report');

  const { profile, isLoading: userLoading, error: userError, refreshUser } = useUser();
  const {
    colleges,
    currentCollege,
    selectedCollegeId,
    setSelectedCollegeId,
    isLoading: collegesLoading,
    error: collegesError,
    refreshColleges,
  } = useCollege(profile?.college_id);
  const isSuperAdmin = profile?.role === 'super_admin';
  const chatCollegeId = isSuperAdmin ? selectedCollegeId : profile?.college_id;

  useEffect(() => {
    if (!isSuperAdmin || !reportId) return;
    let active = true;
    void fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
      credentials: 'same-origin',
      headers: getClientAuthHeaders(),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (active && typeof result?.data?.college_id === 'string') {
          setSelectedCollegeId(result.data.college_id);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isSuperAdmin, reportId, setSelectedCollegeId]);

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    error,
    sendMessage,
    loadOlder,
    refreshMessages,
  } = useChat(reportId, chatCollegeId);

  const combinedError = userError || collegesError || error;
  const handleRetry = () => {
    if (userError) void refreshUser();
    if (collegesError) void refreshColleges();
    if (!userError && !collegesError) void refreshMessages();
  };

  const handleSendMessage = async (text: string) => {
    return await sendMessage(text, profile?.id);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[20rem] max-h-[54rem] max-w-4xl flex-col px-4 py-6 sm:min-h-[24rem] sm:px-6 lg:h-[78vh]">
      <Card className="!m-0 flex min-h-0 flex-1 flex-col overflow-hidden !p-0">
        <CardHeader className="!mb-0 !space-y-0 flex shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {reportId
                  ? `Ticket Discussion (${reportId.slice(0, 8)}...)`
                  : `${currentCollege?.name || 'Campus'} Support`}
              </CardTitle>
              <p className="mt-0.5 text-xs text-neutral-500">
                {currentCollege?.name || 'Your campus'}
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="relative w-full sm:w-64">
              <label htmlFor="chat-campus" className="sr-only">
                Select campus for chat
              </label>
              <select
                id="chat-campus"
                value={selectedCollegeId || ''}
                onChange={(event) => setSelectedCollegeId(event.target.value)}
                disabled={colleges.length === 0}
                className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-sm font-medium text-neutral-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              >
                {colleges.length === 0 && <option value="">No active campuses</option>}
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>
                    {college.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
            </div>
          )}
        </CardHeader>

        <MessageList
          messages={messages}
          currentUserId={profile?.id}
          isLoading={userLoading || collegesLoading || isLoading}
          error={combinedError}
          onRetry={handleRetry}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadOlder={() => void loadOlder()}
        />

        {chatCollegeId ? (
          <MessageInput
            onSendMessage={handleSendMessage}
            isSending={isSending}
            placeholder="Ask a question or share maintenance details..."
          />
        ) : !userLoading && !collegesLoading ? (
          <p
            role="status"
            className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-600"
          >
            Select an active campus to open its chat.
          </p>
        ) : null}
        {combinedError && messages.length > 0 && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700"
          >
            <span>{combinedError}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="font-semibold underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function StudentChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
