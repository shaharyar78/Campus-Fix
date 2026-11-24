'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, getClientAuthHeaders } from '@/lib/supabase/client';

export function useUpvote(
  reportId: string,
  initialCount: number = 0,
  initialHasUpvoted: boolean = false,
  userId?: string
) {
  const [upvotes, setUpvotes] = useState<number>(initialCount);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(initialHasUpvoted);
  const [isMutating, setIsMutating] = useState<boolean>(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setUpvotes(initialCount);
    });
    return () => {
      active = false;
    };
  }, [reportId, initialCount]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!reportId || !userId) {
        if (active) setHasUpvoted(initialHasUpvoted);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('report_upvotes')
          .select('report_id')
          .eq('report_id', reportId)
          .eq('user_id', userId)
          .maybeSingle();
        if (active && !error) {
          setHasUpvoted(Boolean(data));
        }
      } catch {
        if (active) setHasUpvoted(initialHasUpvoted);
      }
    })();

    return () => {
      active = false;
    };
  }, [reportId, userId, initialHasUpvoted, supabase]);

  const toggleUpvote = async () => {
    if (isMutating || !userId || !reportId) return;
    setIsMutating(true);

    const previousCount = upvotes;
    const previousState = hasUpvoted;

    // Optimistic UI update
    if (hasUpvoted) {
      setUpvotes((c) => Math.max(0, c - 1));
      setHasUpvoted(false);
    } else {
      setUpvotes((c) => c + 1);
      setHasUpvoted(true);
    }

    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/upvote`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.data) {
        throw new Error(result.error?.message || 'Could not update vote');
      }
      if (typeof result.data.upvote_count === 'number') {
        setUpvotes(result.data.upvote_count);
      }
      if (typeof result.data.has_upvoted === 'boolean') {
        setHasUpvoted(result.data.has_upvoted);
      }
    } catch {
      // Revert if error
      setUpvotes(previousCount);
      setHasUpvoted(previousState);
    } finally {
      setIsMutating(false);
    }
  };

  return {
    upvotes,
    hasUpvoted,
    isMutating,
    toggleUpvote,
  };
}
