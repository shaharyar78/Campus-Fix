'use client';

import React, { useState } from 'react';
import { Building2, Clock, FileText, Pencil, Plus, RefreshCw, UserCheck, X } from 'lucide-react';
import { CollegeTable } from '@/components/super-admin/CollegeTable';
import { CollegeForm } from '@/components/super-admin/CollegeForm';
import { Button } from '@/components/ui/Button';
import { useCollege } from '@/hooks/useCollege';
import { useReports } from '@/hooks/useReports';
import { useUser } from '@/hooks/useUser';
import { getClientAuthHeaders } from '@/lib/supabase/client';

export default function SuperAdminOverviewPage() {
  const { profile } = useUser();
  const {
    colleges,
    currentCollege,
    selectedCollegeId,
    setSelectedCollegeId,
    isLoading,
    error: collegesError,
    refreshColleges,
    addCollege,
    updateCollege,
  } = useCollege();
  const { reports, error: reportsError, refreshReports } = useReports();
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [pendingAccounts, setPendingAccounts] = React.useState<
    Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      college: { name: string } | null;
    }>
  >([]);
  const [approvalLoading, setApprovalLoading] = React.useState(false);
  const [approvalNotice, setApprovalNotice] = React.useState<string | null>(null);

  const fetchPendingAccounts = React.useCallback(async () => {
    setApprovalLoading(true);
    try {
      const response = await fetch('/api/approvals', {
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      if (response.status === 401) {
        setPendingAccounts([]);
        setApprovalNotice('Sign in with an approved super-admin account to load requests.');
        return;
      }
      if (response.status === 403) {
        setPendingAccounts([]);
        setApprovalNotice('Only super-admins can review administrator requests.');
        return;
      }
      if (!response.ok) throw new Error('Could not load approval requests.');
      const json = await response.json();
      setPendingAccounts(json.data || []);
      setApprovalNotice(null);
    } catch {
      setApprovalNotice('Could not load approval requests. Try refreshing.');
    } finally {
      setApprovalLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(fetchPendingAccounts);
  }, [fetchPendingAccounts, profile?.id]);

  async function processApproval(profileId: string, action: 'approve' | 'reject') {
    setApprovalLoading(true);
    try {
      const response = await fetch('/api/approvals', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({ profile_id: profileId, action }),
      });
      if (response.ok) {
        await fetchPendingAccounts();
      } else {
        setApprovalNotice('The account request could not be updated. Refresh and try again.');
      }
    } catch {
      setApprovalNotice('Unable to reach the server. Please try again.');
    } finally {
      setApprovalLoading(false);
    }
  }

  const handleCreateCollege = async (data: {
    name: string;
    slug: string;
    email_domain?: string;
    address?: string;
  }) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    const res =
      formMode === 'edit' && currentCollege
        ? await updateCollege(currentCollege.id, data)
        : await addCollege(data);
    setIsSubmitting(false);

    if (res.error) {
      return { error: res.error };
    }

    setSuccessMessage(
      formMode === 'edit' ? `${data.name} settings saved.` : `${data.name} was added.`
    );
    setFormMode(null);
    return { data: res.data };
  };

  const openTicketsCount = reports.filter(
    (r) => !['resolved', 'rejected', 'closed'].includes(r.status)
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
            Platform Console · Super-Admin Scope
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Multi-College Management
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Onboard institutions, configure registration domains, and approve campus administrators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentCollege && (
            <Button
              type="button"
              variant="outline"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => {
                setFormMode('edit');
                setSuccessMessage(null);
              }}
            >
              Edit selected college
            </Button>
          )}
          <Button
            type="button"
            variant={formMode === 'add' ? 'outline' : 'primary'}
            leftIcon={formMode === 'add' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            onClick={() => {
              setFormMode((current) => (current === 'add' ? null : 'add'));
              setSuccessMessage(null);
            }}
          >
            {formMode === 'add' ? 'Close Form' : 'Add College'}
          </Button>
        </div>
      </div>

      {successMessage && (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-900 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real Derived Platform Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Colleges</span>
            <Building2 className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-neutral-950 tabular-nums sm:text-3xl">
            {colleges.length}
          </div>
          <span className="mt-1 block text-xs text-neutral-500">Registered tenants</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Reports</span>
            <FileText className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-neutral-950 tabular-nums sm:text-3xl">
            {reports.length}
          </div>
          <span className="mt-1 block text-xs text-neutral-500">Logged across campuses</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Open Tickets</span>
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-amber-600 tabular-nums sm:text-3xl">
            {openTicketsCount}
          </div>
          <span className="mt-1 block text-xs text-neutral-500">Unresolved items</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Admins</span>
            <UserCheck className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-neutral-950 tabular-nums sm:text-3xl">
            {pendingAccounts.length}
          </div>
          <span className="mt-1 block text-xs text-neutral-500">Awaiting review</span>
        </div>
      </div>

      {/* Pending Admin Approvals */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-neutral-950">
              Pending Admin Approvals
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Review administrator account requests across all campuses.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={approvalLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => void fetchPendingAccounts()}
          >
            Refresh
          </Button>
        </div>

        {approvalNotice && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="status">
            {approvalNotice}
          </p>
        )}

        {!approvalNotice && !approvalLoading && pendingAccounts.length === 0 && (
          <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-500">
            No pending administrator requests. New registrations will appear here.
          </p>
        )}

        {pendingAccounts.length > 0 && (
          <div className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {pendingAccounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-950">
                    {account.full_name || 'Unnamed Administrator'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {account.email} · {account.college?.name || 'College not available'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={approvalLoading}
                    onClick={() => void processApproval(account.id, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={approvalLoading}
                    onClick={() => void processApproval(account.id, 'reject')}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* College setup form */}
      {formMode && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="mb-5 border-b border-neutral-200 pb-4">
            <h2 className="font-display text-lg font-semibold text-neutral-950">
              {formMode === 'edit' ? `Configure ${currentCollege?.name || 'college'}` : 'Add a college'}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Add campus details and its approved registration email domain.
            </p>
          </div>
          <CollegeForm
            key={`${formMode}-${currentCollege?.id || 'new'}`}
            initialValue={
              formMode === 'edit' && currentCollege
                ? {
                    name: currentCollege.name,
                    slug: currentCollege.slug,
                    email_domain: currentCollege.email_domain,
                    address: currentCollege.address,
                  }
                : undefined
            }
            submitLabel={formMode === 'edit' ? 'Save college settings' : 'Add college'}
            onSubmit={handleCreateCollege}
            onCancel={() => setFormMode(null)}
            isLoading={isSubmitting}
          />
        </div>
      )}

      {/* College record table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-neutral-950 tabular-nums">
            Onboarded Colleges ({colleges.length})
          </h2>
        </div>

        {(collegesError || reportsError) && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            <span>{collegesError || reportsError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (collegesError) void refreshColleges();
                if (reportsError) void refreshReports();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        <CollegeTable
          colleges={colleges}
          isLoading={isLoading}
          selectedCollegeId={selectedCollegeId}
          onSelectCollege={setSelectedCollegeId}
        />
      </div>
    </div>
  );
}
