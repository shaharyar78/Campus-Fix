'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUpvote(reportId: string, initialCount: number = 0, initialHasUpvoted: boolean = false, userId?: string) {
  const [upvotes, setUpvotes] = useState<number>(initialCount);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(initialHasUpvoted);
  const [isMutating, setIsMutating] = useState<boolean>(false);

  const supabase = createClient();

  const toggleUpvote = async () => {
    if (isMutating || !userId) return;
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
      const result = previousState
        ? await supabase.from('report_upvotes').delete().match({ report_id: reportId, user_id: userId })
        : await supabase.from('report_upvotes').insert([{ report_id: reportId, user_id: userId }]);
      if (result.error) throw result.error;
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
