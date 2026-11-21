'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BuildingForm } from '@/components/admin/BuildingForm';
import { useBuildings } from '@/hooks/useBuildings';
import { useUser } from '@/hooks/useUser';
import { useCollege } from '@/hooks/useCollege';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

export default function BuildingManagementPage() {
  const { profile } = useUser();
  const { currentCollege } = useCollege(profile?.college_id);
  const { buildings, isLoading, addBuilding, updateBuilding, deleteBuilding } = useBuildings(profile?.college_id);

  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<(typeof buildings)[number] | null>(null);

  const handleCreateBuilding = async (data: { name: string; code?: string; floor_count: number }) => {
    const res = await addBuilding(data);
    if (!res.error) {
      setSuccessMessage(`Building "${data.name}" added successfully.`);
      setIsAdding(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
    return res;
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this building? Reports already linked to it may prevent deletion.')) return;
    const result = await deleteBuilding(id);
    if (result.error) setSuccessMessage(result.error);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports Triage
        </Link>

        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
          {currentCollege?.name || 'Your campus'}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Buildings & Blocks
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage physical campus facilities, hostel blocks, and academic buildings available for student reporting.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAdding(!isAdding)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          {isAdding ? 'Close Form' : 'Add New Building'}
        </Button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add Building Form Drawer / Card */}
      {isAdding && (
        <Card className="border-blue-200 bg-blue-50/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Register Campus Building</CardTitle>
            <CardDescription>
              New buildings will immediately appear in the student report location dropdown.
            </CardDescription>
          </CardHeader>
          <CardContent>
              <BuildingForm
              onSubmit={handleCreateBuilding}
              onCancel={() => setIsAdding(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Buildings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Registered Campus Buildings ({buildings.length})</span>
          <span>College Tenant Scope Verified</span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2" aria-label="Loading buildings">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div>
        ) : buildings.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
            <h4 className="text-base font-semibold text-slate-900">No buildings registered yet</h4>
            <p className="text-xs text-slate-500 mt-1">
              Add your first academic block or hostel using the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buildings.map((building) => (
              <div
                key={building.id}
                className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 font-bold text-sm">
                    {building.code || 'BLD'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{building.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">{building.floor_count} floors</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      {building.code && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          Code: {building.code}
                        </span>
                      )}
                      <span>Added {formatDate(building.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2"><Badge variant={building.is_active ? 'success' : 'default'} size="sm">{building.is_active ? 'Active' : 'Inactive'}</Badge><button className="text-xs font-semibold text-orange-700" onClick={() => setEditing(building)}>Edit</button><button className="text-xs font-semibold text-rose-700" onClick={() => void handleDelete(building.id)}>Delete</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Building" description="Update building name, code, and floor count."><BuildingForm key={editing?.id || 'empty'} initialValue={editing || undefined} submitLabel="Save Changes" onCancel={() => setEditing(null)} onSubmit={async (data) => { if (!editing) return; const result = await updateBuilding({ ...data, id: editing.id }); if (!result.error) { setEditing(null); setSuccessMessage('Building updated.'); } return result; }} /></Modal>
    </div>
  );
}
