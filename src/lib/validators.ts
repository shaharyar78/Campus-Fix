import { ReportCategory } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateReportInput(data: {
  title?: string;
  description?: string;
  category?: string;
  building_id?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters long.';
  } else if (data.title.trim().length > 160) {
    errors.title = 'Title cannot exceed 160 characters.';
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters long.';
  } else if (data.description.trim().length > 5000) {
    errors.description = 'Description cannot exceed 5000 characters.';
  }

  const validCategories: ReportCategory[] = [
    'electrical',
    'plumbing',
    'cleanliness',
    'internet',
    'furniture',
    'safety',
    'other',
  ];

  if (!data.category || !validCategories.includes(data.category as ReportCategory)) {
    errors.category = 'Please select a valid category.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLoginInput(data: {
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const identifier = data.email?.trim() || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) && !/^[a-zA-Z0-9_]{3,32}$/.test(identifier)) {
    errors.email = 'Enter a valid email address or username.';
  }

  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRegisterInput(data: {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  college_id?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.full_name = 'Full name must be at least 2 characters.';
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (data.role && !['student', 'admin', 'super_admin'].includes(data.role)) {
    errors.role = 'Please select a valid role.';
  }

  if (data.role !== 'super_admin' && !data.college_id) {
    errors.college_id = 'Please select your college/campus.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateBuildingInput(data: {
  name?: string;
  code?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Building name must be at least 2 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCollegeInput(data: {
  name?: string;
  slug?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'College name must be at least 2 characters.';
  }

  if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug.trim())) {
    errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
