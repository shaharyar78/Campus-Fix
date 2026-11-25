export interface Building {
  id: string;
  college_id: string;
  name: string;
  floor_count: number;
  sections?: string[] | null;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BuildingFormData {
  name: string;
  floor_count: number;
  sections: string[];
  code?: string;
  is_active?: boolean;
}
