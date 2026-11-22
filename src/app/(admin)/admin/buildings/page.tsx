'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Pencil, Plus, Trash2, X } from 'lucide-react';
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
  const { buildings, isLoading, addBuilding, updateBuilding, deleteBuilding } = useBuildings(
    profile?.college_id
  );

  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<(typeof buildings)[number] | null>(null);
  const [deletingBuilding, setDeletingBuilding] = useState<(typeof buildings)[number] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateBuilding = async (data: {
    name: string;
    code?: string;
    floor_count: number;
  }) => {
    setErrorMessage(null);
    const res = await addBuilding(data);
    if (!res.error) {
      setSuccessMessage(`Building "${data.name}" added successfully.`);
      setIsAdding(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
    return res;
  };

  const handleConfirmDelete = async () => {
    if (!deletingBuilding) return;
    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const targetName = deletingBuilding.name;
    const result = await deleteBuilding(deletingBuilding.id);
    setIsDeleting(false);
    setDeletingBuilding(null);
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setSuccessMessage(`Building "${targetName}" deleted successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Reports Triage</span>
        </Link>

        <span className="font-mono text-xs text-neutral-500">
          {currentCollege?.name || 'Your campus'}
        </span>
      </div>

      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Campus Buildings & Blocks
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage physical facilities, hostel blocks, and academic buildings available for reporting.
          </p>
        </div>

        <Button
          variant={isAdding ? 'outline' : 'primary'}
          onClick={() => setIsAdding(!isAdding)}
          leftIcon={isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        >
          {isAdding ? 'Close Form' : 'Add Building'}
        </Button>
      </div>

      {errorMessage && (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-medium text-rose-900 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      {isAdding && (
        <Card>
          <CardHeader className="border-b border-neutral-200 pb-4">
            <CardTitle className="text-lg font-semibold">Register Campus Building</CardTitle>
            <CardDescription>
              New buildings immediately appear in the student report location selector.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <BuildingForm onSubmit={handleCreateBuilding} onCancel={() => setIsAdding(false)} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="font-medium text-neutral-800 tabular-nums">
            Registered Campus Buildings ({buildings.length})
          </span>
          <span>Campus-scoped directory</span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2" aria-label="Loading buildings">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        ) : buildings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <h4 className="font-display text-base font-semibold text-neutral-950">
              No buildings registered yet
            </h4>
            <p className="mt-1 text-xs text-neutral-500">
              Add your first academic block or hostel using the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {buildings.map((building) => (
              <div
                key={building.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 font-mono text-xs font-semibold text-neutral-700">
                    {building.code || 'BLD'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-semibold text-neutral-950">
                      {building.name}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-600 tabular-nums">
                      {building.floor_count} floors
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                      {building.code && (
                        <>
                          <span className="font-mono text-[11px] text-neutral-600">
                            {building.code}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>Added {formatDate(building.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={building.is_active ? 'success' : 'default'} size="sm">
                    {building.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <button
                    type="button"
                    aria-label={`Edit ${building.name}`}
                    className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                    onClick={() => setEditing(building)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${building.name}`}
                    className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setDeletingBuilding(building)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Building"
        description="Update building name, code, and floor count."
      >
        <BuildingForm
          key={editing?.id || 'empty'}
          initialValue={editing || undefined}
          submitLabel="Save Changes"
          onCancel={() => setEditing(null)}
          onSubmit={async (data) => {
            if (!editing) return;
            const result = await updateBuilding({ ...data, id: editing.id });
            if (!result.error) {
              setEditing(null);
              setSuccessMessage('Building updated.');
              setTimeout(() => setSuccessMessage(null), 4000);
            }
            return result;
          }}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deletingBuilding)}
        onClose={() => {
          if (!isDeleting) setDeletingBuilding(null);
        }}
        title="Delete Building"
        description={
          deletingBuilding ? `Remove "${deletingBuilding.name}" from campus buildings?` : undefined
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Reports already linked to this building may prevent deletion. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeletingBuilding(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={() => void handleConfirmDelete()}
            >
              Delete Building
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
