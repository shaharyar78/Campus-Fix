'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Building } from '@/types';
import { FLOORS, KCC_BLOCKS, KCC_SECTIONS } from '@/lib/constants';

interface BuildingFloorSelectProps {
  buildings: Building[];
  buildingId: string;
  buildingLabel: string;
  floor: string;
  room: string;
  section: string;
  collegeSlug?: string;
  onBuildingChange: (id: string) => void;
  onBuildingLabelChange: (label: string) => void;
  onFloorChange: (floor: string) => void;
  onRoomChange: (room: string) => void;
  onSectionChange: (section: string) => void;
  error?: string;
  floorError?: string;
  sectionError?: string;
  disabled?: boolean;
}

export const BuildingFloorSelect: React.FC<BuildingFloorSelectProps> = ({
  buildings,
  buildingId,
  buildingLabel,
  floor,
  room,
  section,
  collegeSlug,
  onBuildingChange,
  onBuildingLabelChange,
  onFloorChange,
  onRoomChange,
  onSectionChange,
  error,
  floorError,
  sectionError,
  disabled = false,
}) => {
  const selectedBuilding = buildings.find((building) => building.id === buildingId);
  const isKcc = collegeSlug === 'kcc';
  const usesCustomBuilding = !isKcc && buildings.length === 0;
  const floorOptions = selectedBuilding
    ? ['Ground Floor', ...Array.from({ length: Math.max(0, selectedBuilding.floor_count - 1) }, (_, index) => `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Floor`)]
    : FLOORS;
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span>Campus Location Details</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {usesCustomBuilding ? (
          <Input
            label="Building name"
            value={buildingLabel}
            onChange={(event) => onBuildingLabelChange(event.target.value)}
            error={error}
            helperText="Use the building name people on your campus recognize."
            maxLength={120}
            required
            disabled={disabled}
          />
        ) : (
          <Select
            label="Building"
            value={buildingId}
            onChange={(e) => onBuildingChange(e.target.value)}
            error={error}
            placeholder="-- Select Building --"
            required
            disabled={disabled}
          >
            <option value="" disabled>
              -- Select Building --
            </option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.code ? `(${b.code})` : ''}
              </option>
            ))}
            {isKcc && KCC_BLOCKS.filter((block) => !buildings.some((building) =>
              building.code?.toLowerCase() === block.code.toLowerCase() ||
              building.name.trim().toLowerCase() === block.name.toLowerCase()
            )).map((block) => (
              <option key={block.id} value={block.id}>{block.name}</option>
            ))}
          </Select>
        )}

        <Select
          label="Floor Level"
          value={floor}
          onChange={(e) => onFloorChange(e.target.value)}
          placeholder="-- Select Floor --"
          disabled={(!buildingId && !(usesCustomBuilding && buildingLabel.trim())) || disabled}
          error={floorError}
          required
        >
          <option value="">-- Select Floor (Optional) --</option>
          {floorOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </div>

      {usesCustomBuilding && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900" role="status">
          This campus has not configured its building directory yet. Enter the building name above; your campus administrator can add it to the directory later.
        </p>
      )}

      {isKcc && (KCC_BLOCKS.some((block) => block.id === buildingId) || buildings.some((building) =>
        (building.code?.toLowerCase().startsWith('kcc-') || building.name.toLowerCase().includes('kcc block')) && building.id === buildingId
      )) ? (
        <Select
          label="Section"
          value={section}
          onChange={(e) => onSectionChange(e.target.value)}
          error={sectionError}
          placeholder="Select section"
          required
        >
          <option value="" disabled>Select section</option>
          {KCC_SECTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
      ) : null}

      <Input
        label="Room / Specific Spot"
        placeholder="e.g. Lab 304, Room 102, Girls Washroom 2nd floor, Stairs"
        value={room}
        onChange={(e) => onRoomChange(e.target.value)}
        helperText="Helps the technician locate the exact spot quickly."
        disabled={disabled}
      />
    </div>
  );
};
