'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreateReportInput, Report, ReportFilterOptions, ReportStatus } from '@/types';
import { generateTrackingId } from '@/lib/trackingId';
import { createClient } from '@/lib/supabase/client';

export function useReports(
  collegeId?: string | null,
  filters?: ReportFilterOptions
) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const submitterId = filters?.submitter_id;
  const statusFilter = filters?.status;
  const categoryFilter = filters?.category;
  const buildingFilter = filters?.building_id;
  const searchFilter = filters?.search;

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('reports')
        .select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)')
        .order('created_at', { ascending: false });

      if (collegeId) query = query.eq('college_id', collegeId);
      if (submitterId) query = query.eq('submitter_id', submitterId);
      if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (buildingFilter && buildingFilter !== 'all') query = query.eq('building_id', buildingFilter);
      if (searchFilter?.trim()) query = query.ilike('title', `%${searchFilter.trim()}%`);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setReports((data || []) as unknown as Report[]);
    } catch (err) {
      setReports([]);
      setError(err instanceof Error ? err.message : 'Could not load reports.');
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, submitterId, statusFilter, categoryFilter, buildingFilter, searchFilter, supabase]);

  useEffect(() => {
    void Promise.resolve().then(fetchReports);
  }, [fetchReports]);

  const createReport = async (
    input: CreateReportInput,
    submitterId?: string,
    targetCollegeId?: string,
    collegeSlug?: string
  ) => {
    if (!submitterId || !targetCollegeId) {
      return { data: null, error: 'Sign in with an approved college account before submitting.' };
    }

    setIsLoading(true);
    try {
      const trackingId = generateTrackingId(collegeSlug || 'kcc');
      const { data, error: insertError } = await supabase
        .from('reports')
        .insert([{
          title: input.title,
          description: input.description,
          category: input.category,
          building_id: input.building_id || null,
          building_label: input.building_label || null,
          floor: input.floor || null,
          room: input.room || null,
          section: input.section || null,
          situation: input.situation || 'normal',
          photo_paths: input.photo_paths || [],
          college_id: targetCollegeId,
          submitter_id: submitterId,
          tracking_id: trackingId,
          status: 'submitted',
          upvote_count: 0,
        }])
        .select('*, building:buildings(id, name, code), submitter:profiles!submitter_id(id, full_name, email)')
        .single();

      if (insertError) throw insertError;
      const report = data as unknown as Report;
      setReports((current) => [report, ...current]);
      return { data: report, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Could not save the report.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: ReportStatus, note?: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message: note?.trim() || `Status changed to ${status}.` }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Could not update this report.');
      const updatedAt = new Date().toISOString();
      setReports((current) => current.map((report) => report.id === reportId ? { ...report, status, updated_at: updatedAt, ...(status === 'resolved' ? { resolved_at: updatedAt } : {}) } : report));
      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Could not update this report.' };
    }
  };

  return { reports, isLoading, error, refreshReports: fetchReports, createReport, updateReportStatus };
}
