'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export const TrackingSearch: React.FC = () => {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = trackingId.trim().toUpperCase();

    if (!cleanId) {
      setError('Please enter a tracking ID.');
      return;
    }

    setError(null);
    router.push(`/track/${encodeURIComponent(cleanId)}`);
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full max-w-xl">
      <div className="flex-1 w-full">
        <Input
          type="text"
          placeholder="COLLEGE-YYYYMM-XXXX"
          value={trackingId}
          onChange={(e) => {
            setTrackingId(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          error={error || undefined}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </div>
      <Button type="submit" variant="primary" className="w-full sm:w-auto shrink-0">
        Track Status
      </Button>
    </form>
  );
};
