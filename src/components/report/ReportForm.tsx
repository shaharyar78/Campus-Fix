'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { BuildingFloorSelect } from './BuildingFloorSelect';
import { PhotoUpload } from './PhotoUpload';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { REPORT_CATEGORIES, SituationLevel } from '@/lib/constants';
import { validateReportInput } from '@/lib/validators';
import { findPotentialDuplicates } from '@/lib/deduplication';
import { useReports } from '@/hooks/useReports';
import { useCollege } from '@/hooks/useCollege';
import { useBuildings } from '@/hooks/useBuildings';
import { useUser } from '@/hooks/useUser';
import { getClientAuthHeaders } from '@/lib/supabase/client';
import { Report, ReportCategory } from '@/types';

export const ReportForm: React.FC = () => {
  const router = useRouter();
  const { profile, error: userError, refreshUser } = useUser();
  const {
    colleges,
    currentCollege,
    selectedCollegeId,
    setSelectedCollegeId,
    error: collegesError,
    refreshColleges,
  } = useCollege(profile?.college_id);
  const effectiveCollegeId = profile?.college_id || currentCollege?.id || colleges[0]?.id || selectedCollegeId;
  const { reports, createReport } = useReports(effectiveCollegeId, {
    enabled: Boolean(effectiveCollegeId),
  });
  const {
    buildings,
    isLoading: buildingsLoading,
    error: buildingsError,
    refreshBuildings,
  } = useBuildings(effectiveCollegeId);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electrical' as ReportCategory,
    building_id: '',
    floor: '',
    room: '',
    section: '',
    situation: 'normal' as SituationLevel,
    photo_paths: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [duplicateMatches, setDuplicateMatches] = useState<Report[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [bypassedDuplicates, setBypassedDuplicates] = useState(false);

  const focusFirstInvalidField = (fieldErrors: Record<string, string>) => {
    const order: Array<[string, string]> = [
      ['title', 'issue-summary-title'],
      ['building_id', 'building'],
      ['floor', 'floor-level'],
      ['section', 'section'],
      ['description', 'detailed-description'],
    ];
    for (const [key, elementId] of order) {
      if (fieldErrors[key]) {
        document.getElementById(elementId)?.focus();
        break;
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent, forceSubmit: boolean = false) => {
    if (e) e.preventDefault();
    setGeneralError(null);

    const validation = validateReportInput({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      building_id: formData.building_id,
      building_label: formData.building_id,
    });

    const selectedBuilding = buildings.find((b) => b.id === formData.building_id);
    const isKcc = currentCollege?.slug === 'kcc';
    const fieldErrors = { ...validation.errors };

    if (!formData.building_id) {
      fieldErrors.building_id = 'Select a building.';
    }
    if (!formData.floor) {
      fieldErrors.floor = 'Select a floor.';
    }
    if (isKcc && selectedBuilding && !formData.section) {
      fieldErrors.section = 'Select a section.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors);
      return;
    }
    setErrors({});

    if (!forceSubmit && !bypassedDuplicates) {
      const matchResult = findPotentialDuplicates(
        {
          ...formData,
          building_label: selectedBuilding?.name || formData.building_id,
        },
        reports
      );
      if (matchResult.isDuplicate && matchResult.matches.length > 0) {
        setDuplicateMatches(matchResult.matches);
        setShowDuplicateModal(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const buildingName = selectedBuilding ? selectedBuilding.name : formData.building_id;

      const { data, error } = await createReport(
        {
          ...formData,
          building_id: selectedBuilding ? selectedBuilding.id : null,
          building_label: buildingName,
          force: forceSubmit || bypassedDuplicates,
        },
        profile?.id,
        effectiveCollegeId || undefined
      );

      if (error || !data) {
        setGeneralError(error || 'Failed to submit report. Please try again.');
        return;
      }

      router.push(`/track/${data.tracking_id}`);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
      setShowDuplicateModal(false);
    }
  };

  const handleUpvoteExisting = async (reportId: string) => {
    const existing = reports.find((r) => r.id === reportId);
    if (existing) {
      const response = await fetch(`/api/reports/${existing.id}/upvote`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      setShowDuplicateModal(false);
      if (!response.ok) {
        setGeneralError('Could not upvote this report. Please sign in and try again.');
        return;
      }
      router.push(`/track/${existing.tracking_id}`);
    }
  };

  const handleBypassSubmit = () => {
    setBypassedDuplicates(true);
    handleSubmit(undefined, true);
  };

  const loadError = userError || collegesError || buildingsError;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {loadError && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
            role="alert"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (userError) void refreshUser();
                if (collegesError) void refreshColleges();
                if (buildingsError) void refreshBuildings();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {generalError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{generalError}</span>
          </div>
        )}

        {(!profile?.college_id || profile?.role === 'super_admin') && colleges.length > 1 && (
          <div className="space-y-1.5">
            <label htmlFor="report-college-select" className="block text-sm font-medium text-neutral-700">
              Campus / College <span className="text-rose-500">*</span>
            </label>
            <select
              id="report-college-select"
              value={effectiveCollegeId || ''}
              onChange={(e) => {
                setSelectedCollegeId(e.target.value);
                setFormData({ ...formData, building_id: '', floor: '', section: '' });
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 transition-colors focus:border-blue-600 focus:outline-none"
            >
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Issue Summary / Title"
          placeholder="e.g. Water leak in 2nd floor boys washroom"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          error={errors.title}
          helperText="Be specific. 3 to 160 characters."
          required
          disabled={isSubmitting}
        />

        <div className="space-y-2">
          <span id="issue-category-label" className="block text-sm font-medium text-neutral-700">
            Issue Category <span className="text-rose-500">*</span>
          </span>
          <div
            role="radiogroup"
            aria-labelledby="issue-category-label"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          >
            {REPORT_CATEGORIES.map((cat) => {
              const isSelected = formData.category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isSubmitting}
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 text-neutral-950 ring-1 ring-blue-600'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-xs font-semibold">{cat.label}</span>
                  <span className="mt-1 line-clamp-1 text-[11px] text-neutral-500">
                    {cat.description}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.category && <p className="mt-1 text-xs text-rose-600" role="alert">{errors.category}</p>}
        </div>

        <BuildingFloorSelect
          buildings={buildings}
          buildingId={formData.building_id}
          floor={formData.floor}
          room={formData.room}
          section={formData.section}
          collegeSlug={currentCollege?.slug}
          isBuildingsLoading={buildingsLoading}
          sectionError={errors.section}
          onBuildingChange={(building_id) => {
            setFormData({ ...formData, building_id, section: '' });
          }}
          onFloorChange={(floor) => setFormData({ ...formData, floor })}
          onRoomChange={(room) => setFormData({ ...formData, room })}
          onSectionChange={(section) => setFormData({ ...formData, section })}
          error={errors.building_id}
          floorError={errors.floor}
          disabled={isSubmitting}
        />

        <Select
          label="Situation level"
          value={formData.situation}
          onChange={(e) => setFormData({ ...formData, situation: e.target.value as SituationLevel })}
          required
          disabled={isSubmitting}
        >
          <option value="normal">Normal</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>

        <Textarea
          label="Detailed Description"
          placeholder="Describe the issue in detail. When did it start? Is it a safety hazard?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          error={errors.description}
          helperText="Provide at least 10 characters to help staff resolve the problem."
          rows={4}
          required
          disabled={isSubmitting}
        />

        <PhotoUpload
          photos={formData.photo_paths}
          collegeId={effectiveCollegeId}
          onChange={(photo_paths) => setFormData({ ...formData, photo_paths })}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-5">
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Maintenance Report
          </Button>
        </div>
      </form>

      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        matches={duplicateMatches}
        onUpvoteExisting={handleUpvoteExisting}
        onSubmitAnyway={handleBypassSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
};
