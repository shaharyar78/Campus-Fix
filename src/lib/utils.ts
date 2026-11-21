import { REPORT_CATEGORIES, REPORT_STATUSES } from './constants';
import { ReportCategory, ReportStatus } from '@/types';

export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return formatDate(dateString);
  } catch {
    return dateString || '';
  }
}

export function getStatusConfig(status: ReportStatus) {
  const found = REPORT_STATUSES.find((s) => s.value === status);
  return found || {
    value: status,
    label: status,
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    description: '',
  };
}

export function getCategoryConfig(category: ReportCategory) {
  const found = REPORT_CATEGORIES.find((c) => c.value === category);
  return found || {
    value: category,
    label: category,
    description: '',
  };
}
