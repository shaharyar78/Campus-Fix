export interface College {
  id: string;
  name: string;
  slug: string;
  email_domain?: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollegeFormData {
  name: string;
  slug: string;
  address?: string;
  is_active?: boolean;
}
