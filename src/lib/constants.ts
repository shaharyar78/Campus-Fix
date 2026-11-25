import { ReportCategory, ReportStatus, UserRole } from '@/types';

export const REPORT_CATEGORIES: { value: ReportCategory; label: string; description: string }[] = [
  { value: 'electrical', label: 'Electrical', description: 'Lights, fans, wiring, plugs, switches' },
  { value: 'cleanliness', label: 'Cleanliness', description: 'Trash, washroom cleaning, pest control' },
  { value: 'plumbing', label: 'Water', description: 'Leaks, taps, water supply, washroom issues' },
  { value: 'furniture', label: 'Furniture', description: 'Benches, desks, chairs, doors, windows' },
  { value: 'internet', label: 'IT', description: 'Network connectivity, routers, computers, LAN ports' },
];

export const REPORT_STATUSES: {
  value: ReportStatus;
  label: string;
  badgeClass: string;
  description: string;
}[] = [
  {
    value: 'submitted',
    label: 'Submitted',
    badgeClass: 'text-blue-700 border-blue-200 bg-blue-50/70',
    description: 'Report received and queued for review.',
  },
  {
    value: 'under_review',
    label: 'Under Review',
    badgeClass: 'text-amber-800 border-amber-200 bg-amber-50/70',
    description: 'Admin is assessing the report and verifying details.',
  },
  {
    value: 'assigned',
    label: 'Assigned',
    badgeClass: 'text-indigo-700 border-indigo-200 bg-indigo-50/70',
    description: 'Assigned to a maintenance technician or department.',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    badgeClass: 'text-sky-800 border-sky-200 bg-sky-50/70',
    description: 'Work is currently ongoing to resolve the issue.',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    badgeClass: 'text-emerald-800 border-emerald-200 bg-emerald-50/70',
    description: 'Issue has been fixed and confirmed.',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    badgeClass: 'text-rose-800 border-rose-200 bg-rose-50/70',
    description: 'Report could not be accepted or was invalid.',
  },
  {
    value: 'closed',
    label: 'Closed',
    badgeClass: 'text-neutral-700 border-neutral-200 bg-neutral-100',
    description: 'Report archived or closed after completion.',
  },
];

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'Report issues and track their progress' },
  { value: 'admin', label: 'Campus Admin', description: 'Manage reports and campus facilities' },
  { value: 'super_admin', label: 'Super Admin', description: 'Platform-wide configuration and college management' },
];

export const FLOORS = [
  'Basement',
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  'Terrace / Roof',
  'Other',
];

export const KCC_BLOCKS = [
  { id: 'kcc-block-a', name: 'KCC Block A', code: 'KCC-A' },
  { id: 'kcc-block-b', name: 'KCC Block B', code: 'KCC-B' },
  { id: 'kcc-block-c', name: 'KCC Block C', code: 'KCC-C' },
];

export const KCC_SECTIONS = [
  ...Array.from({ length: 10 }, (_, index) => `A${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `B${index + 1}`),
];

export const SITUATION_LEVELS = ['normal', 'medium', 'high', 'critical'] as const;
export type SituationLevel = (typeof SITUATION_LEVELS)[number];
