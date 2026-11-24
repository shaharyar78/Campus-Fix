'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreateReportInput, Report, ReportFilterOptions, ReportStatus } from '@/types';
import { getClientAuthHeaders } from '@/lib/supabase/client';

const DEFAULT_PAGE_SIZE = 20;

export function useReports(
  collegeId?: string | null,
  filters?: ReportFilterOptions
) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(filters?.enabled !== false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submitterId = filters?.submitter_id;
  const statusFilter = filters?.status;
  const categoryFilter = filters?.category;
  const buildingFilter = filters?.building_id;
  const searchFilter = filters?.search;
  const enabled = filters?.enabled !== false;

  const buildQueryString = useCallback(
    (offset: number, limit = DEFAULT_PAGE_SIZE) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (collegeId) params.set('college_id', collegeId);
      if (submitterId) params.set('submitter_id', submitterId);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (buildingFilter && buildingFilter !== 'all') params.set('building_id', buildingFilter);
      if (searchFilter?.trim()) params.set('search', searchFilter.trim());
      return params.toString();
    },
    [collegeId, submitterId, statusFilter, categoryFilter, buildingFilter, searchFilter]
  );

  const fetchReports = useCallback(async () => {
    if (!enabled) {
      setReports([]);
      setHasMore(false);
      setTotal(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports?${buildQueryString(0)}`, {
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error?.message || 'Could not load reports.');
      }
      const rows = (result.data || []) as Report[];
      setReports(rows);
      setHasMore(Boolean(result.pagination?.hasMore));
      setTotal(typeof result.pagination?.total === 'number' ? result.pagination.total : rows.length);
    } catch (err) {
      setReports([]);
      setHasMore(false);
      setTotal(0);
      setError(err instanceof Error ? err.message : 'Could not load reports.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, buildQueryString]);

  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/reports?${buildQueryString(reports.length)}`, {
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error?.message || 'Could not load more reports.');
      }
      const nextRows = (result.data || []) as Report[];
      setReports((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const uniqueNext = nextRows.filter((item) => !existingIds.has(item.id));
        return [...current, ...uniqueNext];
      });
      setHasMore(Boolean(result.pagination?.hasMore));
      if (typeof result.pagination?.total === 'number') {
        setTotal(result.pagination.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more reports.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [enabled, hasMore, isLoadingMore, buildQueryString, reports.length]);

  useEffect(() => {
    void Promise.resolve().then(fetchReports);
  }, [fetchReports]);

  const createReport = async (
    input: CreateReportInput,
    submitterIdArg?: string,
    targetCollegeId?: string
  ) => {
    if (!submitterIdArg || !targetCollegeId) {
      return { data: null, error: 'Sign in with an approved college account before submitting.' };
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({
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
          force: Boolean(input.force),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.data) {
        return { data: null, error: result.error?.message || 'Could not save the report.' };
      }

      const report = result.data as Report;
      setReports((current) => [report, ...current]);
      setTotal((current) => current + 1);
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
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({ status, message: note?.trim() || `Status changed to ${status}.` }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Could not update this report.');
      const updatedAt = new Date().toISOString();
      const resolvedPatch =
        status === 'resolved'
          ? { resolved_at: updatedAt }
          : status !== 'closed'
            ? { resolved_at: null }
            : {};
      setReports((current) =>
        current.map((report) =>
          report.id === reportId ? { ...report, status, updated_at: updatedAt, ...resolvedPatch } : report
        )
      );
      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Could not update this report.' };
    }
  };

  return {
    reports,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    error,
    refreshReports: fetchReports,
    loadMore,
    createReport,
    updateReportStatus,
  };
}
