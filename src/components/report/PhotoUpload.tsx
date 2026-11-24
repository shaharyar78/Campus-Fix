'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getClientAuthHeaders } from '@/lib/supabase/client';
import { isSafeDisplayImageUrl } from '@/lib/imageSecurity';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  collegeId?: string | null;
  maxPhotos?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onChange,
  collegeId,
  maxPhotos = 3,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    return () => {
      for (const url of Object.values(previews)) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    };
  }, [previews]);

  const uploadFiles = async (files: FileList | File[]) => {
    setError('');
    setNotice('');

    const selected = Array.from(files);
    const remainingSlots = Math.max(0, maxPhotos - photos.length);
    if (remainingSlots === 0) {
      setError(`Maximum ${maxPhotos} photos are allowed.`);
      return;
    }

    const tooLarge = selected.find((file) => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} exceeds the 5 MB limit.`);
      return;
    }

    const valid = selected
      .filter((file) => ALLOWED_TYPES.has(file.type.toLowerCase()))
      .slice(0, remainingSlots);

    if (valid.length === 0) {
      setError('Choose JPEG, PNG, or WebP images (maximum 5 MB each).');
      return;
    }
    if (valid.length !== selected.length) {
      setError(`Only JPEG, PNG, or WebP images are accepted (max ${maxPhotos} total).`);
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      if (collegeId) {
        formData.set('college_id', collegeId);
      }
      for (const file of valid) {
        formData.append('files', file);
      }

      const headers = getClientAuthHeaders();
      const response = await fetch('/api/uploads', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: formData,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error?.message || 'Could not upload the selected images.');
        return;
      }

      const uploaded = (result.data || []) as Array<{
        path: string;
        signedUrl: string | null;
        metadataStripped?: boolean;
      }>;

      const nextPreviews: Record<string, string> = {};
      const nextPaths: string[] = [];

      uploaded.forEach((item, index) => {
        if (!item?.path) return;
        nextPaths.push(item.path);
        const safeUrl =
          item.signedUrl && isSafeDisplayImageUrl(item.signedUrl)
            ? item.signedUrl
            : URL.createObjectURL(valid[index]);
        nextPreviews[item.path] = safeUrl;
      });

      if (uploaded.some((item) => item.metadataStripped)) {
        setNotice('EXIF and GPS location metadata was removed from uploaded photos.');
      }

      setPreviews((current) => ({ ...current, ...nextPreviews }));
      onChange([...photos, ...nextPaths]);
    } catch {
      setError('One of the selected images could not be uploaded.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void uploadFiles(e.target.files);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    const targetPath = photos[index];
    const previewUrl = targetPath ? previews[targetPath] : undefined;
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="report-photo-upload" className="block text-sm font-medium text-neutral-700">
        Photos of the Issue{' '}
        <span className="text-xs font-normal text-neutral-500">(Optional, max {maxPhotos})</span>
      </label>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) void uploadFiles(event.dataTransfer.files);
        }}
        className="flex min-h-24 flex-wrap items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 p-3"
      >
        {photos.map((photoPath, index) => {
          const previewSrc = previews[photoPath];
          return (
            <div
              key={photoPath}
              className="group relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              {previewSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewSrc} alt={`Uploaded ${index + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[11px] font-medium text-neutral-500">
                  Photo {index + 1}
                </div>
              )}
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-neutral-950/75 p-1 text-white transition-colors hover:bg-rose-600"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}

        {photos.length < maxPhotos && (
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-500 transition-colors hover:border-blue-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="mt-1 text-[11px] font-medium">
              {isUploading ? 'Uploading' : 'Add photo'}
            </span>
          </button>
        )}
      </div>

      <input
        id="report-photo-upload"
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <p className="text-xs text-neutral-500">
        JPEG, PNG, or WebP up to 5 MB each. Location/EXIF metadata is stripped automatically on upload.
      </p>
      {notice && (
        <p className="text-xs text-emerald-700" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
