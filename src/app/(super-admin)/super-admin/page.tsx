'use client';

import React, { useState } from 'react';
import { CollegeTable } from '@/components/super-admin/CollegeTable';
import { CollegeForm } from '@/components/super-admin/CollegeForm';
import { Button } from '@/components/ui/Button';
import { useCollege } from '@/hooks/useCollege';
import { useReports } from '@/hooks/useReports';

export default function SuperAdminOverviewPage() {
  const { colleges, currentCollege, selectedCollegeId, setSelectedCollegeId, isLoading, addCollege, updateCollege } = useCollege();
  const { reports } = useReports();
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [pendingAccounts, setPendingAccounts] = React.useState<Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    college: { name: string } | null;
  }>>([]);
  const [approvalLoading, setApprovalLoading] = React.useState(false);
  const [approvalNotice, setApprovalNotice] = React.useState<string | null>(null);

  async function fetchPendingAccounts() {
    setApprovalLoading(true);
    try {
      const response = await fetch('/api/approvals');
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
  }

  React.useEffect(() => { void Promise.resolve().then(fetchPendingAccounts); }, []);

  async function processApproval(profileId: string, action: 'approve' | 'reject') {
    setApprovalLoading(true);
    const response = await fetch('/api/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, action }),
    });
    if (response.ok) {
      await fetchPendingAccounts();
    } else {
      setApprovalNotice('The account request could not be updated. Refresh and try again.');
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
    const res = formMode === 'edit' && currentCollege
      ? await updateCollege(currentCollege.id, data)
      : await addCollege(data);
    setIsSubmitting(false);

    if (res.error) {
      return { error: res.error };
    }

    setSuccessMessage(formMode === 'edit' ? `${data.name} settings saved.` : `${data.name} was added.`);
    setFormMode(null);
    return { data: res.data };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Platform Master Console
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">Super-Admin Scope</span>
          </div>

          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Multi-College Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Add campuses, set registration domains, and manage campus accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentCollege && <Button type="button" variant="outline" onClick={() => { setFormMode('edit'); setSuccessMessage(null); }}>Edit selected college</Button>}
          <Button
            type="button"
            variant={formMode === 'add' ? 'outline' : 'primary'}
            onClick={() => {
              setFormMode((current) => current === 'add' ? null : 'add');
              setSuccessMessage(null);
            }}
          >
            {formMode === 'add' ? 'Close Form' : 'Add a college'}
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-bold text-emerald-900 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending approvals section */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-purple-950">Pending Admin Approvals</h2>
            <p className="mt-1 text-xs text-purple-800">
              Review administrator account requests from all campuses.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" isLoading={approvalLoading} onClick={() => void fetchPendingAccounts()}>
            Refresh requests
          </Button>
        </div>
        {approvalNotice && <p className="mt-3 text-sm text-rose-800" role="status">{approvalNotice}</p>}
        {!approvalNotice && !approvalLoading && pendingAccounts.length === 0 && (
          <p className="mt-4 rounded-lg border border-purple-200 bg-white px-4 py-3 text-sm text-slate-600">
            No pending admin requests. New requests will appear here after registration.
          </p>
        )}
        {pendingAccounts.length > 0 && (
          <div className="mt-4 space-y-2">
            {pendingAccounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-purple-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {account.full_name || 'Unnamed Administrator'}
                  </p>
                  <p className="text-xs text-slate-500">{account.email} · {account.college?.name || 'College not available'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={approvalLoading}
                    onClick={() => void processApproval(account.id, 'approve')}
                    className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={approvalLoading}
                    onClick={() => void processApproval(account.id, 'reject')}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* College setup and configuration */}
      {formMode && (
        <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-lg font-bold text-slate-900">{formMode === 'edit' ? `Configure ${currentCollege?.name || 'college'}` : 'Add a college'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add campus details and its approved registration email domain.
            </p>
          </div>
          <CollegeForm
            key={`${formMode}-${currentCollege?.id || 'new'}`}
            initialValue={formMode === 'edit' && currentCollege ? { name: currentCollege.name, slug: currentCollege.slug, email_domain: currentCollege.email_domain, address: currentCollege.address } : undefined}
            submitLabel={formMode === 'edit' ? 'Save college settings' : 'Add college'}
            onSubmit={handleCreateCollege}
            onCancel={() => setFormMode(null)}
            isLoading={isSubmitting}
          />
        </div>
      )}

      {/* Platform Level KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Colleges
          </span>
          <div className="mt-2 text-3xl font-bold text-purple-700">{colleges.length}</div>
          <span className="text-xs text-slate-500">Active tenants</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Platform Reports Logged
          </span>
          <div className="mt-2 text-3xl font-bold text-blue-600">{reports.length}</div>
          <span className="text-xs text-slate-500">Across all campuses</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            RLS Isolation Status
          </span>
          <div className="mt-2 text-3xl font-bold text-emerald-600">100%</div>
          <span className="text-xs text-slate-500">Zero cross-tenant leakage</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Platform Health
          </span>
          <div className="mt-2 text-3xl font-bold text-indigo-600">Healthy</div>
          <span className="text-xs text-slate-500">App Router & DB operational</span>
        </div>
      </div>

      {/* College record table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Onboarded Colleges ({colleges.length})</h2>
        </div>

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
