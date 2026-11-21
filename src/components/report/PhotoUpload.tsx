'use client';

import React, { useRef, useState } from 'react';

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
    if (tooLarge) { setError(`${tooLarge.name} exceeds the 5 MB limit.`); return; }
    const valid = selected.filter((file) => file.type.startsWith('image/')).slice(0, Math.max(0, maxPhotos - photos.length));
    if (valid.length !== selected.length) setError(`Choose image files; up to ${maxPhotos} photos are allowed.`);
    try {
      const encoded = await Promise.all(valid.map((file) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image'));
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(file);
      })));
      onChange([...photos, ...encoded]);
    } catch { setError('One of the selected images could not be read.'); }
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
      <label className="block text-sm font-medium text-slate-700">
        Photos of the Issue <span className="text-xs text-slate-500 font-normal">(Optional, max {maxPhotos})</span>
      </label>

      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!disabled) void readFiles(event.dataTransfer.files); }} className="flex min-h-28 flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
        {photos.map((photo, index) => (
          <div key={index} className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 group shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`Uploaded ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-rose-600 transition"
              aria-label="Remove photo"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span className="mt-1 text-[10px] font-medium">Add Photo</span>
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
      <p className="text-xs text-slate-500">Drop images here or click Add Photo. Maximum 5 MB per image.</p>
      {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );
};
