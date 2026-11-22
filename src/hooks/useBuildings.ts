'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Building } from '@/types';
import { createClient } from '@/lib/supabase/client';

export function useBuildings(collegeId?: string | null) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchBuildings = useCallback(async () => {
    if (!collegeId) {
      setBuildings([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('buildings')
      .select('*')
      .eq('college_id', collegeId)
      .order('name');
    if (queryError) {
      setBuildings([]);
      setError(queryError.message);
    } else {
      setBuildings((data || []) as Building[]);
    }
    setIsLoading(false);
  }, [collegeId, supabase]);

  useEffect(() => { void Promise.resolve().then(fetchBuildings); }, [fetchBuildings]);

  const saveBuilding = async (building: { id?: string; name: string; code?: string; floor_count: number }) => {
    if (!collegeId) return { data: null, error: 'A college workspace is required.' };
    setIsLoading(true);
    try {
      const query = building.id
        ? supabase.from('buildings').update({ name: building.name, code: building.code || null, floor_count: building.floor_count }).eq('id', building.id).eq('college_id', collegeId)
        : supabase.from('buildings').insert([{ name: building.name, code: building.code || null, floor_count: building.floor_count, college_id: collegeId, is_active: true }]);
      const { data, error: saveError } = await query.select().single();
      if (saveError) throw saveError;
      setBuildings((current) => building.id ? current.map((item) => item.id === building.id ? data as Building : item) : [...current, data as Building]);
      return { data: data as Building, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Could not add this building.' };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBuilding = async (id: string) => {
    if (!collegeId) return { error: 'A college workspace is required.' };
    const { error: deleteError } = await supabase.from('buildings').delete().eq('id', id).eq('college_id', collegeId);
    if (deleteError) return { error: deleteError.message };
    setBuildings((current) => current.filter((building) => building.id !== id));
    return { error: null };
  };

  return { buildings, isLoading, error, refreshBuildings: fetchBuildings, addBuilding: saveBuilding, updateBuilding: saveBuilding, deleteBuilding };
}
