'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
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
    <form
      onSubmit={handleSearch}
      className="flex w-full max-w-xl flex-col items-start gap-2.5 sm:flex-row sm:items-start"
    >
      <div className="w-full flex-1">
        <Input
          type="text"
          placeholder="COLLEGE-YYYYMM-XXXX"
          value={trackingId}
          onChange={(e) => {
            setTrackingId(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          error={error || undefined}
          leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          className="font-mono text-sm"
        />
      </div>
      <Button type="submit" variant="primary" className="w-full shrink-0 sm:w-auto">
        Track Status
      </Button>
    </form>
  );
};
