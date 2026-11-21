'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { BuildingFloorSelect } from './BuildingFloorSelect';
import { PhotoUpload } from './PhotoUpload';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { KCC_BLOCKS, REPORT_CATEGORIES, SituationLevel } from '@/lib/constants';
import { validateReportInput } from '@/lib/validators';
import { findPotentialDuplicates } from '@/lib/deduplication';
import { useReports } from '@/hooks/useReports';
import { useCollege } from '@/hooks/useCollege';
import { useBuildings } from '@/hooks/useBuildings';
import { useUser } from '@/hooks/useUser';
import { Report, ReportCategory } from '@/types';

export const ReportForm: React.FC = () => {
  const router = useRouter();
  const { profile } = useUser();
  const { currentCollege } = useCollege(profile?.college_id);
  const { reports, createReport } = useReports(profile?.college_id);
  const { buildings } = useBuildings(profile?.college_id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electrical' as ReportCategory,
    building_id: '',
    building_label: '',
    floor: '',
    room: '',
    section: '',
    situation: 'normal' as SituationLevel,
    photo_paths: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate warning modal state
  const [duplicateMatches, setDuplicateMatches] = useState<Report[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [bypassedDuplicates, setBypassedDuplicates] = useState(false);
  const usesCustomBuilding = !!currentCollege && currentCollege.slug !== 'kcc' && buildings.length === 0;

  const handleSubmit = async (e?: React.FormEvent, forceSubmit: boolean = false) => {
    if (e) e.preventDefault();
    setGeneralError(null);

    const validation = validateReportInput(formData);
    const isKccBlock = currentCollege?.slug === 'kcc' && (KCC_BLOCKS.some((block) => block.id === formData.building_id) || buildings.some((building) =>
      building.id === formData.building_id && (
        building.code?.toLowerCase().startsWith('kcc-') || building.name.toLowerCase().includes('kcc block')
      )
    ));
    const fieldErrors = { ...validation.errors };
    if (usesCustomBuilding) {
      if (formData.building_label.trim().length < 2) fieldErrors.building_label = 'Enter a building name.';
    } else if (!formData.building_id) {
      fieldErrors.building_id = 'Select a building.';
    }
    if (!formData.floor) fieldErrors.floor = 'Select a floor.';
    if (isKccBlock && !formData.section) fieldErrors.section = 'Select a section.';
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    // Check for duplicates unless user explicitly bypassed
    if (!forceSubmit && !bypassedDuplicates) {
      const matchResult = findPotentialDuplicates(formData, reports);
      if (matchResult.isDuplicate && matchResult.matches.length > 0) {
        setDuplicateMatches(matchResult.matches);
        setShowDuplicateModal(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedBuilding = buildings.find((building) => building.id === formData.building_id);
      const kccBlock = KCC_BLOCKS.find((block) => block.id === formData.building_id);
      const matchedKccBuilding = buildings.find((building) =>
        building.code?.toLowerCase() === kccBlock?.code.toLowerCase() ||
        building.name.trim().toLowerCase() === kccBlock?.name.toLowerCase()
      );
      const { data, error } = await createReport(
        {
          ...formData,
          building_id: selectedBuilding?.id || matchedKccBuilding?.id || null,
          building_label: selectedBuilding?.name || matchedKccBuilding?.name || kccBlock?.name || (usesCustomBuilding ? formData.building_label.trim() : null),
        },
        profile?.id,
        profile?.college_id || undefined,
        currentCollege?.slug || 'kcc'
      );

      if (error || !data) {
        setGeneralError(error || 'Failed to submit report. Please try again.');
        return;
      }

      // Redirect to tracking page
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
      const response = await fetch(`/api/reports/${existing.id}/upvote`, { method: 'POST' });
      if (!response.ok) { setGeneralError('Could not upvote this report. Please sign in and try again.'); return; }
      setShowDuplicateModal(false);
      router.push(`/track/${existing.tracking_id}`);
    }
  };

  const handleBypassSubmit = () => {
    setBypassedDuplicates(true);
    handleSubmit(undefined, true);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {generalError && (
          <div
            className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center gap-2"
            role="alert"
          >
            <svg className="w-5 h-5 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        {/* Issue Title */}
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

        {/* Category Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Issue Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {REPORT_CATEGORIES.map((cat) => {
              const isSelected = formData.category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold">{cat.label}</span>
                  <span className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {cat.description}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="text-xs text-rose-600 mt-1">{errors.category}</p>
          )}
        </div>

        {/* Campus Location Building & Floor */}
        <BuildingFloorSelect
          buildings={buildings}
          buildingId={formData.building_id}
          buildingLabel={formData.building_label}
          floor={formData.floor}
          room={formData.room}
          section={formData.section}
          collegeSlug={currentCollege?.slug}
          sectionError={errors.section}
          onBuildingChange={(building_id) => setFormData({ ...formData, building_id, building_label: '', section: '' })}
          onBuildingLabelChange={(building_label) => setFormData({ ...formData, building_label, building_id: '' })}
          onFloorChange={(floor) => setFormData({ ...formData, floor })}
          onRoomChange={(room) => setFormData({ ...formData, room })}
          onSectionChange={(section) => setFormData({ ...formData, section })}
          error={usesCustomBuilding ? errors.building_label : errors.building_id}
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

        {/* Detailed Description */}
        <Textarea
          label="Detailed Description"
          placeholder="Describe the issue in detail. When did it start? Is it a safety hazard? Any special details?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          error={errors.description}
          helperText="Provide at least 10 characters to help staff resolve the problem."
          rows={4}
          required
          disabled={isSubmitting}
        />

        {/* Photos Upload */}
        <PhotoUpload
          photos={formData.photo_paths}
          onChange={(photo_paths) => setFormData({ ...formData, photo_paths })}
          disabled={isSubmitting}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="min-w-36"
          >
            Submit Maintenance Report
          </Button>
        </div>
      </form>

      {/* Duplicate Warning Modal */}
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
