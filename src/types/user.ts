export type UserRole = 'student' | 'admin' | 'super_admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  college_id: string | null;
  role: UserRole;
  full_name: string | null;
  username?: string | null;
  email: string | null;
  avatar_url: string | null;
  approval_status: ApprovalStatus;
  approval_requested_role: UserRole;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}
