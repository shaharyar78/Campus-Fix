'use client';

import React, { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onChange,
  maxPhotos = 3,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const readFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files);
    const tooLarge = selected.find((file) => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} exceeds the 5 MB limit.`);
      return;
    }
    const valid = selected
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, maxPhotos - photos.length));
    if (valid.length !== selected.length) {
      setError(`Choose image files; up to ${maxPhotos} photos are allowed.`);
    }
    try {
      const encoded = await Promise.all(
        valid.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                typeof reader.result === 'string'
                  ? resolve(reader.result)
                  : reject(new Error('Could not read image'));
              reader.onerror = () => reject(new Error('Could not read image'));
              reader.readAsDataURL(file);
            })
        )
      );
      onChange([...photos, ...encoded]);
    } catch {
      setError('One of the selected images could not be read.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void readFiles(e.target.files);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700">
        Photos of the Issue{' '}
        <span className="text-xs font-normal text-neutral-500">(Optional, max {maxPhotos})</span>
      </label>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled) void readFiles(event.dataTransfer.files);
        }}
        className="flex min-h-24 flex-wrap items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 p-3"
      >
        {photos.map((photo, index) => (
          <div
            key={index}
            className="group relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200 bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`Uploaded ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute right-1 top-1 rounded-full bg-neutral-950/75 p-1 text-white transition-colors hover:bg-rose-600"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-500 transition-colors hover:border-blue-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="mt-1 text-[11px] font-medium">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <p className="text-xs text-neutral-500">Drop images here or click Add photo. Maximum 5 MB per image.</p>
      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
