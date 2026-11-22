'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { College } from '@/types';
import { createClient, getClientAuthHeaders } from '@/lib/supabase/client';

type CollegeInput = { name: string; slug: string; email_domain?: string; address?: string };

export function useCollege(initialCollegeId?: string | null) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(initialCollegeId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchColleges = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('colleges')
        .select('*')
        .order('name');

      if (queryError) throw queryError;

      const activeColleges = ((data || []) as College[]).filter((college) => college.is_active);
      setColleges(activeColleges);
      setSelectedCollegeId((current) => {
        const preferredId = initialCollegeId || current;
        return preferredId && activeColleges.some((college) => college.id === preferredId)
          ? preferredId
          : activeColleges[0]?.id || null;
      });
    } catch (err) {
      setColleges([]);
      setSelectedCollegeId(null);
      setError(err instanceof Error ? err.message : 'Could not load colleges from the database.');
    } finally {
      setIsLoading(false);
    }
  }, [initialCollegeId, supabase]);

  useEffect(() => {
    void Promise.resolve().then(fetchColleges);
  }, [fetchColleges]);

  const addCollege = async (input: CollegeInput) => {
    try {
      const response = await fetch('/api/colleges', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) return { data: null, error: result.error?.message || 'Could not add this college.' };
      const college = result.data as College;
      setColleges((current) => [...current.filter((item) => item.id !== college.id), college].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCollegeId(college.id);
      return { data: college, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Could not add this college.' };
    }
  };

  const updateCollege = async (id: string, input: CollegeInput) => {
    try {
      const response = await fetch('/api/colleges', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({ id, ...input }),
      });
      const result = await response.json();
      if (!response.ok) return { data: null, error: result.error?.message || 'Could not update this college.' };
      const college = result.data as College;
      setColleges((current) => current.map((item) => item.id === college.id ? college : item).sort((a, b) => a.name.localeCompare(b.name)));
      return { data: college, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Could not update this college.' };
    }
  };

  const currentCollege = colleges.find((college) => college.id === selectedCollegeId) || colleges[0] || null;

  return {
    colleges,
    currentCollege,
    selectedCollegeId,
    setSelectedCollegeId,
    isLoading,
    error,
    refreshColleges: fetchColleges,
    addCollege,
    updateCollege,
  };
}
