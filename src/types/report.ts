export type ReportStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'closed';

export type ReportCategory =
  | 'electrical'
  | 'plumbing'
  | 'cleanliness'
  | 'internet'
  | 'furniture'
  | 'safety'
  | 'other';

export type SituationLevel = 'normal' | 'medium' | 'high' | 'critical';

export interface Report {
  id: string;
  college_id: string;
  submitter_id: string;
  building_id: string | null;
  tracking_id: string;
  title: string;
  description: string;
  category: ReportCategory;
  floor: string | null;
  room: string | null;
  section?: string | null;
  situation?: SituationLevel;
  building_label?: string | null;
  status: ReportStatus;
  upvote_count: number;
  photo_paths: string[];
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // joined relations
  building?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  submitter?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  has_upvoted?: boolean;
}

export interface ReportUpdate {
  id: string;
  report_id: string;
  author_id: string;
  status: ReportStatus | null;
  message: string;
  created_at: string;
  author?: {
    full_name: string | null;
    role: string;
  } | null;
}

export interface CreateReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  building_id?: string | null;
  floor?: string | null;
  room?: string | null;
  section?: string | null;
  situation?: SituationLevel;
  building_label?: string | null;
  photo_paths?: string[];
}

export interface ReportFilterOptions {
  status?: ReportStatus | 'all';
  category?: ReportCategory | 'all';
  building_id?: string | 'all';
  search?: string;
  sort?: 'newest' | 'oldest' | 'upvotes';
  submitter_id?: string;
}
