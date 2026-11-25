'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Building } from '@/types';
import { FLOORS } from '@/lib/constants';

interface BuildingFloorSelectProps {
  buildings: Building[];
  buildingId: string;
  floor: string;
  room: string;
  section: string;
  isBuildingsLoading?: boolean;
  onBuildingChange: (id: string) => void;
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
  floor,
  room,
  section,
  isBuildingsLoading = false,
  onBuildingChange,
  onFloorChange,
  onRoomChange,
  onSectionChange,
  error,
  floorError,
  sectionError,
  disabled = false,
}) => {
  // Only buildings that exist in the database with is_active !== false
  const effectiveBuildings = buildings.filter((b) => b.is_active !== false);
  const selectedBuilding = effectiveBuildings.find((building) => building.id === buildingId);
  const sectionOptions = selectedBuilding?.sections || [];
  const floorOptions = selectedBuilding
    ? [
        'Ground Floor',
        ...Array.from(
          { length: Math.max(0, selectedBuilding.floor_count - 1) },
          (_, index) =>
            `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Floor`
        ),
      ]
    : FLOORS;

  const buildingPlaceholder = isBuildingsLoading
    ? 'Loading campus buildings...'
    : effectiveBuildings.length === 0
      ? 'No campus buildings available'
      : 'Select building';

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <Building2 className="h-4 w-4 text-neutral-500" aria-hidden="true" />
        <span>Building & Location Section</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Building"
          value={buildingId}
          onChange={(e) => {
            const val = e.target.value;
            onBuildingChange(val);
          }}
          error={error}
          placeholder={buildingPlaceholder}
          required
          disabled={disabled || isBuildingsLoading || effectiveBuildings.length === 0}
        >
          {effectiveBuildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.code ? `(${b.code})` : ''}
            </option>
          ))}
        </Select>

        <Select
          label="Floor Level"
          value={floor}
          onChange={(e) => onFloorChange(e.target.value)}
          placeholder="Select floor"
          disabled={!buildingId || disabled}
          error={floorError}
          required
        >
          {floorOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </div>

      {selectedBuilding && sectionOptions.length > 0 ? (
        <Select
          label="Section"
          value={section}
          onChange={(e) => onSectionChange(e.target.value)}
          error={sectionError}
          placeholder="Select section"
          required
          disabled={disabled}
        >
          {sectionOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
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
